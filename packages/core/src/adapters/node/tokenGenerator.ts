import { createHash, randomBytes } from "node:crypto";
import type { TokenGenerator } from "@repo/core/application/ports/tokenGenerator";

export const NodeTokenGenerator: TokenGenerator = {
  generate: () => randomBytes(32).toString("base64url"),
  hash: (token) => createHash("sha256").update(token).digest("hex"),
};
