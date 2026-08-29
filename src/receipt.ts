import { sha256 } from "./canonical.js";
import type { Receipt, ReceiptBody } from "./types.js";

export function sealReceipt(body: ReceiptBody): Receipt {
  return {
    ...body,
    integrity: {
      algorithm: "sha256",
      digest: sha256(body)
    }
  };
}

export function verifyReceipt(receipt: unknown): { valid: boolean; expected?: string; actual?: string; error?: string } {
  if (typeof receipt !== "object" || receipt === null || Array.isArray(receipt)) return { valid: false, error: "Receipt must be an object." };
  const candidate = receipt as Record<string, unknown>;
  const integrity = candidate.integrity;
  if (typeof integrity !== "object" || integrity === null || Array.isArray(integrity)) return { valid: false, error: "Receipt has no integrity block." };
  const digest = (integrity as Record<string, unknown>).digest;
  const algorithm = (integrity as Record<string, unknown>).algorithm;
  if (algorithm !== "sha256" || typeof digest !== "string") return { valid: false, error: "Receipt integrity metadata is invalid." };
  const { integrity: _ignored, ...body } = candidate;
  const actual = sha256(body);
  return { valid: actual === digest, expected: digest, actual };
}
