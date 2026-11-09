import test from "node:test";
import assert from "node:assert/strict";
import { enforceRateLimit } from "../api/_lib/rate-limit.js";

test("rate limiter fails closed when Redis is not configured", async () => {
  const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
  const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    assert.deepEqual(await enforceRateLimit({ scope: "test", identity: "x", limit: 2 }), {
      ok: false, configured: false
    });
  } finally {
    if (oldUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = oldUrl;
    if (oldToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
  }
});

test("rate limiter uses Redis atomic counter and enforces limit", async () => {
  const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
  const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const oldFetch = globalThis.fetch;
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io/";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  let body;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://example.upstash.io");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ result: [3, 42] }) };
  };
  try {
    const result = await enforceRateLimit({ scope: "chat", identity: "hashed", limit: 2 });
    assert.equal(result.ok, false);
    assert.equal(result.retryAfter, 42);
    assert.equal(body[0], "EVAL");
  } finally {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = oldUrl;
    if (oldToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
  }
});
