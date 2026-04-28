import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { extname, basename, join } from 'node:path';

import { isBlobConfigured, loadStoredPostBySlug, readStoredPostsState } from './blob-posts.js';

function decodeBasicEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export function slugifyPostName(input) {
  const normalized = String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]+/gu, ' ')
    .replace(/[\s_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `post-${Date.now()}`;
}

export function extractPostMeta(html, fallbackSlug = 'post') {
  const source = String(html || '');
  const titleMatch = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Match = source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const publishDateMatch = source.match(/<meta[^>]+name=["']publish-date["'][^>]+content=["']([^"']+)["'][^>]*>/i);

  const rawTitle = titleMatch?.[1] || h1Match?.[1] || fallbackSlug;
  const cleanedTitle = decodeBasicEntities(rawTitle.replace(/<[^>]+>/g, '')) || fallbackSlug;

  return {
    title: cleanedTitle,
    publishedAt: publishDateMatch?.[1] || null,
  };
}

async function listLocalPosts(postsDir) {
  const entries = await readdir(postsDir, { withFileTypes: true });
  const htmlFiles = entries.filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.html');

  const posts = await Promise.all(
    htmlFiles.map(async (entry) => {
      const filePath = join(postsDir, entry.name);
      const html = await readFile(filePath, 'utf8');
      const slug = basename(entry.name, '.html');
      const meta = extractPostMeta(html, slug);

      return {
        slug,
        title: meta.title,
        publishedAt: meta.publishedAt,
      };
    })
  );

  return posts.sort((a, b) => {
    const aDate = a.publishedAt || '';
    const bDate = b.publishedAt || '';
    return bDate.localeCompare(aDate) || a.slug.localeCompare(b.slug);
  });
}

async function loadLocalPostBySlug(postsDir, slug) {
  const safeSlug = decodeURIComponent(String(slug || ''));
  const filePath = join(postsDir, `${safeSlug}.html`);
  const html = await readFile(filePath, 'utf8');
  const meta = extractPostMeta(html, safeSlug);

  return {
    slug: safeSlug,
    title: meta.title,
    publishedAt: meta.publishedAt,
    html,
  };
}

export async function listPosts(postsDir) {
  if (isBlobConfigured()) {
    const state = await readStoredPostsState();
    if (state.exists) {
      return state.posts;
    }
  }

  return listLocalPosts(postsDir);
}

export async function loadPostBySlug(postsDir, slug) {
  if (isBlobConfigured()) {
    const state = await readStoredPostsState();
    if (state.exists) {
      const post = await loadStoredPostBySlug(slug);
      if (post) {
        return post;
      }
      throw new Error('Post not found in blob store');
    }
  }

  return loadLocalPostBySlug(postsDir, slug);
}

export async function findAvailableSlug(postsDir, baseSlug) {
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

export async function importHtmlFile(sourcePath, postsDir) {
  await mkdir(postsDir, { recursive: true });
  const baseSlug = slugifyPostName(basename(sourcePath, extname(sourcePath)));
  const slug = await findAvailableSlug(postsDir, baseSlug);
  const destinationPath = join(postsDir, `${slug}.html`);

  await copyFile(sourcePath, destinationPath);

  return {
    slug,
    destinationPath,
  };
}

export function getDefaultPostsDir() {
  return join(process.cwd(), 'content', 'posts');
}
