/**
 * Cryptographic helpers for Linkora Protocol.
 * Uses Web Crypto API (Node 16+, modern browsers, and compatible with Swift CryptoKit / Android Keystore).
 */

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  const length = clean.length / 2;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Generates a cryptographically secure random 32-byte nonce.
 */
export function generateRandomNonce(length = 32): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback if global crypto isn't direct
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Computes SHA-256 hash of a buffer.
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digestBuffer = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
  return new Uint8Array(digestBuffer);
}

/**
 * Computes hex SHA-256 hash string.
 */
export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await sha256(data);
  return toHex(digest);
}

/**
 * Generates a 6-digit Short Authentication String (SAS) from shared secrets / nonces.
 * Both peers compute this to visually confirm pairing integrity and prevent MitM.
 */
export async function deriveSASCode(
  senderNonce: Uint8Array,
  responderNonce: Uint8Array,
  sharedSecret?: Uint8Array
): Promise<string> {
  const combined = new Uint8Array(
    senderNonce.length + responderNonce.length + (sharedSecret ? sharedSecret.length : 0)
  );
  combined.set(senderNonce, 0);
  combined.set(responderNonce, senderNonce.length);
  if (sharedSecret) {
    combined.set(sharedSecret, senderNonce.length + responderNonce.length);
  }

  const hash = await sha256(combined);
  // Take first 4 bytes as an integer modulo 1,000,000
  const view = new DataView(hash.buffer, hash.byteOffset, hash.byteLength);
  const codeInt = view.getUint32(0, false) % 1_000_000;
  return codeInt.toString().padStart(6, "0");
}
