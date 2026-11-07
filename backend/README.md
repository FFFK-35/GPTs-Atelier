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
- `POST /api/auth/session` — exchange the private workspace password for a short-lived session
- `GET /api/music/search?q=关键词&limit=20&offset=0` — public song search
- `GET /api/music/lyrics?id=歌曲ID` — lyric and translated lyric retrieval
- `POST /api/ai/chat` — authenticated model gateway (non-streaming)

### Authentication and model gateway

Configure these environment variables on the hosting platform. Never commit them:

- `ATELIER_ACCESS_PASSWORD` — private workspace password; use at least 16 characters
- `ATELIER_SESSION_SECRET` — independent random signing secret; use at least 32 characters
- `HCNSEC_API_KEY` — provider API key
- `HCNSEC_MODEL` — exact model ID from the provider's current model catalogue

The browser sends the workspace password to `POST /api/auth/session` over HTTPS. The server returns an HMAC-signed session token that expires after 8 hours. The browser should keep this token in memory or session-only storage and discard it on logout/expiry. The provider key and signing secret never leave the server. The chat endpoint accepts only a valid signed session token; the old static gateway-token scheme is no longer used.

The gateway limits requests to 20 messages and 12,000 input characters, and limits output to 1,200 tokens. It does not expose provider errors or credentials to the browser.

### Required deployment safeguards

This serverless implementation does not provide durable per-user rate limiting by itself. Before enabling the public model endpoint, configure hosting-platform rate limits/WAF rules for both `/api/auth/session` and `/api/ai/chat`, plus usage/budget alerts at the model provider. Origin checks and CORS are defense-in-depth, not authentication. Do not deploy the model endpoint for public use until those controls are active.

## Scope and safety

- Phase 1 does not request or store a NetEase account cookie.
- Music endpoints return metadata and lyric text only; they do not provide audio playback or bypass VIP, copyright, DRM, or regional restrictions.
- The upstream NetEase interface is unofficial and may change or become unavailable.
- Music search and lyric retrieval use Node.js built-in `fetch`; the backend intentionally has no third-party runtime dependencies.
- Do not add account cookies, passwords, tokens, or other credentials to this repository.
- CORS allows the published GitHub Pages origin only. CORS is not authentication.
- Provider chat compatibility is documented. TTS and custom voice-ID compatibility are not assumed; verify them separately before implementation.

## Deployment

Create a Vercel project from `FFFK-35/GPTs-Atelier` and set **Root Directory** to `backend`. Configure the four environment variables above only after rotating any exposed provider key. Enable platform-level rate limiting and usage alerts before making the model endpoint available.
