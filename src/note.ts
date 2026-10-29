// 아이디어 노트의 읽기·쓰기. Obsidian에 의존하지 않아 단독으로 시험할 수 있다.
// 플러그인이 관리하는 영역: frontmatter의 content-studio·format·id·단계·시작점, `## 메시지`, `## 카드`, `## 판 배치`.
// 그 밖의 글(사용자가 쓴 부분)은 한 글자도 바꾸지 않는다.

export const FORMAT = 1;
export const STAGES = ['이야기', '코르크판', '후킹', '얼개', '초안'] as const;

export interface Card {
  id: string;
  type: 'research' | 'memo';
  color: 'yellow' | 'blue' | 'green' | 'pink';
  headline: string;
  summary: string; // 조사 카드의 요약, 메모 카드의 내용
  source?: { name: string; url: string };
  image?: string;
  why?: string; // 메시지와 이어지는 한 줄
}
export interface Unreadable { raw: string }
export interface Discarded { id: string; wasPinned: boolean; idx: number }
export interface Board {
  order: string[];
  pinned: string[];
  archived: Discarded[];
  links: [string, string][];
}
export interface Idea {
  id: string;
  message: string;
  status: '후보' | '확정';
  cards: Card[];
  unreadable: Unreadable[];
  board: Board;
}
export interface Parsed {
  frontmatter: Record<string, string>;
  idea: Idea;
  format: number;
}

const COLORS = ['yellow', 'blue', 'green', 'pink'] as const;
export const newId = (p = 'c') => p + Math.random().toString(36).slice(2, 8);

/* ───────── 여러 줄 값: 첫 줄 + 4칸 들여쓴 이어지는 줄 (FR-7.3) ───────── */
export function encodeMulti(label: string, v: string): string[] {
  const lines = v.replace(/\r\n?/g, '\n').split('\n');
  return [`- ${label}: ${lines[0]}`.trimEnd(), ...lines.slice(1).map(l => '    ' + l)];
}
export const oneLine = (v: string) => v.replace(/\s*\n\s*/g, ' ').trim();

