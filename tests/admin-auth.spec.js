import { describe, expect, it } from 'vitest';

import {
  buildAdminPath,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '../lib/admin-auth.js';

describe('buildAdminPath', () => {
  it('builds a separate admin URL path from the configured segment', () => {
    expect(buildAdminPath('control-secret-42')).toBe('/control-secret-42');
  });
});

describe('admin session tokens', () => {
  it('creates and verifies a signed admin session token', async () => {
    const token = await createAdminSessionToken({
      username: 'mingyu',
      secret: 'super-secret-key',
      ttlSeconds: 3600,
      nowMs: 1700000000000,
    });

    const session = await verifyAdminSessionToken(token, 'super-secret-key', 1700000000000 + 1000);

    expect(session).toEqual({ username: 'mingyu' });
  });

  it('rejects an expired admin session token', async () => {
    const token = await createAdminSessionToken({
      username: 'mingyu',
      secret: 'super-secret-key',
      ttlSeconds: 1,
      nowMs: 1700000000000,
    });

    const session = await verifyAdminSessionToken(token, 'super-secret-key', 1700000000000 + 5000);

    expect(session).toBeNull();
  });
});
