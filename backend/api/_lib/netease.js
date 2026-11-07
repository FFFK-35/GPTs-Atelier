import { cloudsearch, lyric } from "NeteaseCloudMusicApi";

export class UpstreamError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

function unwrap(result) {
  if (!result || typeof result !== "object") {
    throw new UpstreamError("网易云接口返回了空响应");
  }
  if (typeof result.status === "number" && result.status >= 400) {
    throw new UpstreamError("网易云接口暂时无法响应", 502);
  }
  return result.body ?? result;
}

export async function searchSongs(keyword, limit = 20, offset = 0) {
  try {
    const raw = unwrap(await cloudsearch({
      keywords: keyword,
      limit,
      offset,
      type: 1
    }));
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
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError("歌曲搜索失败，请稍后重试");
  }
}

export async function getLyrics(songId) {
  try {
    const raw = unwrap(await lyric({ id: songId }));
    return {
      songId: String(songId),
      lyric: raw?.lrc?.lyric ?? null,
      translatedLyric: raw?.tlyric?.lyric ?? null,
      romanizedLyric: raw?.romalrc?.lyric ?? null,
      source: "netease"
    };
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    throw new UpstreamError("歌词获取失败，请稍后重试");
  }
}
