import { createServer } from "node:http";

import healthHandler from "./api/health.js";
import searchHandler from "./api/music/search.js";
import lyricsHandler from "./api/music/lyrics.js";
import sessionHandler from "./api/auth/session.js";
import chatHandler from "./api/ai/chat.js";

const routes = new Map([
  ["/api/health", healthHandler],
  ["/api/music/search", searchHandler],
  ["/api/music/lyrics", lyricsHandler],
  ["/api/auth/session", sessionHandler],
  ["/api/ai/chat", chatHandler]
]);

const MAX_BODY_BYTES = 64 * 1024;

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("请求体过大");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (size === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("请求 JSON 格式不正确");
    error.status = 400;
    throw error;
  }
}

const server = createServer(async (incoming, outgoing) => {
  const url = new URL(incoming.url || "/", "http://localhost");
  const handler = routes.get(url.pathname);

  if (!handler) {
    return sendJson(outgoing, 404, {
      ok: false,
      error: { code: "NOT_FOUND", message: "接口不存在" }
    });
  }

  // Keep the model gateway closed until external rate limits and provider
  // spending alerts have been configured and explicitly reviewed.
  if (
    (url.pathname === "/api/auth/session" || url.pathname === "/api/ai/chat") &&
    process.env.ATELIER_ENABLE_AI_GATEWAY !== "true"
  ) {
    return sendJson(outgoing, 503, {
      ok: false,
      error: { code: "GATEWAY_DISABLED", message: "模型网关尚未开放" }
    });
  }

  let body = {};
  try {
    if (incoming.method === "POST") body = await readBody(incoming);
  } catch (error) {
    return sendJson(outgoing, error.status || 400, {
      ok: false,
      error: {
        code: error.status === 413 ? "BODY_TOO_LARGE" : "INVALID_BODY",
        message: error.message
      }
    });
  }

  const request = {
    method: incoming.method,
    headers: incoming.headers,
    query: Object.fromEntries(url.searchParams.entries()),
    body
  };

  const response = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      if (outgoing.writableEnded) return;
      outgoing.writeHead(this.statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        ...this.headers
      });
      outgoing.end(JSON.stringify(payload));
      return this;
    },
    end() {
      if (outgoing.writableEnded) return;
      outgoing.writeHead(this.statusCode, this.headers);
      outgoing.end();
    }
  };

  try {
    await handler(request, response);
    if (!outgoing.writableEnded) response.end();
  } catch {
    if (!outgoing.writableEnded) {
      sendJson(outgoing, 500, {
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "服务器内部错误" }
      });
    }
  }
});

const port = Number.parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`GPT's Atelier backend listening on port ${port}`);
});
