import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'blog_admin_session';

function toBase64Url(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function buildAdminPath(routeSegment) {
  return `/${String(routeSegment || '').replace(/^\/+/, '')}`;
}

export async function createAdminSessionToken({ username, secret, ttlSeconds = 60 * 60 * 12, nowMs = Date.now() }) {
  const payload = JSON.stringify({ username, exp: nowMs + ttlSeconds * 1000 });
  const encoded = toBase64Url(payload);
  const signature = signPayload(encoded, secret);
  return `${encoded}.${signature}`;
}

export async function verifyAdminSessionToken(token, secret, nowMs = Date.now()) {
  if (!token || !secret || !String(token).includes('.')) {
    return null;
  }

  const [encoded, signature] = String(token).split('.', 2);
  const expected = signPayload(encoded, secret);

  const actualBuffer = Buffer.from(signature || '', 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded));
    if (!payload?.username || !payload?.exp || payload.exp <= nowMs) {
      return null;
    }
    return { username: payload.username };
  } catch {
    return null;
  }
}

export function getAdminRuntimeConfig() {
  return {
    routeSegment: process.env.ADMIN_ROUTE_SEGMENT || '',
    username: process.env.BLOG_ADMIN_USERNAME || '',
    password: process.env.BLOG_ADMIN_PASSWORD || '',
    secret: process.env.BLOG_ADMIN_SECRET || '',
  };
}

export async function readAdminSession() {
  const { secret } = getAdminRuntimeConfig();
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token, secret);
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}
