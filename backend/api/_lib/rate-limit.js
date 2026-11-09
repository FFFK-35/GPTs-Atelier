import { isIP } from "node:net";

const WINDOW_SECONDS = 60;

export async function enforceRateLimit({ scope, identity, limit }) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { ok: false, configured: false };

  const key = `atelier:rate:${scope}:${identity}`;
  const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; local ttl=redis.call('TTL',KEYS[1]); return {n,ttl}";
  try {
    const response = await fetch(url.replace(/\/$/, ""), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", script, "1", key, String(WINDOW_SECONDS)]),
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return { ok: false, configured: true };
    const data = await response.json();
    const result = data?.result;
    if (!Array.isArray(result) || !Number.isFinite(Number(result[0]))) return { ok: false, configured: true };
    const count = Number(result[0]);
    const retryAfter = Math.max(1, Number(result[1]) || WINDOW_SECONDS);
    return { ok: count <= limit, configured: true, retryAfter };
  } catch {
    return { ok: false, configured: true };
  }
}

export function getClientIdentity(req) {
  // Render's public edge is behind Cloudflare. Unlike X-Forwarded-For,
  // CF-Connecting-IP is overwritten by Cloudflare and cannot be chosen by
  // the incoming client. Never trust the leftmost X-Forwarded-For value.
  const candidate = req.headers?.["cf-connecting-ip"];
  const ip = typeof candidate === "string" ? candidate.trim() : "";
  return isIP(ip) ? ip : "unknown";
}
