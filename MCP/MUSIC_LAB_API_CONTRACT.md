# Music Lab API Contract

## Purpose

This document defines the first backend contract for the Music Lab page. It is intentionally provider-neutral at the HTTP boundary so the frontend does not depend on undocumented NetEase response shapes.

## Deployment shape

- Keep the existing GitHub Pages frontend in `INTERFACES/control-center-01/`.
- Deploy the backend as a separate Node.js serverless project.
- The frontend must call the backend over HTTPS using one configurable base URL.
- GitHub Pages remains static hosting and does not execute backend code.

## Phase 1 endpoints (anonymous metadata only)

### GET /api/music/search?q={keyword}

Input:
- `q`: required UTF-8 search keyword.
- Trim whitespace; reject empty input and overly long values (suggested maximum: 80 characters).

Success response:
```json
{
  "ok": true,
  "query": "晴天",
  "results": [
    {
      "id": "song-id",
      "title": "晴天",
      "artists": ["周杰伦"],
      "album": "叶惠美",
      "durationMs": 269000,
      "coverUrl": "https://...",
      "trackUrl": "https://music.163.com/#/song?id=...",
      "playable": false
    }
  ]
}
```

Rules:
- Return only fields that are actually available; nullable metadata may be `null`.
- `playable` must remain `false` unless a lawful, working audio source has been independently verified.
- Never return cookies, tokens, raw upstream headers, or internal errors.

### GET /api/music/lyrics?id={songId}

Input:
- `id`: required provider song identifier; validate its format and length.

Success response:
```json
{
  "ok": true,
  "id": "song-id",
  "lyrics": "[00:01.00]...",
  "translation": null
}
```

Rules:
- Preserve timestamps when available.
- Translation may be `null` when unavailable.
- Do not invent lyrics or translations.

## Common error response

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Please enter a search keyword."
  }
}
```

Suggested error codes:
- `INVALID_QUERY`
- `INVALID_SONG_ID`
- `NOT_FOUND`
- `UPSTREAM_TIMEOUT`
- `UPSTREAM_RATE_LIMITED`
- `UPSTREAM_UNAVAILABLE`

The frontend should display a short, friendly Chinese message for each error and must not expose stack traces.

## Operational safeguards

- Enforce input validation, request timeouts, response-size limits, and basic rate limiting.
- Set conservative cache headers for anonymous metadata where appropriate.
- Do not request or store a NetEase login cookie in Phase 1.
- Do not expose account, playlist-write, favorite, or playback-control endpoints in Phase 1.
- Do not bypass VIP, region, copyright, or DRM restrictions.
- Keep provider-specific parsing inside the backend adapter; normalize the response before it reaches the browser.
- Do not log full request headers or secrets.

## Frontend integration

The browser UI should:
1. Read the backend base URL from one clearly marked configuration constant.
2. Call `GET /api/music/search?q=...` when the user submits a search.
3. Render title, artists, album, cover, and official track link from the normalized response.
4. Request lyrics only after a user selects a result.
5. Show loading, empty, error, and disconnected states.
6. Never label a song as playable just because search returned a track.

## Deployment acceptance checklist

- [ ] Backend health route responds over HTTPS.
- [ ] Known-song search returns normalized metadata.
- [ ] Lyrics lookup returns timestamps when upstream data provides them.
- [ ] Empty and invalid inputs are rejected safely.
- [ ] Timeout and upstream failure messages are handled.
- [ ] No account credentials exist in frontend files, repository history, or logs.
- [ ] The Music Lab remains usable on Android Edge at narrow mobile widths.

## Current status

This is an interface contract only. No backend has been deployed and no live NetEase request is being made yet. The next implementation step is to create the small serverless backend and test it before connecting the public frontend.
