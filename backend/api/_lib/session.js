import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TTL_SECONDS = 8 * 60 * 60;

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function issueSessionToken(secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS
  })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token, secret, now = Date.now()) {
  if (typeof token !== "string" || token.length > 2048 || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const expected = Buffer.from(sign(parts[0], secret));
  const supplied = Buffer.from(parts[1]);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;

  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return payload?.version === 1 &&
      Number.isInteger(payload.exp) &&
      payload.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

export const SESSION_TTL = SESSION_TTL_SECONDS;
