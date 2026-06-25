export const SESSION_COOKIE = "cms_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24;

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET");
  }
  return secret;
}

function bufferToHex(buffer) {
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signPayload(encoded) {
  const key = await getHmacKey(getSessionSecret());
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(encoded)
  );
  return bufferToHex(new Uint8Array(signature));
}

export async function createSessionToken() {
  const payload = JSON.stringify({
    admin: true,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
  const encoded = base64UrlEncode(payload);
  const signature = await signPayload(encoded);
  return `${encoded}.${signature}`;
}

export async function verifySessionToken(token) {
  if (!token) return false;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;

  try {
    const expected = await signPayload(encoded);
    if (!timingSafeEqualHex(signature, expected)) return false;

    const payload = JSON.parse(base64UrlDecode(encoded));
    return Boolean(payload.admin && payload.exp && Date.now() <= payload.exp);
  } catch {
    return false;
  }
}

export function getSessionMaxAge() {
  return SESSION_MAX_AGE;
}

export function validateCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}
