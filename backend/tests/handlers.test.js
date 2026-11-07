import test from "node:test";
import assert from "node:assert/strict";
import health from "../api/health.js";
import search from "../api/music/search.js";
import lyrics from "../api/music/lyrics.js";
import aiChat from "../api/ai/chat.js";

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
  assert.equal(res.headers["Access-Control-Allow-Origin"], "https://fffk-35.github.io");
});


test("model gateway rejects requests until server secrets are configured", async () => {
  const old = [process.env.HCNSEC_API_KEY, process.env.HCNSEC_MODEL, process.env.ATELIER_GATEWAY_TOKEN];
  delete process.env.HCNSEC_API_KEY;
  delete process.env.HCNSEC_MODEL;
  delete process.env.ATELIER_GATEWAY_TOKEN;
  const res = response();
  await aiChat({ method: "POST", headers: {}, body: { messages: [{ role: "user", content: "hi" }] } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error.code, "GATEWAY_NOT_CONFIGURED");
  [process.env.HCNSEC_API_KEY, process.env.HCNSEC_MODEL, process.env.ATELIER_GATEWAY_TOKEN] = old;
});

test("model gateway rejects missing private gateway token", async () => {
  const old = [process.env.HCNSEC_API_KEY, process.env.HCNSEC_MODEL, process.env.ATELIER_GATEWAY_TOKEN];
  process.env.HCNSEC_API_KEY = "test-provider-key";
  process.env.HCNSEC_MODEL = "test-model";
  process.env.ATELIER_GATEWAY_TOKEN = "test-gateway-token";
  const res = response();
  await aiChat({ method: "POST", headers: {}, body: { messages: [{ role: "user", content: "hi" }] } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, "UNAUTHORIZED");
  [process.env.HCNSEC_API_KEY, process.env.HCNSEC_MODEL, process.env.ATELIER_GATEWAY_TOKEN] = old;
});

test("model gateway validates messages before calling upstream", async () => {
  const old = [process.env.HCNSEC_API_KEY, process.env.HCNSEC_MODEL, process.env.ATELIER_GATEWAY_TOKEN];
  process.env.HCNSEC_API_KEY = "test-provider-key";
  process.env.HCNSEC_MODEL = "test-model";
  process.env.ATELIER_GATEWAY_TOKEN = "test-gateway-token";
  const res = response();
  await aiChat({
    method: "POST",
    headers: { authorization: "Bearer test-gateway-token" },
    body: { messages: [{ role: "system", content: "" }] }
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "INVALID_MESSAGE");
  [process.env.HCNSEC_API_KEY, process.env.HCNSEC_MODEL, process.env.ATELIER_GATEWAY_TOKEN] = old;
});
