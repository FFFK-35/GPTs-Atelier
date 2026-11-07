import { verifySessionToken } from "../_lib/session.js";

const PROVIDER_BASE_URL = "https://api.hcnsec.cn/v1";
const ALLOWED_ORIGIN = "https://fffk-35.github.io";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
}

function fail(res, status, code, message) {
  return res.status(status).json({ ok: false, error: { code, message } });
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

  const sessionSecret = process.env.ATELIER_SESSION_SECRET;
  const providerKey = process.env.HCNSEC_API_KEY;
  const model = process.env.HCNSEC_MODEL;
  if (!sessionSecret || sessionSecret.length < 32 || !providerKey || !model) {
    return fail(res, 503, "GATEWAY_NOT_CONFIGURED", "模型服务尚未完成服务器配置");
  }

  const auth = req.headers?.authorization ?? req.headers?.Authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!verifySessionToken(token, sessionSecret)) {
    return fail(res, 401, "UNAUTHORIZED", "登录状态已失效，请重新登录");
  }

  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 20) {
    return fail(res, 400, "INVALID_MESSAGES", "messages 必须包含 1 至 20 条消息");
  }

  let totalChars = 0;
  for (const message of messages) {
    if (!message || !["system", "user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" || !message.content.trim()) {
      return fail(res, 400, "INVALID_MESSAGE", "消息格式不正确");
    }
    totalChars += message.content.length;
  }
  if (totalChars > 12000) {
    return fail(res, 400, "INPUT_TOO_LONG", "消息总长度不能超过 12000 个字符");
  }

  const temperature = req.body?.temperature;
  if (temperature !== undefined &&
      (typeof temperature !== "number" || temperature < 0 || temperature > 2)) {
    return fail(res, 400, "INVALID_TEMPERATURE", "temperature 必须在 0 到 2 之间");
  }

  const maxTokens = req.body?.max_tokens ?? 600;
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 1200) {
    return fail(res, 400, "INVALID_MAX_TOKENS", "max_tokens 必须在 1 到 1200 之间");
  }

  try {
    const upstream = await fetch(`${PROVIDER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        stream: false
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!upstream.ok) {
      return fail(res, upstream.status === 429 ? 429 : 502,
        upstream.status === 429 ? "PROVIDER_RATE_LIMIT" : "PROVIDER_ERROR",
        upstream.status === 429 ? "模型服务繁忙，请稍后再试" : "上游模型服务暂时不可用");
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return fail(res, 502, "INVALID_PROVIDER_RESPONSE", "模型服务返回格式异常");
    }

    return res.status(200).json({
      ok: true,
      model,
      message: { role: "assistant", content },
      usage: data.usage ?? null
    });
  } catch {
    return fail(res, 502, "UPSTREAM_UNAVAILABLE", "暂时无法连接模型服务");
  }
}
