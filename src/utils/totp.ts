// src/utils/totp.ts

// Convert number -> 8-byte buffer (big-endian)
function intToBuffer(num: number): ArrayBuffer {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(num));
  return buf;
}

// Generate TOTP for a given secret and timeStep
async function generateTotpForStep(
  secret: string,
  timeStep: number
): Promise<string> {
  if (!("crypto" in window) || !window.crypto.subtle) {
    const combined = `${secret}:${timeStep}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 31 + combined.charCodeAt(i)) >>> 0;
    }
    const otpFallback = hash % 1_000_000;
    return otpFallback.toString().padStart(6, "0");
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msg = intToBuffer(timeStep);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg);
  const hmac = new Uint8Array(sig);

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1_000_000;
  return otp.toString().padStart(6, "0");
}

// Public: generate current TOTP (30s window)
export async function generateCurrentTotp(secret: string): Promise<string> {
  const timeStep = Math.floor(Date.now() / 1000 / 30);
  return generateTotpForStep(secret, timeStep);
}
