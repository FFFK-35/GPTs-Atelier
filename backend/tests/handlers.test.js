import test from "node:test";
import assert from "node:assert/strict";
import health from "../api/health.js";
import search from "../api/music/search.js";
import lyrics from "../api/music/lyrics.js";
import authSession from "../api/auth/session.js";
import aiChat from "../api/ai/chat.js";
import { issueSessionToken, verifySessionToken } from "../api/_lib/session.js";

function response() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    ended: false,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { this.ended = true; return this; }
  };
}

const allowedOrigin = "https://fffk-35.github.io";
const testSecret = "test-session-secret-that-is-long-enough-123456";

function saveEnv(names) {
  return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}

function restoreEnv(saved) {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

async function withConfiguredRedis(run) {
  const names = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  const saved = saveEnv(names);
  const originalFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";
  globalThis.fetch = async () => ({
    ok: true,
    async json() { return { result: [1, 60] }; }
  });
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnv(saved);
  }
}

async function withConfiguredGateway(run) {
  const names = ["HCNSEC_API_KEY", "HCNSEC_MODEL", "ATELIER_SESSION_SECRET"];
  const saved = saveEnv(names);
  process.env.HCNSEC_API_KEY = "test-provider-key";
  process.env.HCNSEC_MODEL = "test-model";
  process.env.ATELIER_SESSION_SECRET = testSecret;
  try {
    await withConfiguredRedis(async () => {
      const token = issueSessionToken(testSecret);
      await run(token);
    });
  } finally {
    restoreEnv(saved);
  }
}

test("health endpoint reports ready", () => {
  const res = response();
  health({ method: "GET" }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.status, "ready");
});

