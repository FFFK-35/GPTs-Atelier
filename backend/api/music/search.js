import { searchSongs, UpstreamError } from "../_lib/netease.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "https://fffk-35.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");
}

export default async function handler(req, res) {
  setCors(res);
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "仅支持 GET" } });
  }

  const keyword = typeof req.query?.q === "string" ? req.query.q.trim() : "";
  const limit = Math.min(Math.max(Number.parseInt(req.query?.limit ?? "20", 10) || 20, 1), 30);
  const offset = Math.max(Number.parseInt(req.query?.offset ?? "0", 10) || 0, 0);

  if (!keyword) {
    return res.status(400).json({ ok: false, error: { code: "MISSING_QUERY", message: "请提供搜索关键词 q" } });
  }
  if (keyword.length > 80) {
    return res.status(400).json({ ok: false, error: { code: "QUERY_TOO_LONG", message: "搜索关键词不能超过 80 个字符" } });
  }

  try {
    const data = await searchSongs(keyword, limit, offset);
    return res.status(200).json({ ok: true, query: keyword, ...data });
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 502;
    return res.status(status).json({
      ok: false,
      error: { code: "UPSTREAM_ERROR", message: error.message || "音乐服务暂时不可用" }
    });
  }
}
