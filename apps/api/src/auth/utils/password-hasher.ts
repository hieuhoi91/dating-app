import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';

const SCRYPT_COST = 32768;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const SCRYPT_PREFIX = 'scrypt$v1';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await deriveKey(password, salt, SCRYPT_KEY_LENGTH);

  return [
    SCRYPT_PREFIX,
    salt.toString('hex'),
    hash.toString('hex'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, version, saltHex, hashHex, ...extra] = storedHash.split('$');
  if (
    algorithm !== 'scrypt' ||
    version !== 'v1' ||
    extra.length > 0 ||
    !saltHex ||
    !hashHex ||
    !/^[0-9a-f]{32}$/i.test(saltHex) ||
    !/^[0-9a-f]{128}$/i.test(hashHex)
  ) {
    return false;
  }

  const expectedHash = Buffer.from(hashHex, 'hex');
  const actualHash = await deriveKey(
    password,
    Buffer.from(saltHex, 'hex'),
    expectedHash.length,
  );

  return timingSafeEqual(actualHash, expectedHash);
}

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      keyLength,
      {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}
