import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { findObsidianNoteByTitle, publishObsidianNoteTitle, renderMarkdownToStandaloneHtml } from '../lib/tbg.js';

describe('findObsidianNoteByTitle', () => {
  it('finds a note anywhere in the vault by exact filename title', async () => {
    const vaultDir = mkdtempSync(path.join(tmpdir(), 'obsidian-vault-'));
    const nested = path.join(vaultDir, '00. Inbox');
    mkdirSync(nested, { recursive: true });
    const notePath = path.join(nested, '테스트 노트 제목.md');
    writeFileSync(notePath, '# 테스트 노트 제목\n\n본문', 'utf8');

    const found = await findObsidianNoteByTitle(vaultDir, '테스트 노트 제목');

    expect(found).toBe(notePath);
  });
});

describe('renderMarkdownToStandaloneHtml', () => {
  it('renders markdown into a standalone readable html document', () => {
    const html = renderMarkdownToStandaloneHtml('# 문서 제목\n\n본문 **강조**', '문서 제목');

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>문서 제목</title>');
    expect(html).toContain('<h1>문서 제목</h1>');
    expect(html).toContain('<strong>강조</strong>');
    expect(html).toContain('markdown-body');
  });

  it('preserves single-line breaks inside paragraphs as br tags', () => {
    const html = renderMarkdownToStandaloneHtml('첫 줄\n둘째 줄', '개행 테스트');

    expect(html).toContain('첫 줄<br>');
    expect(html).toContain('둘째 줄');
  });
});

describe('publishObsidianNoteTitle', () => {
  it('publishes a note into the blog content directory without overwriting an existing slug', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'tbg-publish-'));
    const vaultDir = path.join(root, 'vault');
    const inboxDir = path.join(vaultDir, '00. Inbox');
    const postsDir = path.join(root, 'blog', 'content', 'posts');
    mkdirSync(inboxDir, { recursive: true });
    mkdirSync(postsDir, { recursive: true });

    writeFileSync(
      path.join(inboxDir, '깔끔한 HTML 포스트.md'),
      '# 깔끔한 HTML 포스트\n\n블로그 배포 테스트',
      'utf8'
    );
    writeFileSync(path.join(postsDir, '깔끔한-html-포스트.html'), '<html><body>existing</body></html>', 'utf8');

    const published = await publishObsidianNoteTitle({
      noteTitle: '깔끔한 HTML 포스트',
      vaultPath: vaultDir,
      postsDir,
    });

    expect(published.slug).toBe('깔끔한-html-포스트-1');
    expect(published.destinationPath.endsWith('깔끔한-html-포스트-1.html')).toBe(true);
    expect(readFileSync(published.destinationPath, 'utf8')).toContain('블로그 배포 테스트');
    expect(readFileSync(published.destinationPath, 'utf8')).toContain('<title>깔끔한 HTML 포스트</title>');
  });
});
