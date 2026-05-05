import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a HMAC-SHA256 signature delivered as a hex digest in a header.
 * Both portals are configured with a shared secret in the bridge service.
 */
export function verifySignature(secret: string, rawBody: string, signature: string | undefined): boolean {
  if (!secret) return true; // dev-mode opt-out
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