test("health endpoint rejects unsupported methods", () => {
  const res = response();
  health({ method: "POST" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error.code, "METHOD_NOT_ALLOWED");
});

test("search endpoint requires a keyword", async () => {
  const res = response();
  await search({ method: "GET", query: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "MISSING_QUERY");
});

test("search endpoint rejects overly long keywords", async () => {
  const res = response();
  await search({ method: "GET", query: { q: "a".repeat(81) } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "QUERY_TOO_LONG");
});

test("lyrics endpoint validates numeric song IDs", async () => {
  const res = response();
  await lyrics({ method: "GET", query: { id: "not-a-song-id" } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "INVALID_SONG_ID");
});

test("music endpoints answer CORS preflight requests", async () => {
  const res = response();
  await search({ method: "OPTIONS", query: {} }, res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.equal(res.headers["Access-Control-Allow-Origin"], allowedOrigin);
});

test("session endpoint rejects requests from unknown origins", async () => {
  const saved = saveEnv(["ATELIER_ACCESS_PASSWORD", "ATELIER_SESSION_SECRET"]);
  process.env.ATELIER_ACCESS_PASSWORD = "a-private-workspace-password";
  process.env.ATELIER_SESSION_SECRET = testSecret;
  try {
    const res = response();
    await authSession({ method: "POST", headers: { origin: "https://evil.example" }, body: { password: "a-private-workspace-password" } }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.error.code, "ORIGIN_NOT_ALLOWED");
  } finally {
    restoreEnv(saved);
  }
});

test("session endpoint exchanges the correct password for a signed session", async () => {
  const saved = saveEnv(["ATELIER_ACCESS_PASSWORD", "ATELIER_SESSION_SECRET"]);
  process.env.ATELIER_ACCESS_PASSWORD = "a-private-workspace-password";
  process.env.ATELIER_SESSION_SECRET = testSecret;
  try {
    await withConfiguredRedis(async () => {
      const res = response();
      await authSession({ method: "POST", headers: { origin: allowedOrigin }, body: { password: "a-private-workspace-password" } }, res);
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ok, true);
    assert.equal(verifySessionToken(res.body.token, testSecret), true);
    assert.equal(res.body.expiresIn, 28800);
  } finally {
    restoreEnv(saved);
  }
});

test("session endpoint rejects an incorrect password", async () => {
  const saved = saveEnv(["ATELIER_ACCESS_PASSWORD", "ATELIER_SESSION_SECRET"]);
  process.env.ATELIER_ACCESS_PASSWORD = "a-private-workspace-password";
  process.env.ATELIER_SESSION_SECRET = testSecret;
  try {
    await withConfiguredRedis(async () => {
      const res = response();
      await authSession({ method: "POST", headers: { origin: allowedOrigin }, body: { password: "wrong-password" } }, res);
    });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error.code, "INVALID_PASSWORD");
  } finally {
    restoreEnv(saved);
  }
});

test("session tokens expire and cannot be tampered with", () => {
  const issuedAt = 1_800_000_000_000;
  const token = issueSessionToken(testSecret, issuedAt);
  assert.equal(verifySessionToken(token, testSecret, issuedAt + 1000), true);
  assert.equal(verifySessionToken(token, testSecret, issuedAt + 8 * 60 * 60 * 1000 + 1000), false);
  assert.equal(verifySessionToken(token + "x", testSecret, issuedAt + 1000), false);
});

test("model gateway rejects requests until server secrets are configured", async () => {
  const saved = saveEnv(["HCNSEC_API_KEY", "HCNSEC_MODEL", "ATELIER_SESSION_SECRET"]);
  delete process.env.HCNSEC_API_KEY;
  delete process.env.HCNSEC_MODEL;
  delete process.env.ATELIER_SESSION_SECRET;
  try {
    const res = response();
    await aiChat({ method: "POST", headers: { origin: allowedOrigin }, body: { messages: [{ role: "user", content: "hi" }] } }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error.code, "GATEWAY_NOT_CONFIGURED");
  } finally {
    restoreEnv(saved);
  }
});

test("model gateway rejects missing or invalid session token", async () => {
  await withConfiguredGateway(async () => {
    const res = response();
    await aiChat({ method: "POST", headers: { origin: allowedOrigin }, body: { messages: [{ role: "user", content: "hi" }] } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
  });
});

test("model gateway validates messages before calling upstream", async () => {
  await withConfiguredGateway(async (token) => {
    const res = response();
    await aiChat({
      method: "POST",
      headers: { origin: allowedOrigin, authorization: `Bearer ${token}` },
      body: { messages: [{ role: "system", content: "" }] }
    }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, "INVALID_MESSAGE");
  });
});

test("model gateway answers preflight without exposing provider credentials", async () => {
  const res = response();
  await aiChat({ method: "OPTIONS", headers: { origin: allowedOrigin } }, res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.ended, true);
  assert.equal(res.headers["Access-Control-Allow-Origin"], allowedOrigin);
  assert.match(res.headers["Access-Control-Allow-Headers"], /Authorization/);
});

test("model gateway rejects more than 20 messages", async () => {
  await withConfiguredGateway(async (token) => {
    const res = response();
    await aiChat({
      method: "POST",
      headers: { origin: allowedOrigin, authorization: `Bearer ${token}` },
      body: { messages: Array.from({ length: 21 }, () => ({ role: "user", content: "hi" })) }
    }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, "INVALID_MESSAGES");
  });
});

test("model gateway rejects input over 12000 characters", async () => {
  await withConfiguredGateway(async (token) => {
    const res = response();
    await aiChat({
      method: "POST",
      headers: { origin: allowedOrigin, authorization: `Bearer ${token}` },
      body: { messages: [{ role: "user", content: "x".repeat(12001) }] }
    }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, "INPUT_TOO_LONG");
  });
});

test("model gateway rejects an out-of-range temperature", async () => {
  await withConfiguredGateway(async (token) => {
    const res = response();
    await aiChat({
      method: "POST",
      headers: { origin: allowedOrigin, authorization: `Bearer ${token}` },
      body: { messages: [{ role: "user", content: "hello" }], temperature: 2.1 }
    }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, "INVALID_TEMPERATURE");
  });
});

test("model gateway rejects max_tokens above the configured ceiling", async () => {
  await withConfiguredGateway(async (token) => {
    const res = response();
    await aiChat({
      method: "POST",
      headers: { origin: allowedOrigin, authorization: `Bearer ${token}` },
      body: { messages: [{ role: "user", content: "hello" }], max_tokens: 1201 }
    }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error.code, "INVALID_MAX_TOKENS");
  });
});
