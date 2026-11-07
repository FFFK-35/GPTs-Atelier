import { getLyrics, UpstreamError } from "../_lib/netease.js";

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

  const id = typeof req.query?.id === "string" ? req.query.id.trim() : "";
  if (!/^\d{1,20}$/.test(id)) {
    return res.status(400).json({ ok: false, error: { code: "INVALID_SONG_ID", message: "请提供有效的网易云歌曲 ID" } });
  }

  try {
    const data = await getLyrics(id);
    return res.status(200).json({ ok: true, ...data });
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 502;
    return res.status(status).json({
      ok: false,
      error: { code: "UPSTREAM_ERROR", message: error.message || "歌词服务暂时不可用" }
    });
  }
}
