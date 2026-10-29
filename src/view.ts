import { ItemView, Modal, Notice, TFile, WorkspaceLeaf, debounce, normalizePath } from 'obsidian';
import type ContentStudioPlugin from './main';
import { Card, Idea, STAGES, ideaSections, mergeIdeas, newId, newNoteText, parseNote, replaceSection, fileNameFrom, oneLine } from './note';
import { AiError, ResearchHandle, findClaude, runResearch } from './claude';

export const VIEW_TYPE = 'content-studio-view';
const COLORS: Card['color'][] = ['yellow', 'blue', 'green'];
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const SVG = 'http://www.w3.org/2000/svg';

const ERR: Record<AiError, { t: string; c: string; fix: string[]; retry: string }> = {
  missing: { t: 'Claude Code를 찾지 못했어요', c: '이 컴퓨터에서 Claude Code 실행 파일을 찾을 수 없어요.',
    fix: ['터미널에서 <code>npm install -g @anthropic-ai/claude-code</code> 로 설치해요. (공식 안내를 따라 설치해도 돼요)', '이미 설치했다면 설정 → 「Claude Code 실행 파일 경로」에 위치를 직접 적어요.', '다시 확인을 눌러요.'], retry: '다시 확인' },
  login: { t: 'Claude Code에 로그인되어 있지 않아요', c: '실행은 되지만 계정 인증이 없어서 조사를 시작할 수 없어요.',
    fix: ['터미널에서 <code>claude</code> 를 실행해 안내에 따라 로그인해요.', '로그인한 뒤 이 화면으로 돌아와 다시 시도를 눌러요.'], retry: '다시 시도' },
  fail: { t: '조사를 끝내지 못했어요', c: 'Claude Code가 결과를 돌려주지 않았거나 형식이 달랐어요. 이미 붙은 카드는 그대로예요.',
    fix: ['잠시 뒤 다시 시도해요.', '같은 일이 반복되면 메시지를 더 구체적인 한 문장으로 고쳐 보세요.'], retry: '다시 시도' },
  net: { t: '인터넷에 연결되지 않았어요', c: '웹 검색이 필요한 조사를 할 수 없어요. 판과 카드는 그대로 쓸 수 있어요.',
    fix: ['Wi-Fi나 네트워크 연결을 확인해요.', '연결되면 다시 시도를 눌러요.'], retry: '다시 시도' }
};

/* ───────── 작은 모달들 ───────── */
class TextModal extends Modal {
  constructor(app: any, private o: { title: string; label: string; ok: string; value?: string; multi?: boolean; onOk(v: string): void }) { super(app); }
  onOpen() {
    const { contentEl: el } = this; el.addClass('cs-root', 'cs-modal'); this.titleEl.setText(this.o.title);
    el.createEl('label', { text: this.o.label });
    const inp = this.o.multi ? el.createEl('textarea') : el.createEl('input', { type: 'text' });
    inp.value = this.o.value ?? ''; inp.focus();
    const go = () => { const v = inp.value.trim(); if (!v) { new Notice('한 글자 이상 적어 주세요.'); return; } this.close(); this.o.onOk(v); };
    const b = el.createDiv('btns');
    b.createEl('button', { text: '취소', cls: 'cs-btn' }).onclick = () => this.close();
    b.createEl('button', { text: this.o.ok, cls: 'cs-btn primary' }).onclick = go;
    inp.addEventListener('keydown', (ev: Event) => { const e = ev as KeyboardEvent; if (e.key === 'Enter' && (!this.o.multi || e.metaKey || e.ctrlKey)) { e.preventDefault(); go(); } });
  }
}

class EditModal extends Modal {
  constructor(app: any, private c: Card, private onOk: (c: Card) => void) { super(app); }
  onOpen() {
    const { contentEl: el, c } = this; el.addClass('cs-root', 'cs-modal'); this.titleEl.setText(c.type === 'research' ? '조사 카드 고치기' : '메모 카드 고치기');
    const f = (label: string, v: string, multi = false) => { el.createEl('label', { text: label }); const i = multi ? el.createEl('textarea') : el.createEl('input', { type: 'text' }); i.value = v; return i as HTMLInputElement; };
    const head = f('제목', c.headline), body = f(c.type === 'research' ? '요약' : '내용', c.summary, true), why = f('메시지와 이어지는 한 줄', c.why ?? '');
    let sn: HTMLInputElement | null = null, su: HTMLInputElement | null = null;
    if (c.type === 'memo') { sn = f('출처 이름 (선택)', c.source?.name ?? ''); su = f('출처 주소 (선택, http/https)', c.source?.url ?? ''); }
    const b = el.createDiv('btns');
    b.createEl('button', { text: '취소', cls: 'cs-btn' }).onclick = () => this.close();
    b.createEl('button', { text: '저장', cls: 'cs-btn primary' }).onclick = () => {
      if (!body.value.trim()) { new Notice(c.type === 'research' ? '요약을 비울 수 없어요.' : '내용을 비울 수 없어요.'); return; }
      const n: Card = { ...c, headline: oneLine(head.value), summary: body.value.trim(), why: oneLine(why.value) || undefined };
      if (c.type === 'memo') {
        const url = su!.value.trim();
        if (url && !/^https?:\/\//i.test(url)) { new Notice('출처 주소는 http:// 또는 https://로 시작해야 해요.'); return; }
        n.source = url ? { name: sn!.value.trim() || url, url } : undefined;
      }
      this.close(); this.onOk(n);
    };
  }
}

class FindModal extends Modal {
  constructor(app: any, private cards: Card[], private mode: 'jump' | 'connect', private pos: (id: string) => string, private onPick: (id: string) => void) { super(app); }
  onOpen() {
    const { contentEl: el } = this; el.addClass('cs-root', 'cs-modal'); this.titleEl.setText(this.mode === 'connect' ? '붉은 실로 이을 카드 고르기' : '카드 찾기');
    const q = el.createEl('input', { type: 'text', placeholder: '제목·요약·내용으로 찾기' }); q.focus();
    const ul = el.createEl('ul');
    const draw = () => {
      ul.empty(); const k = q.value.trim().toLowerCase();
      const hit = this.cards.filter(c => !k || (c.headline + c.summary + (c.why ?? '')).toLowerCase().includes(k));
      if (!hit.length) ul.createEl('li', { text: '맞는 카드가 없어요.' });
      hit.forEach(c => { const li = ul.createEl('li'); const t = li.createDiv('t'); t.createSpan({ text: c.headline || c.summary.split('\n')[0] }); t.createEl('small', { text: `${c.type === 'research' ? '조사' : '메모'} · ${this.pos(c.id)}` }); li.createEl('button', { text: this.mode === 'connect' ? '이 카드와 잇기' : '이 카드로 가기', cls: 'cs-btn sm' }).onclick = () => { this.close(); this.onPick(c.id); }; });
    };
    q.addEventListener('input', draw); draw();
  }
}

class ArchiveModal extends Modal {
  constructor(app: any, private view: StudioView) { super(app); }
  onOpen() { this.contentEl.addClass('cs-root', 'cs-modal'); this.titleEl.setText('버린 카드'); this.draw(); }
  draw() {
    const el = this.contentEl; el.empty();
    const v = this.view, arch = v.idea.board.archived;
    el.createEl('p', { text: '복구하면 원래 자리와 고정 상태로 돌아가고, 숨어 있던 붉은 실도 다시 보여요.' });
    if (!arch.length) { el.createEl('p', { text: '버린 카드가 없어요.' }); return; }
    const ul = el.createEl('ul');
    arch.forEach(a => {
      const c = v.cardById(a.id); if (!c) return;
      const li = ul.createEl('li'); const t = li.createDiv('t'); t.createSpan({ text: c.headline || c.summary.split('\n')[0] });
      const n = v.idea.board.links.filter(l => l.includes(a.id)).length;
      t.createEl('small', { text: [a.wasPinned ? '버리기 전 고정이었어요' : '', n ? `붉은 실 ${n}개 숨김` : ''].filter(Boolean).join(' · ') || (c.type === 'research' ? '조사 카드' : '메모 카드') });
      li.createEl('button', { text: '복구', cls: 'cs-btn sm primary' }).onclick = () => { v.restore(a.id); this.draw(); };
      const del = li.createEl('button', { text: '완전히 삭제', cls: 'cs-btn sm' });
      del.onclick = () => { if (del.dataset.sure) { v.purge(a.id); this.draw(); } else { del.dataset.sure = '1'; del.setText('정말 삭제'); } };
    });
  }
}

/* ───────── 화면 ───────── */
export class StudioView extends ItemView {
  mode: 'list' | 'board' = 'list'; elsewhere = false;
  file: TFile | null = null; idea!: Idea; base!: Idea;
  selected: string | null = null; connectFrom: string | null = null; moveId: string | null = null; moveFrom = -1;
  rs: { s: 'suggest' | 'running' | 'stopped' | 'done' | 'idle'; added: number } = { s: 'suggest', added: 0 };
  aiError: AiError | null = null; handle: ResearchHandle | null = null; fresh = new Set<string>();
  lastWritten = ''; saveBad = false; unreadableWarned = false; userList = false; listMode = false;
  private canvas!: HTMLElement; private threads!: SVGSVGElement; private root!: HTMLElement; private selbar!: HTMLElement; private modebar!: HTMLElement;
  private cols = 2; private colW = 224;

