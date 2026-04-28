export const SITE_URL = 'https://html-vercel-blog.vercel.app';

export function buildPostUrl(slug) {
  return `${SITE_URL}/posts/${encodeURIComponent(String(slug || ''))}`;
}

export function buildDisplayedPostUrl(url) {
  try {
    return decodeURI(String(url || ''));
  } catch {
    return String(url || '');
  }
}
