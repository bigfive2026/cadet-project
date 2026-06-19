import bcrypt from "bcryptjs";

/**
 * 비밀번호 해시/검증 (SPEC-AUTH).
 * bcryptjs(pure JS) — Edge/Node 런타임 제약 없이 동작.
 * Auth.js Credentials authorize 콜백에서 사용한다.
 */
const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
