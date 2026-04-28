import { del, list, put } from '@vercel/blob';

const POSTS_INDEX_PATH = 'posts/index.json';
const POSTS_HTML_PREFIX = 'posts/html/';

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function sortPostRecords(records) {
  return [...(records || [])].sort((a, b) => {
    const aDate = a.publishedAt || '';
    const bDate = b.publishedAt || '';
    return bDate.localeCompare(aDate) || a.slug.localeCompare(b.slug);
  });
}

export function upsertPostRecord(records, nextRecord) {
  const filtered = (records || []).filter((record) => record.slug !== nextRecord.slug);
  return sortPostRecords([...filtered, nextRecord]);
}

export function deletePostRecord(records, slug) {
  return (records || []).filter((record) => record.slug !== slug);
}

export function findPostRecordBySlug(records, slug) {
  const decodedSlug = decodeURIComponent(String(slug || ''));
  return (records || []).find((record) => record.slug === slug || record.slug === decodedSlug) || null;
}

function getToken(token) {
  return token || process.env.BLOB_READ_WRITE_TOKEN;
}

function getHtmlPathname(slug) {
  return `${POSTS_HTML_PREFIX}${slug}.html`;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch blob JSON: ${response.status}`);
  }
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch blob text: ${response.status}`);
  }
  return response.text();
}

export async function readStoredPostsState({ token } = {}) {
  const resolvedToken = getToken(token);
  if (!resolvedToken) {
    return { exists: false, posts: [] };
  }

  const result = await list({ prefix: POSTS_INDEX_PATH, limit: 1, token: resolvedToken });
  if (!result.blobs.length) {
    return { exists: false, posts: [] };
  }

  const data = await fetchJson(result.blobs[0].url);
  return {
    exists: true,
    posts: sortPostRecords(Array.isArray(data) ? data : []),
  };
}

export async function listStoredPosts(options = {}) {
  return (await readStoredPostsState(options)).posts;
}

async function saveStoredPostsIndex(records, { token } = {}) {
  const resolvedToken = getToken(token);
  return put(POSTS_INDEX_PATH, JSON.stringify(sortPostRecords(records), null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    token: resolvedToken,
  });
}

export async function savePostRecord(post, { token } = {}) {
  const resolvedToken = getToken(token);
  const htmlPathname = getHtmlPathname(post.slug);
  const uploaded = await put(htmlPathname, post.html, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'text/html; charset=utf-8',
    token: resolvedToken,
  });

  const state = await readStoredPostsState({ token: resolvedToken });
  const nextRecord = {
    slug: post.slug,
    title: post.title,
    publishedAt: post.publishedAt || null,
    htmlUrl: uploaded.url,
    htmlPathname,
  };
  const records = upsertPostRecord(state.posts, nextRecord);
  await saveStoredPostsIndex(records, { token: resolvedToken });
  return nextRecord;
}

export async function deleteStoredPost(slug, { token } = {}) {
  const resolvedToken = getToken(token);
  const state = await readStoredPostsState({ token: resolvedToken });
  const existing = findPostRecordBySlug(state.posts, slug);
  if (!existing) {
    return { deleted: false, posts: state.posts };
  }

  if (existing.htmlPathname) {
    await del(existing.htmlPathname, { token: resolvedToken });
  }

  const records = deletePostRecord(state.posts, existing.slug);
  await saveStoredPostsIndex(records, { token: resolvedToken });
  return { deleted: true, posts: records };
}

export async function loadStoredPostBySlug(slug, { token } = {}) {
  const resolvedToken = getToken(token);
  const state = await readStoredPostsState({ token: resolvedToken });
  const record = findPostRecordBySlug(state.posts, slug);
  if (!record) {
    return null;
  }

  const html = await fetchText(record.htmlUrl);
  return {
    slug: record.slug,
    title: record.title,
    publishedAt: record.publishedAt,
    html,
  };
}
