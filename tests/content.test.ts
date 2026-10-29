import { describe, expect, it } from 'vitest';
import { boardBase, channelOf, ideaNote, linkTarget, noteName, postNote, postPath, replaceBody, splitFrontmatter, wikiLink } from '../src/domain/content';
import { ConflictError } from '../src/domain/review';
import { writingModes } from '../src/domain/writing-mode';
import { buildPrompt } from '../src/domain/prompt';
import { createProject } from '../src/domain/model';

describe('content notes', () => {
  it('separates frontmatter from the draft body', () => {
    const text = '---\nstatus: "drafting"\n---\n본문 첫 줄\n---\n구분선 뒤';
    expect(splitFrontmatter(text)).toEqual({ frontmatter: '---\nstatus: "drafting"\n---\n', body: '본문 첫 줄\n---\n구분선 뒤' });
    expect(splitFrontmatter('본문만 있음')).toEqual({ frontmatter: '', body: '본문만 있음' });
    expect(splitFrontmatter('---\n---\n본문').body).toBe('본문');
  });
  it('saves the body while keeping frontmatter edited in Obsidian', () => {
    const current = '---\nstatus: "ready"\n---\n초안';
    expect(replaceBody(current, '초안', '고친 원고')).toBe('---\nstatus: "ready"\n---\n고친 원고');
    expect(() => replaceBody(current, '다른 초안', '고친 원고')).toThrow(ConflictError);
  });
  it('creates idea and post notes the workbench and Bases can read', () => {
    const idea = ideaNote(new Date(2026, 9, 29));
    expect(idea).toContain('type: "content-idea"');
    expect(idea).toContain('created: "2026-10-29"');
    const post = postNote(wikiLink('콘텐츠/AI 글쓰기/AI 글쓰기.md'), 'instagram-card', new Date(2026, 9, 29));
    expect(post).toContain('idea: "[[콘텐츠/AI 글쓰기/AI 글쓰기|AI 글쓰기]]"');
    expect(post).toContain('channel: "instagram-card"');
    expect(post).toContain('media: []');
    expect(splitFrontmatter(post).body).toBe('\n');
  });
  it('reads the channel only from post notes', () => {
    expect(channelOf({ type: 'content-post', channel: 'threads' })).toBe('threads');
    expect(channelOf({ type: 'content-post', channel: 'tiktok' })).toBeNull();
    expect(channelOf({ type: 'content-idea', channel: 'threads' })).toBeNull();
    expect(channelOf(undefined)).toBeNull();
  });
  it('resolves wiki links stored in frontmatter', () => {
    expect(linkTarget('[[콘텐츠/AI 글쓰기/AI 글쓰기|AI 글쓰기]]')).toBe('콘텐츠/AI 글쓰기/AI 글쓰기');
    expect(linkTarget('[[아이디어#소스]]')).toBe('아이디어');
    expect(linkTarget('아이디어')).toBeNull();
    expect(linkTarget(['[[a]]'])).toBeNull();
  });
  it('names post notes next to their idea without overwriting', () => {
    const taken = new Set(['콘텐츠/AI/AI - LinkedIn.md']);
    expect(postPath('콘텐츠/AI/AI.md', 'linkedin', p => taken.has(p))).toBe('콘텐츠/AI/AI - LinkedIn 2.md');
    expect(postPath('AI.md', 'shorts', () => false)).toBe('AI - 쇼츠.md');
  });
  it('cleans idea titles for file names', () => {
    expect(noteName('  AI: 글쓰기/워크플로?  ')).toBe('AI 글쓰기 워크플로');
    expect(() => noteName(' /?: ')).toThrow();
  });
  it('builds a board limited to post notes in the content folder', () => {
    const base = boardBase('콘텐츠');
    expect(base).toContain(`'type == "content-post"'`);
    expect(base).toContain(`'file.inFolder("콘텐츠")'`);
    expect(base).toContain(`'status == "ready"'`);
    expect(boardBase('')).not.toContain('inFolder');
  });
  it('gives every channel its own guidance in the prompt', () => {
    for (const mode of ['threads', 'instagram-card', 'instagram-reels', 'newsletter', 'shorts'] as const) {
      expect(writingModes[mode].labels).toHaveLength(7);
      const prompt = buildPrompt(createProject('a.md', '초안', mode), { version: 1, items: [] }, 'review', '검토', false);
      expect(prompt).toContain(writingModes[mode].guidance);
    }
  });
});
