import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

import { marked } from 'marked';

import { isBlobConfigured, savePostRecord } from './blob-posts.js';
import { slugifyPostName } from './posts.js';

const DEFAULT_HTML_CSS = `:root {
  color-scheme: light;
  --bg: #f6f7fb;
  --surface: #ffffff;
  --text: #1f2937;
  --muted: #4b5563;
  --border: #e5e7eb;
  --accent: #2563eb;
  --code-bg: #0f172a;
  --code-text: #e5eefc;
  --inline-code-bg: #eef2ff;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: linear-gradient(180deg, #f8f9fc 0%, #f4f6fb 100%);
  color: var(--text);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.78;
}
.page { padding: 40px 20px 72px; }
.markdown-body {
  max-width: 820px;
  margin: 0 auto;
  background: var(--surface);
  border: 1px solid rgba(229, 231, 235, 0.9);
  border-radius: 20px;
  padding: 48px 56px;
  box-shadow: 0 10px 35px rgba(15, 23, 42, 0.06);
}
h1, h2, h3, h4, h5, h6 {
  color: #111827;
  line-height: 1.25;
  margin-top: 1.8em;
  margin-bottom: 0.7em;
  letter-spacing: -0.02em;
}
h1 { font-size: 2.2rem; margin-top: 0; }
h2 { font-size: 1.65rem; padding-bottom: 0.25em; border-bottom: 1px solid var(--border); }
h3 { font-size: 1.3rem; }
p, ul, ol, blockquote, table, pre { margin-top: 1em; margin-bottom: 1em; }
ul, ol { padding-left: 1.5em; }
li + li { margin-top: 0.35em; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
blockquote {
  margin-left: 0;
  padding: 0.9rem 1rem;
  border-left: 4px solid #93c5fd;
  background: #f8fbff;
  color: var(--muted);
  border-radius: 12px;
}
img { max-width: 100%; height: auto; border-radius: 14px; }
code {
  font-family: "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.92em;
}
p code, li code, td code {
  background: var(--inline-code-bg);
  color: #3730a3;
  padding: 0.18em 0.42em;
  border-radius: 8px;
}
pre {
  background: var(--code-bg);
  color: var(--code-text);
  padding: 1rem 1.1rem;
  border-radius: 16px;
  overflow-x: auto;
}
pre code { background: transparent; color: inherit; padding: 0; }
table {
  width: 100%;
  border-collapse: collapse;
  display: block;
  overflow-x: auto;
  white-space: nowrap;
  border: 1px solid var(--border);
  border-radius: 14px;
}
th, td {
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 0.9rem;
  text-align: left;
}
th { background: #f8fafc; color: #111827; }
tr:last-child td { border-bottom: 0; }
@media (max-width: 760px) {
  .page { padding: 18px 12px 40px; }
  .markdown-body { padding: 24px 18px; border-radius: 16px; }
  h1 { font-size: 1.8rem; }
  h2 { font-size: 1.4rem; }
}`;

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripSimpleFrontmatter(markdown) {
  const text = String(markdown || '');
  if (!text.startsWith('---\n')) {
    return text;
  }

  const endIndex = text.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return text;
  }

  return text.slice(endIndex + 5);
}

async function walkMarkdownFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      files.push(fullPath);
    }
  }

  return files;
}

async function findAvailableSlug(postsDir, baseSlug) {
  await mkdir(postsDir, { recursive: true });
  const entries = new Set(
    (await readdir(postsDir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.html')
      .map((entry) => basename(entry.name, '.html'))
  );

  if (!entries.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  while (entries.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

export async function findObsidianNoteByTitle(vaultPath, noteTitle) {
  const root = resolve(vaultPath);
  const wanted = String(noteTitle || '').trim();
  if (!wanted) {
    throw new Error('옵시디언 글 제목이 비어 있습니다.');
  }

  const files = await walkMarkdownFiles(root);
  const exactMatches = files.filter((filePath) => basename(filePath, '.md') === wanted);
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }
  if (exactMatches.length > 1) {
    throw new Error(`같은 제목의 노트가 여러 개 있습니다: ${wanted}`);
  }

  const lowerWanted = wanted.toLowerCase();
  const caseInsensitiveMatches = files.filter((filePath) => basename(filePath, '.md').toLowerCase() === lowerWanted);
  if (caseInsensitiveMatches.length === 1) {
    return caseInsensitiveMatches[0];
  }
  if (caseInsensitiveMatches.length > 1) {
    throw new Error(`대소문자만 다른 동명 노트가 여러 개 있습니다: ${wanted}`);
  }

  throw new Error(`옵시디언에서 제목을 찾지 못했습니다: ${wanted}`);
}

export function renderMarkdownToStandaloneHtml(markdown, noteTitle, publishedAt = null) {
  const title = String(noteTitle || 'Untitled').trim() || 'Untitled';
  const bodyMarkdown = stripSimpleFrontmatter(markdown);
  const bodyHtml = marked.parse(bodyMarkdown, {
    gfm: true,
    breaks: true,
  });
  const publishMeta = publishedAt ? `\n  <meta name="publish-date" content="${escapeHtml(publishedAt)}" />` : '';

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>${publishMeta}
  <style>${DEFAULT_HTML_CSS}</style>
</head>
<body>
  <main class="page">
    <article class="markdown-body">
${bodyHtml}
    </article>
  </main>
</body>
</html>
`;
}

export async function publishObsidianNoteTitle({ noteTitle, vaultPath, postsDir }) {
  const notePath = await findObsidianNoteByTitle(vaultPath, noteTitle);
  const markdown = await readFile(notePath, 'utf8');
  const noteStat = await stat(notePath);
  const publishedAt = noteStat.mtime.toISOString().slice(0, 10);
  const html = renderMarkdownToStandaloneHtml(markdown, noteTitle, publishedAt);
  const slug = await findAvailableSlug(postsDir, slugifyPostName(noteTitle));
  const destinationPath = join(postsDir, `${slug}.html`);

  await writeFile(destinationPath, html, 'utf8');

  if (isBlobConfigured()) {
    await savePostRecord({
      slug,
      title: noteTitle,
      publishedAt,
      html,
    });
  }

  return {
    slug,
    destinationPath,
    notePath,
    publishedAt,
  };
}
