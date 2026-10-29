import assert from 'node:assert/strict';
import { newNoteText, parseNote, ideaSections, replaceSection, serializeCard, parseCard, fileNameFrom, setFrontmatterField, type Card } from '../src/note.ts';

let t = newNoteText({ id: 'abc', message: '퇴근길의 작은 친절이 하루를 바꾼다', start: '메시지' });
let p = parseNote(t)!;
assert.equal(p.idea.message, '퇴근길의 작은 친절이 하루를 바꾼다');
assert.equal(p.idea.status, '후보');
assert.equal(p.idea.id, 'abc');

// 카드 왕복: 제목처럼 보이는 줄, 목록처럼 보이는 줄, 숨은 주석
const tricky: Card = { id: 'z1', type: 'memo', color: 'pink', headline: '', summary: '## 제목처럼 보이는 줄\n- 목록처럼\n<!--cs:zzzzzz-->\n\n끝' };
const back = parseCard(serializeCard(tricky))!;
assert.equal(back.summary, tricky.summary);

// 저장: 사용자 소유 영역과 알 수 없는 섹션은 그대로
p.idea.cards.push({ id: 'c1', type: 'research', color: 'blue', headline: '낯선 사람의 인사', summary: '요약 한 줄\n둘째 줄', source: { name: '예시', url: 'https://example.com/a' }, why: '친절' }, tricky);
p.idea.board.order = ['c1', 'z1']; p.idea.board.pinned = ['c1']; p.idea.board.links = [['c1', 'z1']];
const withUser = t.replace('## 초안\n', '## 초안\n내가 쓴 글 ## 아님\n\n## 내 메모\n그대로\n');
const s = ideaSections(p.idea);
let out = replaceSection(replaceSection(replaceSection(withUser, '메시지', s.message), '카드', s.cards), '판 배치', s.board);
const q = parseNote(out)!;
assert.equal(q.idea.cards.length, 2);
assert.deepEqual(q.idea.board.pinned, ['c1']);
assert.deepEqual(q.idea.board.links, [['c1', 'z1']]);
assert.equal(q.idea.cards[0].summary, '요약 한 줄\n둘째 줄');
assert.ok(out.includes('## 초안\n내가 쓴 글 ## 아님\n\n## 내 메모\n그대로\n'), '사용자 영역 보존');
// 두 번 저장해도 모양이 변하지 않는다
const out2 = replaceSection(replaceSection(replaceSection(out, '메시지', s.message), '카드', s.cards), '판 배치', s.board);
assert.equal(out2, out);

// 손상된 카드는 읽을 수 없는 부분으로 남고 원문이 그대로 저장된다
const broken = out.replace('- 종류: 조사\n', '');
const bp = parseNote(broken)!;
assert.equal(bp.idea.unreadable.length, 1); assert.equal(bp.idea.cards.length, 1);
const sb = ideaSections(bp.idea);
assert.ok(replaceSection(broken, '카드', sb.cards).includes(bp.idea.unreadable[0].raw));

// 섹션이 없는 노트에도 끼워 넣는다
const bare = '---\ncontent-studio: idea\nformat: 1\nid: x\n---\n## 초안\n내 글\n';
const ins = replaceSection(bare, '카드', '## 카드\n');
assert.ok(ins.indexOf('## 카드') < ins.indexOf('## 초안') && ins.endsWith('내 글\n'));
assert.equal(parseNote('---\ntitle: a\n---\nx'), null);
assert.equal(setFrontmatterField(t, '단계', '후킹').includes('단계: 후킹'), true);
assert.equal(fileNameFrom('  왜 우리는/월요일마다: 결심을? '), '왜 우리는월요일마다 결심을');
assert.match(fileNameFrom('///'), /^새 아이디어 \d{4}-\d\d-\d\d \d\d-\d\d$/);
console.log('note.test: ok');

// 병합
import { mergeIdeas, type Idea } from '../src/note.ts';
const mk = (cards: Card[], order = cards.map(c => c.id)): Idea => ({ id: 'i', message: 'm', status: '후보', cards, unreadable: [], board: { order, pinned: [], archived: [], links: [] } });
const A: Card = { id: 'a', type: 'memo', color: 'pink', headline: 'A', summary: 'a' }, B: Card = { id: 'b', type: 'memo', color: 'pink', headline: 'B', summary: 'b' };
const base = mk([A, B]);
// ① 서로 다른 카드를 양쪽에서 고치면 둘 다 남는다
let r = mergeIdeas(base, mk([{ ...A, summary: 'a2' }, B]), mk([A, { ...B, summary: 'b2' }]));
assert.deepEqual(r.idea.cards.map(c => c.summary), ['a2', 'b2']);
// ② 같은 카드를 양쪽에서 고치면 디스크(편집기)가 남고 알린다
r = mergeIdeas(base, mk([{ ...A, summary: 'mine' }, B]), mk([{ ...A, summary: 'disk' }, B]));
assert.equal(r.idea.cards[0].summary, 'disk'); assert.equal(r.conflicts.length, 1);
// ③ 디스크에서 지운 카드를 내가 고쳐도 삭제가 유지된다
r = mergeIdeas(base, mk([{ ...A, summary: 'mine' }, B]), mk([B]));
assert.deepEqual(r.idea.cards.map(c => c.id), ['b']);
// ④ 편집기에서 순서를 바꿨고 나는 순서를 안 건드렸으면 편집기 순서가 유지된다
r = mergeIdeas(base, mk([{ ...A, summary: 'a2' }, B]), mk([B, A], ['b', 'a']));
assert.deepEqual(r.idea.board.order, ['b', 'a']);
// 내가 만든 새 카드는 남는다
const N: Card = { id: 'n', type: 'memo', color: 'pink', headline: '', summary: 'new' };
r = mergeIdeas(base, mk([A, B, N]), mk([A, B]));
assert.deepEqual(r.idea.cards.map(c => c.id), ['a', 'b', 'n']); assert.deepEqual(r.idea.board.order, ['a', 'b', 'n']);
console.log('merge.test: ok');
