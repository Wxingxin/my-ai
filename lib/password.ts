// lib/password.ts
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error("Password required");
  }
  const salt_rounds = SALT_ROUNDS || 10;

  return bcrypt.hash(password, salt_rounds);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  return bcrypt.compare(password, hash);
}
