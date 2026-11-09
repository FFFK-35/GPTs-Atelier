import { timingSafeEqual } from "node:crypto";
import { issueSessionToken, SESSION_TTL } from "../_lib/session.js";
import { enforceRateLimit, getClientIdentity } from "../_lib/rate-limit.js";

const ALLOWED_ORIGIN = "https://fffk-35.github.io";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

function fail(res, status, code, message) {
  return res.status(status).json({ ok: false, error: { code, message } });
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  setCors(res);
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return fail(res, 405, "METHOD_NOT_ALLOWED", "仅支持 POST");
  }

  if (req.headers?.origin !== ALLOWED_ORIGIN) {
    return fail(res, 403, "ORIGIN_NOT_ALLOWED", "请求来源不受允许");
  }

  const rate = await enforceRateLimit({ scope: "login", identity: getClientIdentity(req), limit: 5 });
  if (!rate.configured) return fail(res, 503, "RATE_LIMIT_NOT_CONFIGURED", "登录保护尚未完成配置");
  if (!rate.ok) {
    res.setHeader("Retry-After", String(rate.retryAfter));
    return fail(res, 429, "RATE_LIMITED", "尝试次数过多，请稍后再试");
  }

  const password = process.env.ATELIER_ACCESS_PASSWORD;
  const secret = process.env.ATELIER_SESSION_SECRET;
  if (!password || password.length < 16 || !secret || secret.length < 32) {
    return fail(res, 503, "AUTH_NOT_CONFIGURED", "工作室身份验证尚未完成服务器配置");
  }

  const supplied = req.body?.password;
  if (typeof supplied !== "string" || supplied.length > 256 || !safeEqual(supplied, password)) {
    return fail(res, 401, "INVALID_PASSWORD", "访问密码不正确");
  }

  const token = issueSessionToken(secret);
  return res.status(200).json({
    ok: true,
    token,
    tokenType: "Bearer",
    expiresIn: SESSION_TTL
  });
}
