import { z } from 'zod';
import { ConflictError } from './review';
import { writingModes } from './writing-mode';

// A content idea note owns the topic and sources; each channel note is one publishable post.
export const IDEA_TYPE = 'content-idea';
export const POST_TYPE = 'content-post';
export const ChannelSchema = z.enum(['linkedin', 'threads', 'instagram-card', 'instagram-reels', 'newsletter', 'shorts']);
export type Channel = z.infer<typeof ChannelSchema>;
export const channels = ChannelSchema.options;
export const PostStatusSchema = z.enum(['drafting', 'review', 'ready', 'scheduled', 'published', 'failed']);
export type PostStatus = z.infer<typeof PostStatusSchema>;
export const channelLabel = (channel: Channel) => writingModes[channel].label;

const FRONTMATTER = /^---\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/;
export function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  const match = FRONTMATTER.exec(text);
  return match ? { frontmatter: match[0], body: text.slice(match[0].length) } : { frontmatter: '', body: text };
}
// The workbench edits only the body. Frontmatter belongs to the content database and may change
// in Obsidian (status, schedule, media) while a draft is open, so it is kept from the current file.
export function replaceBody(current: string, expectedBody: string, nextBody: string): string {
  const { frontmatter, body } = splitFrontmatter(current);
  if (body !== expectedBody) throw new ConflictError('다른 창이나 앱에서 원고가 바뀌었습니다. 덮어쓰지 않았습니다. 파일에서 다시 불러오면 현재 작업 사본은 이력에 남습니다.');
  return frontmatter + nextBody;
}

type Value = string | string[] | null;
function yaml(fields: Record<string, Value>): string {
  // JSON strings are valid YAML scalars, which keeps quoting of titles and links safe.
  const lines = Object.entries(fields).map(([key, value]) =>
    value === null ? `${key}:` : Array.isArray(value) ? `${key}: ${value.length ? JSON.stringify(value) : '[]'}` : `${key}: ${JSON.stringify(value)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}
const today = (date: Date) => date.toLocaleDateString('sv-SE');
export function ideaNote(date = new Date()): string {
  return yaml({ type: IDEA_TYPE, status: 'active', sources: [], created: today(date) })
    + '\n## 핵심 아이디어\n\n\n## 소스\n\n\n## 메모\n\n';
}
export function postNote(ideaLink: string, channel: Channel, date = new Date()): string {
  return yaml({ type: POST_TYPE, idea: ideaLink, channel, status: 'drafting', created: today(date), scheduled: null, published_at: null, post_url: null, media: [] }) + '\n';
}

export function noteName(input: string): string {
  const name = input.trim().replace(/[\\/:*?"<>|#^[\]\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '');
  if (!name) throw new Error('노트 이름으로 쓸 수 있는 글자를 입력해 주세요.');
  return name;
}
export function postPath(ideaPath: string, channel: Channel, exists: (path: string) => boolean): string {
  const folder = ideaPath.includes('/') ? ideaPath.slice(0, ideaPath.lastIndexOf('/') + 1) : '';
  const base = `${folder}${ideaPath.split('/').at(-1)!.replace(/\.md$/i, '')} - ${channelLabel(channel)}`;
  for (let index = 1; index < 1000; index++) {
    const path = `${base}${index > 1 ? ` ${index}` : ''}.md`;
    if (!exists(path)) return path;
  }
  throw new Error('같은 채널의 콘텐츠가 너무 많습니다. 기존 노트 이름을 정리해 주세요.');
}
export function linkTarget(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^\s*\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]\s*$/.exec(value);
  return match ? match[1]!.trim() : null;
}
export function wikiLink(path: string): string {
  const target = path.replace(/\.md$/i, '');
  return `[[${target}|${target.split('/').at(-1)}]]`;
}
export function channelOf(frontmatter: Record<string, unknown> | undefined): Channel | null {
  if (frontmatter?.type !== POST_TYPE) return null;
  const parsed = ChannelSchema.safeParse(frontmatter.channel);
  return parsed.success ? parsed.data : null;
}

export function boardBase(folder: string): string {
  const inFolder = folder ? `\n    - 'file.inFolder(${JSON.stringify(folder)})'` : '';
  const columns = ['file.name', 'channel', 'status', 'idea', 'scheduled', 'published_at', 'post_url'].map(c => `      - ${c}`).join('\n');
  const view = (name: string, type: 'table' | 'cards', status?: string) =>
    `  - type: ${type}\n    name: ${name}\n${status ? `    filters:\n      and:\n        - 'status == "${status}"'\n` : ''}    order:\n${columns}`;
  return [
    `filters:\n  and:\n    - 'type == "${POST_TYPE}"'${inFolder}`,
    'views:',
    view('전체 콘텐츠', 'table'),
    view('작성 중', 'table', 'drafting'),
    view('발행 대기', 'table', 'ready'),
    view('발행 완료', 'table', 'published'),
  ].join('\n') + '\n';
}
