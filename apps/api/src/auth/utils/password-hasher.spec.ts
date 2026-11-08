import { hashPassword, verifyPassword } from './password-hasher.js';

describe('password hashing', () => {
  it('creates a salted hash and verifies only the matching password', async () => {
    const firstHash = await hashPassword('a-long-password');
    const secondHash = await hashPassword('a-long-password');

    expect(firstHash).not.toBe(secondHash);
    await expect(verifyPassword('a-long-password', firstHash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword('another-password', firstHash)).resolves.toBe(
      false,
    );
  });

  it('rejects malformed or unsupported hash formats', async () => {
    await expect(verifyPassword('password', 'not-a-hash')).resolves.toBe(false);
    await expect(
      verifyPassword('password', 'scrypt$v2$' + 'a'.repeat(32) + '$' + 'b'.repeat(128)),
    ).resolves.toBe(false);
  });
});
