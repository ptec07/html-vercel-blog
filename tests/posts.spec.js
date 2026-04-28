import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  extractPostMeta,
  importHtmlFile,
  listPosts,
  loadPostBySlug,
  slugifyPostName,
} from '../lib/posts.js';

describe('slugifyPostName', () => {
  it('keeps Korean text and normalizes spaces/punctuation into dashes', () => {
    expect(slugifyPostName('  깔끔한 HTML 포스트!  ')).toBe('깔끔한-html-포스트');
  });
});

describe('extractPostMeta', () => {
  it('prefers the title tag and publish-date meta tag from html', () => {
    const meta = extractPostMeta(`<!doctype html><html><head><title>테스트 글</title><meta name="publish-date" content="2026-04-24" /></head><body><h1>무시될 제목</h1></body></html>`, 'fallback');

    expect(meta.title).toBe('테스트 글');
    expect(meta.publishedAt).toBe('2026-04-24');
  });

  it('falls back to first h1 and slug when title is missing', () => {
    const meta = extractPostMeta('<article><h1>첫 제목</h1><p>본문</p></article>', 'fallback-slug');

    expect(meta.title).toBe('첫 제목');
    expect(meta.publishedAt).toBeNull();
  });
});

describe('listPosts and loadPostBySlug', () => {
  it('lists html posts newest-first and loads a post by slug', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'html-blog-'));
    const postsDir = path.join(root, 'content', 'posts');
    mkdirSync(postsDir, { recursive: true });

    writeFileSync(
      path.join(postsDir, 'older-post.html'),
      '<html><head><title>오래된 글</title><meta name="publish-date" content="2026-04-01" /></head><body><p>old</p></body></html>',
      'utf8'
    );
    writeFileSync(
      path.join(postsDir, 'newer-post.html'),
      '<html><head><title>최신 글</title><meta name="publish-date" content="2026-04-20" /></head><body><p>new</p></body></html>',
      'utf8'
    );

    const posts = await listPosts(postsDir);

    expect(posts.map((post) => post.slug)).toEqual(['newer-post', 'older-post']);
    expect(posts[0].title).toBe('최신 글');

    const post = await loadPostBySlug(postsDir, 'older-post');
    expect(post.title).toBe('오래된 글');
    expect(post.html).toContain('<p>old</p>');
  });
});

describe('importHtmlFile', () => {
  it('copies html into the content directory without overwriting an existing slug', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'html-blog-import-'));
    const importsDir = path.join(root, 'imports');
    const postsDir = path.join(root, 'content', 'posts');
    mkdirSync(importsDir, { recursive: true });
    mkdirSync(postsDir, { recursive: true });

    const sourcePath = path.join(importsDir, '깔끔한 HTML 포스트.html');
    writeFileSync(sourcePath, '<html><head><title>깔끔한 HTML 포스트</title></head><body><h1>깔끔한 HTML 포스트</h1></body></html>', 'utf8');
    writeFileSync(path.join(postsDir, '깔끔한-html-포스트.html'), '<html><body>existing</body></html>', 'utf8');

    const imported = await importHtmlFile(sourcePath, postsDir);

    expect(imported.slug).toBe('깔끔한-html-포스트-1');
    expect(imported.destinationPath.endsWith('깔끔한-html-포스트-1.html')).toBe(true);
    expect(readFileSync(imported.destinationPath, 'utf8')).toContain('깔끔한 HTML 포스트');
  });
});
