export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: { code: "METHOD_NOT_ALLOWED", message: "仅支持 GET" } });
  }
  return res.status(200).json({
    ok: true,
    service: "gpts-atelier-backend",
    status: "ready",
    timestamp: new Date().toISOString()
  });
}
