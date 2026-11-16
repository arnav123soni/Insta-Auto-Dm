import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long");
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}
