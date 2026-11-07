import test from "node:test";
import assert from "node:assert/strict";
import { searchSongs, getLyrics, UpstreamError } from "../api/_lib/netease.js";

test("searchSongs maps NetEase song metadata", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://music.163.com/api/cloudsearch/pc");
    assert.equal(options.method, "POST");
    const params = new URLSearchParams(options.body);
    assert.equal(params.get("s"), "测试歌曲");
    assert.equal(params.get("type"), "1");
    return {
      ok: true,
      async json() {
        return {
          code: 200,
          result: {
            songCount: 1,
            songs: [{
              id: 123,
              name: "测试歌曲",
              ar: [{ name: "歌手甲" }],
              al: { name: "专辑甲", picUrl: "https://example.com/cover.jpg" },
              dt: 180000
            }]
          }
        };
      }
    };
  };

  try {
    const result = await searchSongs("测试歌曲", 10, 0);
    assert.equal(result.total, 1);
    assert.deepEqual(result.items[0], {
      id: "123",
      name: "测试歌曲",
      artists: ["歌手甲"],
      album: "专辑甲",
      cover: "https://example.com/cover.jpg",
      durationMs: 180000,
      source: "netease"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getLyrics maps lyric and translation fields", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/api/song/lyric");
    assert.equal(parsed.searchParams.get("id"), "456");
    return {
      ok: true,
      async json() {
        return {
          code: 200,
          lrc: { lyric: "原文" },
          tlyric: { lyric: "译文" },
          romalrc: { lyric: "罗马音" }
        };
      }
    };
  };

  try {
    assert.deepEqual(await getLyrics("456"), {
      songId: "456",
      lyric: "原文",
      translatedLyric: "译文",
      romanizedLyric: "罗马音",
      source: "netease"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("upstream errors are normalized without leaking response details", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() { return { code: 500, message: "private upstream detail" }; }
  });

  try {
    await assert.rejects(searchSongs("x"), (error) => {
      assert.ok(error instanceof UpstreamError);
      assert.equal(error.message, "网易云接口暂时无法响应");
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
