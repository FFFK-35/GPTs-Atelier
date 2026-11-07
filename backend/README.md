# GPT's Atelier Backend

Node.js serverless backend for GPT's Atelier. Deploy this directory as the Vercel project root; it is separate from the GitHub Pages frontend.

## Requirements

- Node.js 20+
- npm

## Local setup

```bash
npm install
npm run check
npm test
```

For local endpoint testing, install the Vercel CLI and run `vercel dev` from this directory.

## Endpoints

- `GET /api/health` — backend health check
- `GET /api/music/search?q=关键词&limit=20&offset=0` — public song search
- `GET /api/music/lyrics?id=歌曲ID` — lyric and translated lyric retrieval
- `POST /api/ai/chat` — authenticated model gateway (non-streaming)

### Model gateway configuration

Set these environment variables in the hosting platform; never commit them:

- `HCNSEC_API_KEY` — provider API key
- `HCNSEC_MODEL` — exact model ID from the provider's current model catalogue
- `ATELIER_GATEWAY_TOKEN` — a separate long random token required by the browser-facing endpoint

The browser must send `Authorization: Bearer <ATELIER_GATEWAY_TOKEN>`. Do not put either token in public frontend source. The user-facing UI must obtain the gateway token through a private configuration step before this endpoint can be used. The server fixes the upstream model and URL; clients cannot select arbitrary models or upstream destinations.

The gateway limits requests to 20 messages and 12,000 input characters, and limits output to 1,200 tokens. It does not expose provider errors or credentials to the browser.

## Scope and safety

- Phase 1 does not request or store a NetEase account cookie.
- Music endpoints return metadata and lyric text only; they do not provide audio playback or bypass VIP, copyright, DRM, or regional restrictions.
- The upstream NetEase interface is unofficial and may change or become unavailable.
- Music search and lyric retrieval use Node.js built-in `fetch`; the backend intentionally has no third-party runtime dependencies.
- Do not add account cookies, passwords, tokens, or other credentials to this repository.
- CORS allows the published GitHub Pages origin only. CORS is not authentication; the model gateway also requires its separate bearer token.
- Provider chat compatibility is documented. TTS and custom voice-ID compatibility are not assumed; verify them separately before implementation.

## Deployment

Create a Vercel project from `FFFK-35/GPTs-Atelier` and set **Root Directory** to `backend`. Add the environment variables above only after rotating any exposed key. Deploy only after dependency review and passing checks.
