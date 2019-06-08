import crypto from "crypto";
import { saltKey } from "./salt";

export function createKeyHash(id: string, salt: string): string {
  const cipher = crypto.createHash("sha256");
  cipher.update(saltKey(id, salt), "utf8");
  return cipher.digest("base64");
}