  constructor(leaf: WorkspaceLeaf, private plugin: ContentStudioPlugin) { super(leaf); }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return '콘텐츠 스튜디오'; }
  getIcon() { return 'pin'; }
  async setState(state: any, result: any) {
    if (state?.file) { const f = this.app.vault.getAbstractFileByPath(state.file); if (f instanceof TFile) { await this.openIdea(f); return super.setState(state, result); } }
    this.showList(false); return super.setState(state, result);
  }
  getState() { return { file: this.mode === 'board' ? this.file?.path : undefined }; }

  async onOpen() {
    this.contentEl.addClass('cs-root');
    this.registerEvent(this.app.vault.on('modify', f => { if (f === this.file) this.onDiskChange(); }));
    this.registerEvent(this.app.vault.on('delete', f => { if (f === this.file) { this.handle?.cancel(); this.file = null; new Notice('노트가 삭제되었어요. 저장과 조사를 멈췄어요.'); this.showList(false); } }));
    this.registerEvent(this.app.metadataCache.on('changed', () => { if (this.mode === 'list') this.renderList(); }));
    const ro = new ResizeObserver(() => { if (this.mode === 'board') { this.autoView(); this.layout(); } }); ro.observe(this.contentEl); this.register(() => ro.disconnect());
    if (!this.root) this.showList(false);
  }
  async onClose() { this.handle?.cancel(); await this.flush(); }

