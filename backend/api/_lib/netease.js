const SEARCH_URL = "https://music.163.com/api/cloudsearch/pc";
const LYRIC_URL = "https://music.163.com/api/song/lyric";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

export class UpstreamError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

async function requestJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": "https://music.163.com/",
        Accept: "application/json",
        ...options.headers
      }
    });
  } catch {
    throw new UpstreamError("网易云接口暂时无法连接");
  }

  if (!response.ok) {
    throw new UpstreamError("网易云接口暂时无法响应");
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new UpstreamError("网易云接口返回了无效数据");
  }

  if (!data || typeof data !== "object" || (typeof data.code === "number" && data.code !== 200)) {
    throw new UpstreamError("网易云接口暂时无法响应");
  }
  return data;
}

export async function searchSongs(keyword, limit = 20, offset = 0) {
  const body = new URLSearchParams({
    s: keyword,
    type: "1",
    limit: String(limit),
    offset: String(offset)
  });

  const raw = await requestJson(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const songs = raw?.result?.songs ?? [];
  return {
    total: raw?.result?.songCount ?? songs.length,
    items: songs.map((song) => ({
      id: String(song.id),
      name: song.name ?? "",
      artists: (song.ar ?? song.artists ?? []).map((artist) => artist.name).filter(Boolean),
      album: song.al?.name ?? song.album?.name ?? "",
      cover: song.al?.picUrl ?? song.album?.picUrl ?? null,
      durationMs: song.dt ?? song.duration ?? null,
      source: "netease"
    }))
  };
}

export async function getLyrics(songId) {
  const url = new URL(LYRIC_URL);
  url.search = new URLSearchParams({
    os: "pc",
    id: String(songId),
    lv: "-1",
    kv: "-1",
    tv: "-1"
  }).toString();

  const raw = await requestJson(url);
  return {
    songId: String(songId),
    lyric: raw?.lrc?.lyric ?? null,
    translatedLyric: raw?.tlyric?.lyric ?? null,
    romanizedLyric: raw?.romalrc?.lyric ?? null,
    source: "netease"
  };
}
