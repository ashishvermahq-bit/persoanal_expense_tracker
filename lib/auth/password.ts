import "server-only";
import bcrypt from "bcryptjs";

const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hash of a dummy password, compared against when the email is unknown so that
 * login timing does not reveal whether an account exists.
 */
let dummyHashPromise: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  dummyHashPromise ??= bcrypt.hash("not-a-real-password-" + Math.random(), COST);
  return dummyHashPromise;
}