  /* ───── 목록 ───── */
  showList(elsewhere: boolean) {
    this.elsewhere = elsewhere; this.handle?.cancel(); this.handle = null;
    void this.flush().then(() => { this.mode = 'list'; this.file = null; this.renderList(); });
  }
  private shell(): HTMLElement { this.contentEl.empty(); const w = this.contentEl.createDiv('cs-wrap'); this.root = w; return w; }
  private header(w: HTMLElement, title: string) {
    const h = w.createDiv('cs-head');
    if (this.mode === 'board') { const b = h.createEl('button', { text: '← 아이디어 목록', cls: 'cs-btn ghost back' }); b.onclick = () => this.showList(false); } else h.createSpan();
    h.createSpan({ text: '콘텐츠 스튜디오', cls: 'cs-brand' }); h.createSpan({ text: title, cls: 'idea-title' });
  }
  async renderList() {
    if (this.mode !== 'list') return;
    const w = this.shell(); this.header(w, '');
    const face = w.createDiv('cs-face');
    const head = face.createDiv('cs-list-head');
    const t = head.createDiv(); t.createEl('h1', { text: this.elsewhere ? '다른 위치의 아이디어' : '아이디어' }); t.createEl('p', { text: this.elsewhere ? '볼트 전체에서 찾은 아이디어 노트예요.' : '이어서 쓸 아이디어를 고르거나 새로 시작해요.' });
    const nb = head.createEl('button', { text: '새 아이디어', cls: 'cs-btn primary' });
    const panel = face.createDiv('cs-new');
    const files = this.app.vault.getMarkdownFiles().filter(f => this.plugin.isIdea(f) && (this.elsewhere || f.path.startsWith(this.plugin.folder() + '/')));
    files.sort((a, b) => b.stat.mtime - a.stat.mtime);
    const showNew = () => { nb.setAttr('aria-expanded', 'true'); this.renderStart(panel); };
    nb.onclick = showNew; if (!files.length) showNew();
    if (!files.length) { const e = face.createDiv('cs-empty'); e.createEl('h2', { text: '아직 아이디어가 없어요' }); e.createEl('p', { text: '위의 「새 아이디어」로 하고 싶은 말 한 줄, 또는 겪은 일 하나를 적어 시작해요.' }); return; }
    const ul = face.createEl('ul', { cls: 'cs-ideas' });
    for (const f of files) {
      const fm = this.app.metadataCache.getFileCache(f)?.frontmatter ?? {}; const li = ul.createEl('li');
      const p = parseNote(await this.app.vault.cachedRead(f));
      li.createDiv({ cls: 't', text: p?.idea.message || f.basename });
      const meta = li.createDiv('meta');
      if (!fm.id) { meta.createDiv({ cls: 'warn', text: '식별 정보 없음' }); const fix = meta.createEl('button', { text: '식별 정보 복구', cls: 'cs-btn sm' }); fix.onclick = async e => { e.stopPropagation(); await this.app.fileManager.processFrontMatter(f, x => { x.id = newId('i'); }); new Notice('새 식별 정보를 넣었어요.'); }; }
      else { meta.createDiv({ text: `${fm['단계'] ?? '코르크판'} · 카드 ${p?.idea.cards.length ?? 0}장` }); meta.createDiv({ text: new Date(f.stat.mtime).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }); }
      li.onclick = () => { if (!fm.id) { new Notice('먼저 「식별 정보 복구」를 눌러 주세요.'); return; } void this.openIdea(f); };
    }
  }
  private renderStart(panel: HTMLElement) {
    panel.empty(); const o = panel.createDiv('cs-start');
    const mk = (cls: string, t: string, d: string, kind: 'message' | 'experience') => { const b = o.createEl('button', { cls: 'cs-start-opt ' + cls }); b.createEl('strong', { text: t }); b.createSpan({ text: d }); b.onclick = () => form(kind); };
    const form = (kind: 'message' | 'experience') => {
      panel.querySelector('.cs-start-form')?.remove(); const f = panel.createDiv('cs-start-form');
      f.createEl('label', { text: kind === 'message' ? '하고 싶은 말을 한 문장으로 (질문이어도 괜찮아요)' : '겪은 일이나 기사 링크를 적어 두세요 (메시지는 나중에 찾아도 돼요)' });
      const i = kind === 'message' ? f.createEl('input', { type: 'text' }) : f.createEl('textarea'); i.focus();
      const r = f.createDiv('row'); const go = r.createEl('button', { text: '시작하기', cls: 'cs-btn primary' });
      go.onclick = () => { const v = i.value.trim(); if (!v) { new Notice('먼저 한 줄을 적어 주세요.'); return; } void this.create(kind, v); };
      i.addEventListener('keydown', (e: Event) => { const k = e as KeyboardEvent; if (k.key === 'Enter' && (kind === 'message' || k.metaKey || k.ctrlKey)) { k.preventDefault(); go.click(); } });
    };
    mk('primary', '메시지에서 시작', '하고 싶은 말이 이미 한 문장으로 있어요. 질문이어도 괜찮아요.', 'message');
    mk('', '경험·글감에서 시작', '겪은 일이나 기사 링크부터 적어 둘게요. 메시지는 나중에 찾아도 돼요.', 'experience');
  }
  private async create(kind: 'message' | 'experience', text: string) {
    const folder = this.plugin.folder();
    try {
      if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder).catch(() => { /* 이미 있음 */ });
      const base = fileNameFrom(text); let name = base, n = 2;
      while (this.app.vault.getAbstractFileByPath(normalizePath(`${folder}/${name}.md`))) name = `${base} ${n++}`;
      const body = newNoteText({ id: newId('i'), message: kind === 'message' ? text : '', start: kind === 'message' ? '메시지' : '경험', memo: kind === 'experience' ? text : undefined });
      const f = await this.app.vault.create(normalizePath(`${folder}/${name}.md`), body);
      await this.openIdea(f);
    } catch (e) { new Notice('노트를 만들지 못했어요: ' + (e as Error).message); }
  }

  /* ───── 열기·저장 ───── */
  async openIdea(f: TFile) {
    await this.flush();
    const p = parseNote(await this.app.vault.read(f));
    if (!p) { new Notice('아이디어 노트가 아니에요. (frontmatter에 content-studio: idea 필요)'); return; }
    this.file = f; this.idea = p.idea; this.base = clone(p.idea); this.lastWritten = ''; this.saveBad = false;
    this.selected = null; this.connectFrom = null; this.moveId = null; this.fresh.clear();
    this.rs = { s: p.idea.message ? 'suggest' : 'idle', added: 0 }; this.aiError = null; this.mode = 'board'; this.userList = false;
    this.buildBoard(); this.app.workspace.requestSaveLayout();
  }
  private doSave = debounce(() => void this.save(), 500, true);
  scheduleSave() { this.doSave(); }
  async flush() { if (this.file && this.mode === 'board') await this.save(); }
  async save() {
    const f = this.file; if (!f) return;
    let merged: ReturnType<typeof mergeIdeas> | null = null;
    try {
      const out = await this.app.vault.process(f, disk => {
        const dp = parseNote(disk); if (!dp) throw new Error('노트의 frontmatter를 읽을 수 없어요');
        merged = mergeIdeas(this.base, this.idea, dp.idea);
        const s = ideaSections(merged.idea);
        const t = replaceSection(replaceSection(replaceSection(disk, '메시지', s.message), '카드', s.cards), '판 배치', s.board);
        this.lastWritten = t; return t;
      });
      void out; const m = merged as ReturnType<typeof mergeIdeas> | null;
      if (m) {
        const changed = JSON.stringify(m.idea) !== JSON.stringify(this.idea);
        this.idea = m.idea; this.base = clone(m.idea);
        if (m.conflicts.length) new Notice('편집기에서도 고친 카드가 있어 편집기 쪽을 남겼어요: ' + m.conflicts.join(', '), 8000);
        if (changed) this.refresh();
      }
      if (this.saveBad) { this.saveBad = false; this.renderSaveState(); }
    } catch (e) { this.saveBad = true; this.renderSaveState(); console.error('[content-studio] 저장 실패', e); }
  }
  private ext = debounce(() => void this.reloadExternal(), 800, true);
  private onDiskChange() { if (this.mode === 'board') this.ext(); }
  private async reloadExternal() {
    const f = this.file; if (!f) return; const text = await this.app.vault.read(f);
    if (text === this.lastWritten) return;
    const dp = parseNote(text); if (!dp) return;
    const m = mergeIdeas(this.base, this.idea, dp.idea);
    this.base = clone(dp.idea); this.idea = m.idea; this.lastWritten = text;
    if (JSON.stringify(m.idea) !== JSON.stringify(dp.idea)) this.scheduleSave();
    this.refresh();
  }
  private renderSaveState() { const el = this.root?.querySelector('.cs-savebad'); if (el) el.remove(); if (!this.saveBad) return; const c = this.root.querySelector('.cs-counts'); if (!c) return; const s = createSpan({ cls: 'cs-savebad', text: '저장 안 됨 ' }); s.createEl('button', { text: '다시 저장', cls: 'cs-btn sm' }).onclick = () => void this.save(); c.after(s); }

  /* ───── 판 만들기 ───── */
  cardById(id: string) { return this.idea.cards.find(c => c.id === id); }
  live(): Card[] { const arch = new Set(this.idea.board.archived.map(a => a.id)); return this.idea.board.order.filter(id => !arch.has(id)).map(id => this.cardById(id)).filter((c): c is Card => !!c); }
  private title = (c: Card) => c.headline || c.summary.split('\n')[0];
  private isPinned = (id: string) => this.idea.board.pinned.includes(id);

  private buildBoard() {
    const w = this.shell(); this.header(w, this.file?.basename ?? '');
    const msg = w.createDiv('cs-msg'); msg.dataset.part = 'msg';
    const steps = w.createEl('ol', { cls: 'cs-steps' }); steps.dataset.part = 'steps';
    STAGES.forEach((s, i) => {
      const li = steps.createEl('li'); const b = li.createEl('button'); b.createSpan({ cls: 'n', text: String(i + 1) }); b.createSpan({ cls: 'nm', text: s });
      if (i === 1) b.setAttr('aria-current', 'step'); else { if (i < 1) b.addClass('done'); b.setAttr('aria-disabled', 'true'); b.setAttr('aria-label', `${i + 1} ${s} (다음 버전에서 만들어요)`); b.onclick = () => new Notice(`‘${s}’ 단계는 다음 버전에서 만들어요. 지금은 코르크판에서 재료를 모아 두세요.`); }
    });
    w.createDiv().dataset.part = 'ai';
    const tools = w.createDiv('cs-tools');
    const seg = tools.createSpan(); seg.addClass('seg');
    const bb = seg.createEl('button', { text: '판', cls: 'cs-btn' }), lb = seg.createEl('button', { text: '목록', cls: 'cs-btn' }); bb.dataset.v = 'board'; lb.dataset.v = 'list';
    bb.onclick = () => { this.userList = true; this.listMode = false; this.applyView(); }; lb.onclick = () => { this.userList = true; this.listMode = true; this.applyView(); };
    tools.createEl('button', { text: '+ 메모 붙이기', cls: 'cs-btn' }).onclick = () => this.addMemo();
    tools.createEl('button', { cls: 'cs-btn' }).setText('카드 찾기 (/)'); (tools.lastChild as HTMLElement).onclick = () => this.find('jump');
    tools.createSpan('sp'); tools.createSpan({ cls: 'cs-counts' });
    const ab = tools.createEl('button', { cls: 'cs-btn' }); ab.dataset.part = 'arch'; ab.onclick = () => new ArchiveModal(this.app, this).open();
    this.selbar = w.createDiv('cs-selbar cs-face'); this.selbar.setAttr('role', 'toolbar'); this.selbar.setAttr('aria-label', '선택한 카드 동작');
    this.selbar.addEventListener('click', e => { const b = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null; if (b && this.selected) this.act(b.dataset.act!, this.selected); });
    this.modebar = w.createDiv('cs-modebar'); this.modebar.hide();
    const board = w.createDiv('cs-board'); board.dataset.part = 'board';
    this.canvas = board.createDiv('cs-canvas'); this.canvas.setAttr('role', 'group'); this.canvas.setAttr('aria-label', '카드 판');
    this.threads = document.createElementNS(SVG, 'svg') as SVGSVGElement; this.threads.setAttribute('class', 'cs-threads'); this.threads.setAttribute('aria-hidden', 'true'); this.canvas.appendChild(this.threads);
    this.bindCanvas();
    this.autoView(); this.refresh();
  }
  private autoView() { if (!this.userList) this.listMode = this.contentEl.clientWidth < 720; this.applyView(false); }
  private applyView(re = true) {
    const b = this.root?.querySelector('[data-part="board"]') as HTMLElement | null; if (!b) return;
    b.toggleClass('cs-list', this.listMode);
    this.root.querySelectorAll('[data-v]').forEach(x => x.setAttr('aria-pressed', String((x as HTMLElement).dataset.v === (this.listMode ? 'list' : 'board'))));
    if (re) { this.layout(); this.renderSelbar(); }
  }
  refresh() {
    if (this.mode !== 'board' || !this.root) return;
    this.renderMessage(); this.renderAI(); this.renderCards(); this.renderSelbar(); this.renderMeta();
  }
  private renderMeta() {
    const l = this.live(), ids = new Set(l.map(c => c.id)), n = this.idea.board.links.filter(([a, b]) => ids.has(a) && ids.has(b)).length;
    const sel = this.selected && ids.has(this.selected) ? ` · 선택 ${l.findIndex(c => c.id === this.selected) + 1}번째` : '';
    this.root.querySelector('.cs-counts')!.setText(`카드 ${l.length}장 · 고정 ${l.filter(c => this.isPinned(c.id)).length} · 붉은 실 ${n}${sel}`);
    (this.root.querySelector('[data-part="arch"]') as HTMLElement).setText(`버린 카드 ${this.idea.board.archived.length}`);
    this.renderSaveState();
  }

  /* 메시지 */
  private renderMessage() {
    const m = this.root.querySelector('[data-part="msg"]') as HTMLElement; m.empty();
    const idea = this.idea, empty = !idea.message, q = idea.message.trim().endsWith('?');
    if (!empty) {
      const l = m.createDiv('label'); l.createSpan({ text: '현재 메시지' }); l.createSpan({ cls: 'cs-chip', text: (q ? '후보' : idea.status) + (q ? ' · 질문형' : '') }); l.createSpan('sp');
      if (!q) l.createEl('button', { text: idea.status === '확정' ? '후보로 되돌리기' : '확정', cls: 'cs-btn sm' }).onclick = () => { idea.status = idea.status === '확정' ? '후보' : '확정'; this.scheduleSave(); this.renderMessage(); };
      l.createEl('button', { text: '수정', cls: 'cs-btn sm' }).onclick = () => this.editMessage(m);
      m.createEl('h1', { cls: 'text', text: `“${idea.message}”` });
    } else this.messageForm(m, '아직 메시지가 없어요. 한 문장으로 적어 보세요');
  }
  private messageForm(m: HTMLElement, label: string, value = '') {
    m.empty(); const f = m.createEl('form'); f.createEl('label', { text: label }); const r = f.createDiv('row');
    const i = r.createEl('input', { type: 'text' }); i.value = value; r.createEl('button', { text: '저장', cls: 'cs-btn primary', type: 'submit' });
    if (this.idea.message) r.createEl('button', { text: '취소', cls: 'cs-btn ghost', type: 'button' }).onclick = () => this.renderMessage();
    f.onsubmit = e => {
      e.preventDefault(); const v = oneLine(i.value); if (!v) { new Notice('한 문장을 먼저 적어 주세요.'); return; }
      const changed = v !== this.idea.message; this.idea.message = v; this.idea.status = '후보';
      if (changed && this.rs.s !== 'running') this.rs = { s: 'suggest', added: this.rs.added };
      this.scheduleSave(); this.refresh(); new Notice('메시지를 저장했어요.');
    };
    i.focus(); i.select();
  }
  private editMessage(m: HTMLElement) { this.messageForm(m, '메시지 수정', this.idea.message); }

  /* AI 자리 */
  private renderAI() {
    const slot = this.root.querySelector('[data-part="ai"]') as HTMLElement; slot.empty();
    if (this.aiError) return this.renderErr(slot, this.aiError);
    const r = slot.createDiv('cs-research cs-face'); const set = (q: string, sub: string) => { r.createSpan({ cls: 'q', text: q }); r.createSpan({ cls: 'sub', text: sub }); };
    const acts = () => r.createSpan('acts'); const s = this.rs.s;
    if (!this.idea.message) { set('메시지를 먼저 적어 주세요', '조사는 메시지(후보여도 돼요)가 있어야 시작해요. 위 칸에 한 문장을 적어 보세요.'); return; }
    if (s === 'suggest') { set('이 주제를 조사해 볼까요?', `‘${this.idea.message}’와 이어질 사례·자료를 웹에서 찾아 포스트잇으로 붙여 드려요.`); const a = acts(); a.createEl('button', { text: '조사하기', cls: 'cs-btn primary' }).onclick = () => this.startResearch(); a.createEl('button', { text: '나중에', cls: 'cs-btn ghost' }).onclick = () => { this.rs.s = 'idle'; this.renderAI(); }; }
    else if (s === 'running') { r.addClass('running'); set('조사하는 중이에요', `${this.rs.added}장 붙었어요. 기다리는 동안 판은 그대로 만져도 돼요.`); acts().createEl('button', { text: '중단', cls: 'cs-btn' }).onclick = () => this.stopResearch(); }
    else if (s === 'stopped') { set('조사를 멈췄어요', `이미 붙은 ${this.rs.added}장은 그대로 두었어요.`); acts().createEl('button', { text: '이어서 찾기', cls: 'cs-btn' }).onclick = () => this.startResearch(); }
    else if (s === 'done') { set(`${this.rs.added}장을 붙였어요`, '새 카드에는 ‘새로’ 표시가 있어요. 마음에 드는 카드는 고정해 두세요.'); acts().createEl('button', { text: '더 찾기', cls: 'cs-btn' }).onclick = () => this.startResearch(); }
    else { set('조사 카드가 더 필요하신가요?', '원할 때 언제든 조사할 수 있어요.'); acts().createEl('button', { text: '조사하기', cls: 'cs-btn' }).onclick = () => this.startResearch(); }
  }
  private renderErr(slot: HTMLElement, k: AiError) {
    const e = ERR[k]; const b = slot.createDiv('cs-errbox cs-face'); b.setAttr('role', 'alert'); b.createDiv({ cls: 'ic', text: '!' });
    const d = b.createDiv(); d.createEl('h3', { text: e.t }); d.createEl('p', { cls: 'cause', text: e.c });
    const ol = d.createEl('ol'); e.fix.forEach(f => ol.createEl('li').innerHTML = f);
    d.createEl('p', { cls: 'cont', text: '조사 없이도 메모 카드는 직접 붙일 수 있어요. 판 위 카드는 그대로 쓸 수 있어요.' });
    const a = d.createDiv('acts');
    a.createEl('button', { text: e.retry, cls: 'cs-btn primary' }).onclick = () => { if (k === 'missing' && !findClaude(this.plugin.settings.claudePath)) { new Notice('아직 Claude Code를 찾지 못했어요.'); return; } this.aiError = null; this.renderAI(); if (k !== 'missing') this.startResearch(); };
    a.createEl('button', { text: '직접 쓰기로 계속', cls: 'cs-btn' }).onclick = () => { this.aiError = null; this.rs.s = 'idle'; this.renderAI(); this.addMemo(); };
  }
  private startResearch() {
    if (!this.idea.message) { new Notice('메시지를 먼저 적어 주세요.'); return; }
    this.aiError = null; this.rs = { s: 'running', added: 0 }; this.renderAI();
    const h = runResearch({
      claudePath: this.plugin.settings.claudePath, message: this.idea.message, existing: this.live().map(this.title),
      onCard: raw => {
        const c: Card = { id: newId(), type: 'research', color: COLORS[this.idea.cards.length % COLORS.length], headline: raw.headline, summary: raw.summary, source: raw.source, image: raw.image, why: raw.connection || undefined };
        this.idea.cards.push(c); this.idea.board.order.push(c.id); this.fresh.add(c.id); setTimeout(() => { this.fresh.delete(c.id); this.renderCards(); }, 7000);
        this.rs.added++; this.scheduleSave(); this.renderCards(); this.renderSelbar(); this.renderMeta(); this.renderAI();
      }
    });
    this.handle = h;
    void h.done.then(r => {
      if (this.handle !== h) return; this.handle = null;
      if (r.ok) { this.rs.s = this.rs.s === 'stopped' ? 'stopped' : 'done'; if (!r.count && this.rs.s === 'done') { this.aiError = 'fail'; } }
      else { this.aiError = r.error; console.warn('[content-studio] 조사 실패', r.detail); }
      this.renderAI();
    });
  }
  private stopResearch() { this.rs.s = 'stopped'; this.handle?.cancel(); this.renderAI(); }

  /* ───── 카드 그리기 ───── */
  private renderCards() {
    this.canvas.querySelectorAll('.cs-card, .cs-empty-board').forEach(e => e.remove());
    const l = this.live(), arch = new Set(this.idea.board.archived.map(a => a.id));
    if (this.selected && !l.some(c => c.id === this.selected)) this.selected = null;
    l.forEach((c, i) => {
      const e = this.canvas.createEl('article', { cls: 'cs-card' }); e.dataset.id = c.id; e.dataset.color = c.color;
      e.style.setProperty('--rot', (((i * 37) % 5) - 2) * 0.7 + 'deg'); e.tabIndex = c.id === this.selected || (!this.selected && i === 0) ? 0 : -1;
      e.toggleClass('pinned', this.isPinned(c.id)); e.toggleClass('selected', c.id === this.selected); e.toggleClass('connect-from', c.id === this.connectFrom); e.toggleClass('moving', c.id === this.moveId);
      const names = this.idea.board.links.filter(l2 => l2.includes(c.id)).map(([a, b]) => a === c.id ? b : a).filter(x => !arch.has(x)).map(x => this.cardById(x)).filter((x): x is Card => !!x).map(this.title);
      e.setAttr('aria-label', `${c.type === 'research' ? '조사 카드' : '메모 카드'}: ${this.title(c)}${this.isPinned(c.id) ? ', 고정됨' : ''}${names.length ? ', 붉은 실 ' + names.length + '개' : ''}`);
      const bd = e.createDiv('cs-badges'); bd.createSpan({ cls: 'cs-badge', text: c.type === 'research' ? '조사' : '메모' });
      if (this.isPinned(c.id)) bd.createSpan({ cls: 'cs-badge pin', text: '고정' }); if (this.fresh.has(c.id)) bd.createSpan({ cls: 'cs-badge', text: '새로' });
      const pb = bd.createEl('button', { cls: 'cs-card-pin', text: this.isPinned(c.id) ? '풀기' : '고정' }); pb.tabIndex = c.id === this.selected ? 0 : -1; pb.dataset.act = 'cardpin';
      pb.setAttr('aria-pressed', String(this.isPinned(c.id))); pb.setAttr('aria-label', (this.isPinned(c.id) ? '고정 풀기: ' : '얼개 후보로 고정: ') + this.title(c));
      if (c.image) { const im = e.createEl('img', { cls: 'c-img', attr: { src: c.image, alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' } }); im.onerror = () => { im.remove(); this.layout(); }; im.onload = () => this.layout(); }
      if (c.headline) e.createEl('h3', { text: c.headline });
      e.createEl('p', { cls: c.type === 'research' ? 'c-sum' : 'c-body', text: c.summary });
      if (c.source) { const p = e.createEl('p', { cls: 'c-src' }); p.appendText('출처 · '); const a = p.createEl('a', { text: c.source.name + ' ↗', href: c.source.url }); a.setAttr('target', '_blank'); a.setAttr('rel', 'noopener'); a.tabIndex = -1; }
      if (c.why) e.createEl('p', { cls: 'c-why', text: '메시지와: ' + c.why });
      if (names.length) e.createEl('p', { cls: 'c-links', text: '붉은 실: ' + names.join(' · ') });
    });
    if (!l.length) {
      const eb = this.canvas.createDiv('cs-empty-board cs-face'), has = !!this.idea.message;
      eb.createEl('h2', { text: has ? '아직 붙은 카드가 없어요' : '메시지가 없어도 판을 쓸 수 있어요' });
      eb.createEl('p', { text: has ? '「조사하기」를 누르면 웹에서 찾은 사례가 포스트잇으로 하나씩 붙어요. 직접 쓴 메모도 붙일 수 있어요.' : '경험이나 글감부터 시작했다면 메시지는 나중에 찾아도 돼요. 위에 한 문장을 적으면 조사를 시작할 수 있고, 지금은 메모 카드를 먼저 붙일 수 있어요.' });
      const a = eb.createDiv('acts');
      if (has && !this.aiError) a.createEl('button', { text: '조사하기', cls: 'cs-btn primary' }).onclick = () => this.startResearch();
      if (!has) a.createEl('button', { text: '메시지 적기', cls: 'cs-btn primary' }).onclick = () => (this.root.querySelector('[data-part="msg"] input') as HTMLElement)?.focus();
      a.createEl('button', { text: '+ 메모 붙이기', cls: 'cs-btn' + (has && !this.aiError ? '' : ' primary') }).onclick = () => this.addMemo();
    }
    if (this.idea.unreadable.length && !this.root.querySelector('.cs-warn')) this.root.querySelector('[data-part="board"]')!.after(createDiv({ cls: 'cs-warn', text: `읽을 수 없는 부분이 ${this.idea.unreadable.length}곳 있어요. 노트에서 직접 고쳐 주세요. 이 부분은 저장해도 그대로 둬요.` }));
    this.layout();
  }
  private layout() {
    if (!this.canvas) return;
    const cards = Array.from(this.canvas.querySelectorAll<HTMLElement>('.cs-card'));
    if (this.listMode) { this.canvas.style.height = ''; this.canvas.style.removeProperty('--card-w'); cards.forEach(e => { e.style.left = ''; e.style.top = ''; }); this.drawThreads(); return; }
    const W = this.canvas.clientWidth; if (W < 200) return;
    const pad = 40, gap = 56, cols = Math.max(2, Math.floor((W - pad * 2 + gap) / (224 + gap))), w = Math.min(268, Math.floor((W - pad * 2 - gap * (cols - 1)) / cols));
    this.cols = cols; this.colW = w; this.canvas.style.setProperty('--card-w', w + 'px');
    const hs = Array(cols).fill(pad + 10); let bottom = 420;
    cards.forEach((e, i) => { const k = hs.indexOf(Math.min(...hs)); const x = Math.round(pad + k * (w + gap) + (i % 3 - 1) * 4), y = hs[k] + (i % 2) * 10; e.style.left = x + 'px'; e.style.top = y + 'px'; hs[k] += e.offsetHeight + gap - 6; bottom = Math.max(bottom, y + e.offsetHeight + 70); });
    this.canvas.style.height = bottom + 'px'; this.drawThreads();
  }
  private drawThreads() {
    while (this.threads.firstChild) this.threads.removeChild(this.threads.firstChild);
    if (this.listMode) return;
    const el = (id: string) => this.canvas.querySelector<HTMLElement>(`.cs-card[data-id="${id}"]`);
    for (const [a, b] of this.idea.board.links) {
      const ea = el(a), eb = el(b); if (!ea || !eb) continue;
      const ca = [ea.offsetLeft + ea.offsetWidth / 2, ea.offsetTop + ea.offsetHeight / 2], cb = [eb.offsetLeft + eb.offsetWidth / 2, eb.offsetTop + eb.offsetHeight / 2];
      const dx = cb[0] - ca[0], dy = cb[1] - ca[1], horiz = Math.abs(dx) > Math.abs(dy) * .7, sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1;
      const pt = (e: HTMLElement, c: number[], x: number, y: number) => horiz ? [c[0] + x * e.offsetWidth / 2, e.offsetTop + 44] : [c[0], c[1] + y * e.offsetHeight / 2];
      const [ax, ay] = pt(ea, ca, sx, sy), [bx, by] = pt(eb, cb, -sx, -sy);
      const sag = Math.min(110, 24 + Math.hypot(bx - ax, by - ay) * .16), mx = (ax + bx) / 2, my = (ay + by) / 2;
      const d = horiz ? `M${ax} ${ay} Q${mx} ${my + sag} ${bx} ${by}` : `M${ax} ${ay} Q${mx + (ax < 200 ? sag : -sag)} ${my} ${bx} ${by}`;
      for (const cls of ['t-shadow', 't-line']) { const p = document.createElementNS(SVG, 'path'); p.setAttribute('class', cls); p.setAttribute('d', d); this.threads.appendChild(p); }
      for (const [x, y] of [[ax, ay], [bx, by]]) { const k = document.createElementNS(SVG, 'circle'); k.setAttribute('class', 't-knot'); k.setAttribute('r', '5'); k.setAttribute('cx', String(x)); k.setAttribute('cy', String(y)); this.threads.appendChild(k); }
    }
  }
  private posText(id: string) {
    const l = this.live(), i = l.findIndex(c => c.id === id); if (i < 0) return '';
    if (this.listMode) return `목록 ${i + 1}번째`;
    const e = this.canvas.querySelector<HTMLElement>(`.cs-card[data-id="${id}"]`); if (!e) return `${i + 1}번째`;
    const col = Math.round((e.offsetLeft - 40) / (this.colW + 56));
    const same = Array.from(this.canvas.querySelectorAll<HTMLElement>('.cs-card')).filter(x => Math.round((x.offsetLeft - 40) / (this.colW + 56)) === col && x.offsetTop < e.offsetTop).length;
    return `${col + 1}열 · 위에서 ${same + 1}번째`;
  }

  /* ───── 선택·동작줄 ───── */
  select(id: string | null, focus = true) {
    this.selected = id;
    this.canvas.querySelectorAll<HTMLElement>('.cs-card').forEach(e => { const on = e.dataset.id === id; e.toggleClass('selected', on); e.tabIndex = on ? 0 : -1; const pb = e.querySelector<HTMLElement>('.cs-card-pin'); if (pb) pb.tabIndex = on ? 0 : -1; });
    if (id && focus) this.canvas.querySelector<HTMLElement>(`.cs-card[data-id="${id}"]`)?.focus({ preventScroll: true });
    this.renderSelbar(); this.renderMeta();
  }
  private renderSelbar() {
    const bar = this.selbar; bar.empty(); const c = this.selected ? this.cardById(this.selected) : undefined; bar.toggleClass('empty-sel', !c);
    if (!c) { bar.createSpan({ text: this.live().length ? '카드를 고르면 여기에서 고정·붉은 실·자리 옮기기·고치기·버리기를 할 수 있어요. 카드가 많으면 「카드 찾기」를 쓰세요.' : '아직 카드가 없어요. 「조사하기」나 「+ 메모 붙이기」로 첫 카드를 붙여요.' }); return; }
    const l = this.live(), t = bar.createDiv('sel-title'); t.appendText(this.title(c)); t.createEl('small', { text: `${l.length}장 중 ${l.findIndex(x => x.id === c.id) + 1}번째 · ${this.posText(c.id)}${this.isPinned(c.id) ? ' · 고정됨' : ''}` });
    const a = bar.createDiv('sel-acts'); const pinned = this.isPinned(c.id);
    const btn = (act: string, text: string, key: string, pressed?: boolean) => { const b = a.createEl('button', { cls: 'cs-btn sm' }); b.dataset.act = act; b.setText(text + ' '); b.createEl('kbd', { text: key }); if (pressed !== undefined) b.setAttr('aria-pressed', String(pressed)); };
    btn('pin', pinned ? '고정 풀기' : '얼개 후보로 고정', 'P', pinned); btn('link', '붉은 실', 'L', this.connectFrom === c.id); btn('move', '자리 옮기기', 'M', this.moveId === c.id); btn('edit', '고치기', 'E'); btn('discard', '버리기', 'X');
  }
  private act(a: string, id: string) {
    if (a === 'pin' || a === 'cardpin') this.togglePin(id); else if (a === 'link') this.connectFrom === id ? this.cancelConnect() : this.startConnect(id);
    else if (a === 'move') this.moveId === id ? this.cancelMove(false) : this.startMove(id); else if (a === 'edit') this.edit(id); else if (a === 'discard') this.discard(id);
  }
  togglePin(id: string) {
    const p = this.idea.board.pinned, i = p.indexOf(id); i >= 0 ? p.splice(i, 1) : p.push(id);
    this.scheduleSave(); const keep = this.selected; this.renderCards(); this.select(id, false); if (keep !== id) this.selected = id;
    const c = this.cardById(id)!; new Notice(i >= 0 ? `‘${this.title(c)}’ 고정을 풀었어요.` : `‘${this.title(c)}’ 카드를 얼개 후보로 고정했어요.`, 2500);
  }
  addMemo() { new TextModal(this.app, { title: '메모 붙이기', label: '카드에 적을 내용 (Cmd/Ctrl+Enter로 붙이기)', ok: '붙이기', multi: true, onOk: v => { const c: Card = { id: newId(), type: 'memo', color: 'pink', headline: '', summary: v }; this.idea.cards.push(c); this.idea.board.order.push(c.id); this.fresh.add(c.id); setTimeout(() => { this.fresh.delete(c.id); this.renderCards(); }, 7000); this.scheduleSave(); this.refresh(); this.select(c.id); new Notice('메모를 붙였어요. 판 맨 뒤에 붙었어요. 자리를 옮기려면 M을 누르세요.'); } }).open(); }
  edit(id: string) { const c = this.cardById(id); if (c) new EditModal(this.app, c, n => { Object.assign(c, n); this.scheduleSave(); this.refresh(); this.select(id); }).open(); }
  discard(id: string) {
    const b = this.idea.board, idx = b.order.indexOf(id), l = this.live(), li = l.findIndex(c => c.id === id), next = l[li + 1] ?? l[li - 1];
    b.archived.unshift({ id, wasPinned: this.isPinned(id), idx }); b.pinned = b.pinned.filter(x => x !== id); b.order.splice(idx, 1); if (this.connectFrom === id) this.cancelConnect();
    this.selected = next?.id ?? null; this.scheduleSave(); this.refresh(); if (this.selected) this.select(this.selected);
    const f = document.createDocumentFragment(); f.appendText(`‘${this.title(this.cardById(id)!)}’ 카드를 버렸어요. `); const u = f.createEl('button', { text: '되돌리기', cls: 'cs-btn sm' }); const n = new Notice(f, 6000); u.onclick = () => { this.restore(id); n.hide(); };
  }
  restore(id: string) {
    const b = this.idea.board, a = b.archived.find(x => x.id === id); if (!a) return;
    b.archived = b.archived.filter(x => x.id !== id); b.order.splice(Math.min(a.idx, b.order.length), 0, id); if (a.wasPinned) b.pinned.push(id);
    this.fresh.add(id); setTimeout(() => { this.fresh.delete(id); this.renderCards(); }, 7000); this.scheduleSave(); this.refresh(); this.select(id, false); new Notice('카드를 원래 자리와 고정 상태로 되돌렸어요.');
  }
  purge(id: string) { const b = this.idea.board; b.archived = b.archived.filter(x => x.id !== id); b.links = b.links.filter(l => !l.includes(id)); this.idea.cards = this.idea.cards.filter(c => c.id !== id); this.scheduleSave(); this.refresh(); }

  /* 붉은 실 */
  private mode_(text: string, ...btns: [string, () => void][]) { this.modebar.empty(); this.modebar.show(); this.modebar.createSpan({ text }); btns.forEach(([t, f]) => this.modebar.createEl('button', { text: t, cls: 'cs-btn sm' }).onclick = f); }
  startConnect(id: string) { this.cancelMove(true); this.connectFrom = id; this.mode_(`‘${this.title(this.cardById(id)!)}’에서 붉은 실을 잇는 중 — 이을 카드를 방향키로 고르고 Enter. 멀리 있는 카드는 「목록에서 고르기」로 찾아요. 이미 이어진 카드를 고르면 실이 풀려요.`, ['목록에서 고르기', () => this.find('connect')], ['취소 (Esc)', () => this.cancelConnect()]); this.renderCards(); this.renderSelbar(); }
  cancelConnect() { this.connectFrom = null; if (!this.moveId) this.modebar.hide(); this.renderCards(); this.renderSelbar(); }
  finishConnect(to: string) {
    const from = this.connectFrom; if (!from) return; if (from === to) { this.cancelConnect(); return; }
    const L = this.idea.board.links, i = L.findIndex(l => l.includes(from) && l.includes(to)); i >= 0 ? L.splice(i, 1) : L.push([from, to]);
    new Notice(i >= 0 ? '붉은 실을 풀었어요.' : `붉은 실로 이었어요: ‘${this.title(this.cardById(from)!)}’ ↔ ‘${this.title(this.cardById(to)!)}’`, 2500);
    this.connectFrom = null; this.modebar.hide(); this.scheduleSave(); this.renderCards(); this.select(to); this.renderMeta();
  }
  /* 자리 옮기기: 판은 순서대로 칸에 정렬되므로 자리 = 순서 칸 */
  startMove(id: string) { this.cancelConnect(); this.moveId = id; this.moveFrom = this.idea.board.order.indexOf(id); this.mode_(`‘${this.title(this.cardById(id)!)}’ 자리 옮기는 중 — ←→ 한 칸, ↑↓ 한 줄, Enter 확정, Esc 취소`, ['확정', () => this.cancelMove(false)], ['취소', () => this.cancelMove(true)]); this.renderCards(); this.canvas.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus({ preventScroll: true }); this.renderSelbar(); }
  private moveBy(d: number) { const o = this.idea.board.order, i = o.indexOf(this.moveId!), j = Math.max(0, Math.min(o.length - 1, i + d)); if (i === j) return; const [x] = o.splice(i, 1); o.splice(j, 0, x); this.renderCards(); this.canvas.querySelector<HTMLElement>(`[data-id="${x}"]`)?.focus({ preventScroll: true }); this.canvas.querySelector(`[data-id="${x}"]`)?.scrollIntoView({ block: 'center' }); }
  cancelMove(revert: boolean) {
    if (!this.moveId) return; const id = this.moveId, o = this.idea.board.order;
    if (revert && this.moveFrom >= 0) { const i = o.indexOf(id); o.splice(i, 1); o.splice(this.moveFrom, 0, id); } else this.scheduleSave();
    this.moveId = null; this.moveFrom = -1; if (!this.connectFrom) this.modebar.hide(); this.renderCards(); this.select(id); }
  find(mode: 'jump' | 'connect') { new FindModal(this.app, this.live(), mode, id => this.posText(id), id => { if (mode === 'connect') this.finishConnect(id); else { this.select(id); this.canvas.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }).open(); }

  /* ───── 키보드·끌어서 놓기 ───── */
  private bindCanvas() {
    const c = this.canvas;
    c.addEventListener('click', e => {
      const card = (e.target as HTMLElement).closest('.cs-card') as HTMLElement | null; if (!card || (card as any)._dragged) return; if ((e.target as HTMLElement).closest('a')) return;
      const id = card.dataset.id!; if ((e.target as HTMLElement).closest('.cs-card-pin')) { if (this.connectFrom) this.finishConnect(id); else this.togglePin(id); return; }
      if (this.connectFrom) this.finishConnect(id); else this.select(id, true);
    });
    c.addEventListener('dblclick', e => { const card = (e.target as HTMLElement).closest('.cs-card') as HTMLElement | null; if (card) this.edit(card.dataset.id!); });
    c.addEventListener('focusin', e => { const card = (e.target as HTMLElement).closest('.cs-card') as HTMLElement | null; if (card && this.selected !== card.dataset.id) { this.selected = card.dataset.id!; this.renderSelbar(); this.renderMeta(); c.querySelectorAll<HTMLElement>('.cs-card').forEach(x => x.toggleClass('selected', x === card)); } });
    c.addEventListener('keydown', e => {
      const t = e.target as HTMLElement, card = t.closest('.cs-card') as HTMLElement | null; if (!card || t.closest('.cs-card-pin') || e.ctrlKey || e.metaKey || e.altKey) return;
      const id = card.dataset.id!, k = e.key;
      if (this.moveId) { e.preventDefault(); if (k === 'ArrowLeft') this.moveBy(-1); else if (k === 'ArrowRight') this.moveBy(1); else if (k === 'ArrowUp') this.moveBy(-this.cols); else if (k === 'ArrowDown') this.moveBy(this.cols); else if (k === 'Enter') this.cancelMove(false); else if (k === 'Escape') this.cancelMove(true); return; }
      if (k.startsWith('Arrow')) { e.preventDefault(); this.moveSel(k); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (this.connectFrom) this.finishConnect(id); else this.edit(id); }
      else if (k === 'p' || k === 'P') this.togglePin(id); else if (k === 'x' || k === 'X' || k === 'Delete') { e.preventDefault(); this.discard(id); }
      else if (k === 'l' || k === 'L') this.connectFrom ? (this.connectFrom === id ? this.cancelConnect() : this.finishConnect(id)) : this.startConnect(id);
      else if (k === 'm' || k === 'M') this.startMove(id); else if (k === 'e' || k === 'E') this.edit(id); else if (k === 'Escape') this.cancelConnect();
      else if (k === '/') { e.preventDefault(); this.find(this.connectFrom ? 'connect' : 'jump'); }
    });
    let drag: { id: string; x0: number; y0: number; on: boolean; el: HTMLElement } | null = null;
    c.addEventListener('pointerdown', e => { const card = (e.target as HTMLElement).closest('.cs-card') as HTMLElement | null; if (!card || e.button !== 0 || this.listMode || (e.target as HTMLElement).closest('a, .cs-card-pin')) return; drag = { id: card.dataset.id!, x0: e.clientX, y0: e.clientY, on: false, el: card }; });
    this.registerDomEvent(window, 'pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0; if (!drag.on && Math.hypot(dx, dy) > 8) { drag.on = true; drag.el.addClass('dragging'); } if (drag.on) drag.el.style.transform = `translate(${dx}px, ${dy}px)`; });
    this.registerDomEvent(window, 'pointerup', e => {
      if (!drag) return; const d = drag; drag = null; if (!d.on) return; d.el.removeClass('dragging'); d.el.style.transform = '';
      d.el.style.pointerEvents = 'none'; const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cs-card') as HTMLElement | null; d.el.style.pointerEvents = '';
      (d.el as any)._dragged = true; setTimeout(() => (d.el as any)._dragged = false, 0);
      if (t && t !== d.el) { const o = this.idea.board.order, i = o.indexOf(d.id), j = o.indexOf(t.dataset.id!); o.splice(i, 1); o.splice(j, 0, d.id); this.scheduleSave(); this.renderCards(); this.select(d.id, false); }
    });
  }
  private moveSel(dir: string) {
    const all = Array.from(this.canvas.querySelectorAll<HTMLElement>('.cs-card')), cur = all.find(e => e.dataset.id === this.selected) ?? (document.activeElement as HTMLElement)?.closest?.('.cs-card') as HTMLElement | null;
    if (!cur) { all[0] && this.select(all[0].dataset.id!); return; }
    const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let best: HTMLElement | null = null, bs = Infinity;
    for (const e of all) { if (e === cur) continue; const q = e.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy; const main = ({ ArrowRight: dx, ArrowLeft: -dx, ArrowDown: dy, ArrowUp: -dy } as Record<string, number>)[dir]; const cross = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx); if (main <= 12) continue; const s = main + cross * 2.2; if (s < bs) { bs = s; best = e; } }
    if (best) { this.select(best.dataset.id!); best.scrollIntoView({ block: 'nearest' }); }
  }
}
