import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { PasswordHasher } from "@repo/core/application/ports/passwordHasher";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}

export const NodePasswordHasher: PasswordHasher = {
  async hash(password) {
    const salt = randomBytes(16).toString("hex");
    const key = await derive(password, salt);
    return `scrypt-v1:${salt}:${key.toString("hex")}`;
  },
  async verify(password, hash) {
    const [format, salt, encoded] = hash.split(":");
    const valid =
      format === "scrypt-v1" &&
      /^[0-9a-f]{32}$/.test(salt ?? "") &&
      /^[0-9a-f]{128}$/.test(encoded ?? "");
    const key = await derive(
      password,
      valid && salt ? salt : "00000000000000000000000000000000",
    );
    const expected =
      valid && encoded ? Buffer.from(encoded, "hex") : Buffer.alloc(64);
    return timingSafeEqual(key, expected) && valid;
  },
};
