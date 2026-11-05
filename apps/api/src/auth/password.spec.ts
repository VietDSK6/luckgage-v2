import { describe, expect, it } from 'vitest';

import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('hashes with Argon2id and verifies the original password', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, 'correct horse battery staple')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong password')).resolves.toBe(false);
  });

  it('keeps the dummy hash valid for timing-safe unknown-account checks', async () => {
    await expect(verifyPassword(DUMMY_PASSWORD_HASH, 'not the password')).resolves.toBe(false);
  });
});
