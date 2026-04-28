import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { readFile } from 'node:fs/promises';

import PostUrlBox from '../components/post-url-box.jsx';
import { buildDisplayedPostUrl, buildPostUrl } from '../lib/site.js';

describe('buildPostUrl', () => {
  it('builds a production post URL from a slug', () => {
    expect(buildPostUrl('introducing-gpt-5-5')).toBe('https://html-vercel-blog.vercel.app/posts/introducing-gpt-5-5');
  });

  it('builds a Korean-readable display URL from an encoded URL', () => {
    expect(buildDisplayedPostUrl('https://html-vercel-blog.vercel.app/posts/introducing-gpt-5-5-%EC%8B%A4%EC%A0%84-%EC%97%85%EB%AC%B4%EC%9A%A9-%EC%83%88-%EC%A7%80%EB%8A%A5-%EA%B3%84%EC%B8%B5')).toBe(
      'https://html-vercel-blog.vercel.app/posts/introducing-gpt-5-5-실전-업무용-새-지능-계층'
    );
  });
});

describe('PostUrlBox', () => {
  it('renders the visible URL and an icon-only copy button', () => {
    const html = renderToStaticMarkup(
      createElement(PostUrlBox, {
        postUrl: 'https://html-vercel-blog.vercel.app/posts/demo',
        displayUrl: 'https://html-vercel-blog.vercel.app/posts/데모',
      })
    );

    expect(html).toContain('URL');
    expect(html).toContain('aria-label="URL 복사"');
    expect(html).toContain('post-url-copy-icon');
    expect(html).toContain('https://html-vercel-blog.vercel.app/posts/데모');
  });

  it('contains toast feedback text for successful copy', () => {
    const source = readFileSync(new URL('../components/post-url-box.jsx', import.meta.url), 'utf8');

    expect(source).toContain('복사 완료');
    expect(source).toContain('post-url-toast');
  });
});

describe('homepage hero content', () => {
  it('uses the simplified Mingyu blog title in the header box', async () => {
    const page = await readFile(new URL('../app/page.jsx', import.meta.url), 'utf8');

    expect(page).toContain('Mingyu의 Simple Blog');
  });

  it('uses the requested Korean subtitle copy', async () => {
    const page = await readFile(new URL('../app/page.jsx', import.meta.url), 'utf8');

    expect(page).toContain('일상의 사소한 정보를 기록하는 나만의 심플한 블로그');
  });
});

describe('mobile post styles', () => {
  it('makes the content box slightly wider, keeps URLs contained, and adds a table edge-fade hint', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

    expect(css).toContain('.post-url-box');
    expect(css).toContain('.post-url-copy');
    expect(css).toContain('padding: 10px 4px 24px;');
    expect(css).toContain('width: calc(100% + 16px);');
    expect(css).toContain('margin-left: -8px;');
    expect(css).toContain('max-width: 100%;');
    expect(css).toContain('overflow: hidden;');
    expect(css).toContain('.post-url-toast');
    expect(css).toContain('-webkit-overflow-scrolling: touch;');
    expect(css).toContain('scrollbar-width: thin;');
    expect(css).toContain('.embedded-post table::after');
    expect(css).toContain('linear-gradient(90deg, rgba(248, 251, 255, 0) 0%, rgba(248, 251, 255, 0.96) 100%)');
    expect(css).toContain('font-size: 1.04rem;');
    expect(css).toContain('line-height: 1.92;');
  });
});
