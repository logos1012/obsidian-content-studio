// 로컬 Claude Code(`claude`)를 비대화형으로 실행해 글감 카드를 한 줄 JSON으로 받는다. (PRD FR-8)
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

export type AiError = 'missing' | 'login' | 'fail' | 'net';
export interface RawCard { headline: string; summary: string; source: { name: string; url: string }; connection: string; image?: string }

const CANDIDATES = () => [
  join(homedir(), '.claude', 'local', 'claude'), join(homedir(), '.local', 'bin', 'claude'),
  '/opt/homebrew/bin/claude', '/usr/local/bin/claude', join(homedir(), '.npm-global', 'bin', 'claude'), join(homedir(), '.bun', 'bin', 'claude')
];

export function findClaude(configured: string): string | null {
  if (configured.trim()) return existsSync(configured.trim()) ? configured.trim() : null;
  for (const c of CANDIDATES()) if (existsSync(c)) return c;
  return null;
}

/* 한 줄 JSON이 카드로 받아들일 수 있는지 검증한다. 못 쓰면 그 카드만 버린다. */
export function validateCard(j: any): RawCard | null {
  if (!j || j.type !== 'card') return null;
  const s = (v: unknown) => typeof v === 'string' && v.trim() ? v.trim() : '';
  const headline = s(j.headline), summary = s(j.summary), connection = s(j.connection);
  const name = s(j.source?.name), url = s(j.source?.url);
  if (!headline || !summary || !name || !/^https?:\/\//i.test(url)) return null;
  const image = s(j.image);
  return { headline, summary, connection, source: { name, url }, image: /^https?:\/\//i.test(image) ? image : undefined };
}

export function classifyFailure(text: string): AiError {
  const t = text.toLowerCase();
  if (/not logged in|please run \/login|\/login|authentication|unauthorized|invalid api key|oauth/.test(t)) return 'login';
  if (/enotfound|econnrefused|econnreset|etimedout|network|offline|fetch failed|getaddrinfo/.test(t)) return 'net';
  return 'fail';
}

export interface ResearchHandle { cancel(): void; done: Promise<{ ok: true; count: number } | { ok: false; error: AiError; detail: string; count: number }> }

export function runResearch(opts: { claudePath: string; message: string; existing: string[]; onCard(c: RawCard): void }): ResearchHandle {
  const bin = findClaude(opts.claudePath);
  let child: ChildProcess | null = null, cancelled = false, tmp = '';
  const prompt = [
    `다음 메시지를 뒷받침하거나 흔들어 볼 글감을 웹에서 찾아 주세요. 사례·연구·기사·반대 시각을 섞어서 6장 이내로.`,
    `메시지: ${opts.message}`,
    opts.existing.length ? `이미 있는 카드(겹치지 않게): ${opts.existing.slice(0, 30).join(' / ')}` : '',
    `출력 형식: 카드 하나당 아래 JSON을 **한 줄**로, 다른 설명 없이 이어서 출력하고, 마지막에 {"type":"done"} 한 줄을 출력하세요.`,
    `{"type":"card","headline":"한 줄 제목","summary":"2~3문장 요약(한국어)","source":{"name":"출처 이름","url":"https://..."},"connection":"이 메시지와 어떻게 이어지는지 한 줄","image":"선택: 이미지 주소"}`,
    `출처 주소는 실제로 확인한 http/https 주소만 쓰세요.`
  ].filter(Boolean).join('\n');

  const done = new Promise<any>(resolve => {
    let count = 0, buf = '', text = '', err = '', sawDone = false, settled = false;
    const finish = (r: any) => { if (settled) return; settled = true; if (tmp) try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 임시 폴더 정리 실패는 무시 */ } resolve(r); };
    if (!bin) { finish({ ok: false, error: 'missing', detail: '', count: 0 }); return; }
    try { tmp = mkdtempSync(join(tmpdir(), 'content-studio-')); } catch (e) { finish({ ok: false, error: 'fail', detail: String(e), count: 0 }); return; }
    const takeLines = (final: boolean) => {
      let i: number;
      while ((i = buf.indexOf('\n')) >= 0 || (final && buf.trim())) {
        const line = i >= 0 ? buf.slice(0, i) : buf; buf = i >= 0 ? buf.slice(i + 1) : '';
        const t = line.trim(); if (!t.startsWith('{')) { if (i < 0) break; continue; }
        try { const j = JSON.parse(t); if (j.type === 'done') sawDone = true; else { const c = validateCard(j); if (c && !cancelled) { count++; opts.onCard(c); } } } catch { /* 끝나지 않은 줄은 건너뜀 */ }
        if (i < 0) break;
      }
    };
    child = spawn(bin, ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--allowedTools', 'WebSearch,WebFetch', '--permission-mode', 'default'],
      { cwd: tmp, env: { ...process.env, PATH: [dirname(bin), '/opt/homebrew/bin', '/usr/local/bin', process.env.PATH || ''].join(':') }, stdio: ['ignore', 'pipe', 'pipe'] });
    let lineBuf = '';
    child.stdout!.on('data', d => {
      lineBuf += d.toString();
      let i: number;
      while ((i = lineBuf.indexOf('\n')) >= 0) {
        const raw = lineBuf.slice(0, i); lineBuf = lineBuf.slice(i + 1);
        try {
          const ev = JSON.parse(raw);
          if (ev.type === 'assistant') { for (const part of ev.message?.content || []) if (part.type === 'text') { buf += part.text + '\n'; text += part.text; takeLines(false); } }
          else if (ev.type === 'result' && ev.is_error) err += String(ev.result || ev.error || '');
        } catch { /* 스트림 이벤트가 아닌 줄 */ }
      }
    });
    child.stderr!.on('data', d => { err += d.toString(); });
    child.on('error', e => finish({ ok: false, error: (e as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'fail', detail: String(e), count }));
    child.on('close', code => {
      takeLines(true);
      if (cancelled) { finish({ ok: true, count }); return; }
      if (code === 0 && (sawDone || count > 0)) { finish({ ok: true, count }); return; }
      finish({ ok: false, error: classifyFailure(err + text), detail: (err || text).slice(0, 300), count });
    });
  });
  return { cancel() { cancelled = true; child?.kill('SIGTERM'); }, done };
}