/* ───────── frontmatter ───────── */
export function splitFrontmatter(text: string): { fm: Record<string, string>; fmRaw: string; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(text);
  if (!m) return { fm: {}, fmRaw: '', body: text };
  const fm: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const k = /^([^:#\s][^:]*):\s*(.*)$/.exec(line);
    if (k) fm[k[1].trim()] = k[2].trim().replace(/^["']|["']$/g, '');
  }
  return { fm, fmRaw: m[0], body: text.slice(m[0].length) };
}

/* ───────── 섹션 ───────── */
export interface Section { title: string; start: number; end: number } // body 안의 글자 위치
export function sections(body: string): Section[] {
  const out: Section[] = [];
  let inFence = false, pos = 0, cur: Section | null = null;
  for (const line of body.split('\n')) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && /^## /.test(line)) {
      if (cur) { cur.end = pos; out.push(cur); }
      cur = { title: line.slice(3).trim(), start: pos, end: body.length };
    }
    pos += line.length + 1;
  }
  if (cur) { cur.end = Math.min(cur.end, body.length); out.push(cur); }
  return out;
}
const sectionText = (body: string, s?: Section) => s ? body.slice(s.start, s.end).replace(/^## .*\n?/, '') : '';

/* ───────── 카드 읽기·쓰기 ───────── */
export function serializeCard(c: Card): string {
  const L = [`### ${oneLine(c.headline) || '(제목 없음)'} <!--cs:${c.id}-->`];
  L.push(`- 종류: ${c.type === 'research' ? '조사' : '메모'}`, `- 색: ${c.color}`);
  L.push(...encodeMulti(c.type === 'research' ? '요약' : '내용', c.summary));
  if (c.source) L.push(`- 출처: ${oneLine(c.source.name)} | ${c.source.url}`);
  if (c.image) L.push(`- 이미지: ${c.image}`);
  if (c.why) L.push(...encodeMulti('메시지와', oneLine(c.why)));
  return L.join('\n');
}
export function parseCard(block: string): Card | null {
  const lines = block.replace(/\r\n?/g, '\n').split('\n');
  const h = /^### (.*?)\s*<!--cs:([A-Za-z0-9_-]+)-->\s*$/.exec(lines[0]);
  if (!h) return null;
  const f: Record<string, string> = {}; let last = '';
  for (const l of lines.slice(1)) {
    const k = /^- ([^:]+): ?(.*)$/.exec(l);
    if (k) { last = k[1]; f[last] = k[2]; }
    else if (l.startsWith('    ') && last) f[last] += '\n' + l.slice(4);
    else if (l.trim() === '') continue;
    else return null;
  }
  const type = f['종류'] === '조사' ? 'research' : f['종류'] === '메모' ? 'memo' : null;
  const body = type === 'research' ? f['요약'] : f['내용'];
  if (!type || body === undefined) return null;
  const color = (COLORS as readonly string[]).includes(f['색']) ? f['색'] as Card['color'] : type === 'memo' ? 'pink' : 'yellow';
  const c: Card = { id: h[2], type, color, headline: h[1] === '(제목 없음)' ? '' : h[1], summary: body.replace(/\n+$/, '') };
  if (f['출처']) {
    const [n, ...u] = f['출처'].split(' | '); const url = u.join(' | ').trim();
    if (/^https?:\/\//i.test(url)) c.source = { name: n.trim(), url };
  }
  if (f['이미지'] && /^https?:\/\//i.test(f['이미지'])) c.image = f['이미지'];
  if (f['메시지와']) c.why = f['메시지와'];
  return c;
}
function splitCards(text: string): string[] {
  const out: string[] = []; let cur: string[] | null = null, inFence = false;
  for (const line of text.split('\n')) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    if (!inFence && /^### /.test(line)) { if (cur) out.push(cur.join('\n').replace(/\n+$/, '')); cur = [line]; }
    else if (cur) cur.push(line);
  }
  if (cur) out.push(cur.join('\n').replace(/\n+$/, ''));
  return out;
}

/* ───────── 판 배치 JSON ───────── */
const emptyBoard = (): Board => ({ order: [], pinned: [], archived: [], links: [] });
export function parseBoard(text: string): Board {
  const m = /```json\n([\s\S]*?)\n```/.exec(text);
  const b = emptyBoard(); if (!m) return b;
  try {
    const j = JSON.parse(m[1]);
    if (Array.isArray(j.order)) b.order = j.order.filter((x: unknown) => typeof x === 'string');
    if (Array.isArray(j.pinned)) b.pinned = j.pinned.filter((x: unknown) => typeof x === 'string');
    if (Array.isArray(j.archived)) b.archived = j.archived.filter((x: any) => x && typeof x.id === 'string').map((x: any) => ({ id: x.id, wasPinned: !!x.wasPinned, idx: Number.isFinite(x.idx) ? x.idx : 0 }));
    if (Array.isArray(j.links)) b.links = j.links.filter((l: unknown) => Array.isArray(l) && l.length === 2 && l.every(x => typeof x === 'string'));
  } catch { /* 손상: 빈 배치로 읽는다. 저장하면 새 값으로 쓰인다 */ }
  return b;
}
export function serializeBoard(b: Board): string {
  return '```json\n' + JSON.stringify(b, null, 1) + '\n```';
}

/* ───────── 노트 전체 ───────── */
export function parseNote(text: string): Parsed | null {
  const { fm, body } = splitFrontmatter(text);
  if (fm['content-studio'] !== 'idea') return null;
  const secs = sections(body), get = (t: string) => secs.find(s => s.title === t);
  const msgText = sectionText(body, get('메시지')).trim().split('\n');
  const status = /^상태:\s*확정/.test(msgText[0] || '') ? '확정' : '후보';
  const message = msgText.slice(/^상태:/.test(msgText[0] || '') ? 1 : 0).join('\n').trim();
  const cards: Card[] = [], unreadable: Unreadable[] = [];
  for (const blk of splitCards(sectionText(body, get('카드')))) {
    const c = parseCard(blk); if (c) cards.push(c); else unreadable.push({ raw: blk });
  }
  const board = parseBoard(sectionText(body, get('판 배치')));
  return { frontmatter: fm, format: Number(fm['format'] || 1), idea: { id: fm['id'] || '', message, status, cards, unreadable, board } };
}

export function ideaSections(idea: Idea): { message: string; cards: string; board: string } {
  return {
    message: `## 메시지\n상태: ${idea.status}\n${idea.message}\n`,
    cards: '## 카드\n' + [...idea.cards.map(serializeCard), ...idea.unreadable.map(u => u.raw)].join('\n\n') + '\n',
    board: '## 판 배치\n' + serializeBoard(idea.board) + '\n'
  };
}

export function newNoteText(opts: { id: string; message: string; start: '메시지' | '경험'; memo?: string }): string {
  const idea: Idea = { id: opts.id, message: opts.message, status: '후보', cards: [], unreadable: [], board: emptyBoard() };
  if (opts.memo) {
    const c: Card = { id: newId(), type: 'memo', color: 'pink', headline: '', summary: opts.memo };
    idea.cards.push(c); idea.board.order.push(c.id);
  }
  const s = ideaSections(idea);
  return `---\ncontent-studio: idea\nformat: ${FORMAT}\nid: ${opts.id}\n단계: 코르크판\n시작점: ${opts.start}\n---\n${s.message}\n${s.cards}\n${s.board}\n## 초안\n`;
}

/* 한 섹션의 내용을 바꾼다. 없으면 `## 초안` 앞(없으면 끝)에 끼운다. 다른 부분은 그대로. */
export function replaceSection(text: string, title: string, newBlock: string): string {
  const { fmRaw, body } = splitFrontmatter(text);
  const secs = sections(body), s = secs.find(x => x.title === title);
  let out: string;
  if (s) {
    out = body.slice(0, s.start) + newBlock + '\n' + body.slice(s.end).replace(/^\n+/, '');
  } else {
    const draft = secs.find(x => x.title === '초안');
    const at = draft ? draft.start : body.length;
    out = body.slice(0, at) + (at && !body.slice(0, at).endsWith('\n\n') ? (body.slice(0, at).endsWith('\n') ? '\n' : '\n\n') : '') + newBlock + '\n' + body.slice(at);
  }
  return fmRaw + out;
}

export function setFrontmatterField(text: string, key: string, value: string): string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text); if (!m) return text;
  const re = new RegExp(`^${key}:.*$`, 'm');
  const inner = re.test(m[1]) ? m[1].replace(re, `${key}: ${value}`) : m[1] + `\n${key}: ${value}`;
  return `---\n${inner}\n---` + text.slice(m[0].length);
}

/* ───────── 파일 이름 (FR-1.2) ───────── */
export function fileNameFrom(input: string, now = new Date()): string {
  let n = input.trim().slice(0, 30).replace(/[\\/:*?"<>|#^\[\]]/g, '').replace(/[\s.]+$/, '').replace(/\s+/g, ' ').trim();
  if (!n) {
    const p = (x: number) => String(x).padStart(2, '0');
    n = `새 아이디어 ${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}-${p(now.getMinutes())}`;
  }
  return n;
}

/* ───────── 병합 (FR-7.6): 카드 단위로 내 변경·디스크 변경을 합친다 ─────────
   base = 마지막으로 읽거나 저장한 상태, mine = 화면, disk = 지금 파일.
   같은 카드를 양쪽에서 고치면 편집기(디스크) 쪽이 남는다. 디스크에서 지운 카드는 내가 고쳐도 지워진 채 둔다. */
export function mergeIdeas(base: Idea, mine: Idea, disk: Idea): { idea: Idea; conflicts: string[] } {
  const conflicts: string[] = [];
  const bm = new Map(base.cards.map(c => [c.id, serializeCard(c)]));
  const mm = new Map(mine.cards.map(c => [c.id, c])), dm = new Map(disk.cards.map(c => [c.id, c]));
  const out = new Map<string, Card>();
  for (const [id, d] of dm) {
    const m = mm.get(id), b = bm.get(id);
    if (!m) { if (!b || serializeCard(d) !== b) out.set(id, d); continue; }   // 내가 지운 것: 디스크가 안 건드렸으면 삭제 유지
    const mChanged = serializeCard(m) !== b, dChanged = serializeCard(d) !== b;
    if (mChanged && dChanged && serializeCard(m) !== serializeCard(d)) conflicts.push(m.headline || m.summary.slice(0, 20));
    out.set(id, dChanged ? d : m);
  }
  for (const [id, m] of mm) if (!dm.has(id) && !bm.has(id)) out.set(id, m);   // 내가 새로 만든 것
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const board = same(mine.board, base.board) ? disk.board : mine.board;
  const ids = new Set(out.keys());
  const archivedIds = new Set(board.archived.map(a => a.id));
  const order = board.order.filter(x => ids.has(x));
  for (const id of ids) if (!order.includes(id) && !archivedIds.has(id)) order.push(id);
  const merged: Idea = {
    id: mine.id || disk.id,
    message: same(mine.message, base.message) && mine.status === base.status ? disk.message : mine.message,
    status: same(mine.message, base.message) && mine.status === base.status ? disk.status : mine.status,
    cards: [...out.values()], unreadable: disk.unreadable,
    board: {
      order, pinned: board.pinned.filter(x => ids.has(x)), archived: board.archived.filter(a => ids.has(a.id)),
      links: board.links.filter(([a, b]) => ids.has(a) && ids.has(b))
    }
  };
  return { idea: merged, conflicts };
}
