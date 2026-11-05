import argon2 from 'argon2';

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$W0DmJbiEb4GWzc52I/5QsQ$voerPpczUW/bNODynAC/zw5UcgiWgjnCUuqTnGewO2Q';

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
