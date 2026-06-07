import { createHash, randomBytes } from "node:crypto";

export function normalizeGiftCardCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashGiftCardCode(code: string) {
  return createHash("sha256").update(normalizeGiftCardCode(code)).digest("hex");
}

export function createGiftCardCode() {
  const raw = randomBytes(16).toString("base64url").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20);
  const parts = raw.match(/.{1,4}/g) ?? [raw];
  return `GC-${parts.join("-")}`;
}

export function giftCardCodeParts(code: string) {
  const normalized = normalizeGiftCardCode(code);
  return {
    prefix: normalized.slice(0, 6),
    suffix: normalized.slice(-4),
  };
}
