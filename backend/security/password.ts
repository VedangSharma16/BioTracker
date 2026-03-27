import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || process.env.SESSION_SECRET || "biotracker-password-pepper";
const HASH_PREFIX = "pbkdf2_sha512";
const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 64;
const LEGACY_HASH_PATTERN = /^[A-Za-z0-9+/=]{44}$/;

function derivePasswordHash(username: string, password: string, salt: Buffer, iterations: number) {
  return pbkdf2Sync(
    username.toLowerCase() + ":" + password,
    Buffer.concat([salt, Buffer.from(PASSWORD_PEPPER)]),
    iterations,
    HASH_KEY_LENGTH,
    "sha512",
  );
}

function deriveLegacyHash(username: string, password: string) {
  return createHash("sha256")
    .update(username.toLowerCase() + ":" + password + ":" + PASSWORD_PEPPER)
    .digest("base64");
}

export function hashPassword(username: string, password: string) {
  const salt = randomBytes(16);
  const hash = derivePasswordHash(username, password, salt, HASH_ITERATIONS);
  return [HASH_PREFIX, String(HASH_ITERATIONS), salt.toString("base64"), hash.toString("base64")].join("$");
}

export function verifyPassword(username: string, password: string, storedPassword: string) {
  if (storedPassword.startsWith(HASH_PREFIX + "$") ) {
    const parts = storedPassword.split("$");
    const iterationText = parts[1];
    const saltText = parts[2];
    const hashText = parts[3];
    const iterations = Number(iterationText);

    if (!iterations || !saltText || !hashText) {
      return false;
    }

    try {
      const salt = Buffer.from(saltText, "base64");
      const expectedHash = Buffer.from(hashText, "base64");
      const actualHash = derivePasswordHash(username, password, salt, iterations);
      return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
    } catch {
      return false;
    }
  }

  if (LEGACY_HASH_PATTERN.test(storedPassword)) {
    const hashed = deriveLegacyHash(username, password);
    try {
      return timingSafeEqual(Buffer.from(hashed), Buffer.from(storedPassword));
    } catch {
      return false;
    }
  }

  return storedPassword === password;
}

export function looksHashed(password: string) {
  return password.startsWith(HASH_PREFIX + "$") || LEGACY_HASH_PATTERN.test(password);
}

export function generateTemporaryPassword() {
  return "BT-" + randomBytes(6).toString("hex");
}

