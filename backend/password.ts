import { createHash, timingSafeEqual } from "crypto";

const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || process.env.SESSION_SECRET || "biotracker-password-pepper";

function digest(username: string, password: string) {
  return createHash("sha256")
    .update(`${username.toLowerCase()}:${password}:${PASSWORD_PEPPER}`)
    .digest("base64");
}

export function hashPassword(username: string, password: string) {
  return digest(username, password);
}

export function verifyPassword(username: string, password: string, storedPassword: string) {
  const hashed = digest(username, password);

  try {
    return timingSafeEqual(Buffer.from(hashed), Buffer.from(storedPassword));
  } catch {
    return false;
  }
}

export function looksHashed(password: string) {
  return /^[A-Za-z0-9+/=]{44}$/.test(password);
}

export function generateTemporaryPassword() {
  return Math.random().toString(36).slice(-10) + "A1";
}
