# GPT's Atelier Backend

Node.js serverless backend for the Music Lab. Deploy this directory as the Vercel project root; it is intentionally separate from the GitHub Pages frontend.

## Requirements

- Node.js 20+
- npm

## Local setup

```bash
npm install
npm run check
```

For local endpoint testing, install the Vercel CLI and run `vercel dev` from this directory.

## Endpoints

- `GET /api/health` — backend health check
- `GET /api/music/search?q=关键词&limit=20&offset=0` — public song search
- `GET /api/music/lyrics?id=歌曲ID` — lyric and translated lyric retrieval

Search response fields: `id`, `name`, `artists`, `album`, `cover`, `durationMs`, `source`.

Lyrics response fields: `songId`, `lyric`, `translatedLyric`, `romanizedLyric`, `source`.

## Scope and safety

- Phase 1 does not request or store a NetEase account cookie.
- This backend returns metadata and lyric text only; it does not provide audio playback or bypass VIP, copyright, DRM, or regional restrictions.
- The upstream NetEase interface is unofficial and may change or become unavailable.
- Do not add account cookies, passwords, tokens, or other credentials to this repository.
- CORS currently allows the published GitHub Pages origin only.

## Deployment

Create a Vercel project from `FFFK-35/GPTs-Atelier` and set **Root Directory** to `backend`. Vercel will detect the Node.js functions under `api/`. Deploy only after installing dependencies and passing `npm run check`.
