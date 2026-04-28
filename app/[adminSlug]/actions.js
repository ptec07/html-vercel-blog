'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ADMIN_SESSION_COOKIE,
  buildAdminPath,
  createAdminSessionToken,
  getAdminCookieOptions,
  getAdminRuntimeConfig,
  readAdminSession,
} from '../../lib/admin-auth.js';
import { deleteStoredPost, savePostRecord } from '../../lib/blob-posts.js';
import { slugifyPostName } from '../../lib/posts.js';

function getAdminPathOrThrow() {
  const config = getAdminRuntimeConfig();
  if (!config.routeSegment || !config.username || !config.password || !config.secret) {
    throw new Error('Admin environment variables are not configured.');
  }
  return { config, path: buildAdminPath(config.routeSegment) };
}

async function assertAdminSession(path) {
  const session = await readAdminSession();
  if (!session) {
    redirect(`${path}?error=auth`);
  }
  return session;
}

export async function loginAdminAction(formData) {
  const { config, path } = getAdminPathOrThrow();
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

  if (username !== config.username || password !== config.password) {
    redirect(`${path}?error=invalid`);
  }

  const token = await createAdminSessionToken({
    username,
    secret: config.secret,
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, getAdminCookieOptions());
  redirect(`${path}?message=welcome`);
}

export async function logoutAdminAction() {
  const { path } = getAdminPathOrThrow();
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect(`${path}?message=logout`);
}

export async function savePostAction(formData) {
  const { path } = getAdminPathOrThrow();
  await assertAdminSession(path);

  const originalSlug = String(formData.get('originalSlug') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const html = String(formData.get('html') || '').trim();
  const publishedAt = String(formData.get('publishedAt') || '').trim() || null;
  const requestedSlug = String(formData.get('slug') || '').trim();
  const slug = slugifyPostName(requestedSlug || title);

  if (!title || !html) {
    redirect(`${path}?error=missing`);
  }

  if (originalSlug && originalSlug !== slug) {
    await deleteStoredPost(originalSlug);
  }

  await savePostRecord({
    slug,
    title,
    publishedAt,
    html,
  });

  redirect(`${path}?message=saved&slug=${encodeURIComponent(slug)}`);
}

export async function deletePostAction(formData) {
  const { path } = getAdminPathOrThrow();
  await assertAdminSession(path);

  const slug = String(formData.get('slug') || '').trim();
  if (!slug) {
    redirect(`${path}?error=missing`);
  }

  await deleteStoredPost(slug);
  redirect(`${path}?message=deleted`);
}
