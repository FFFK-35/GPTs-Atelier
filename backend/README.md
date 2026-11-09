# GPT's Atelier Backend

Node.js backend for GPT's Atelier. It can run as a Render Web Service from the `backend` root directory; it is separate from the GitHub Pages frontend. The same route handlers remain compatible with Vercel-style request/response handling.

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

### Shared Redis rate limiting (prototype)

The model gateway requires a shared Redis-compatible store before accepting requests. Configure the Upstash Redis REST endpoint and token as server-side environment variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

The login endpoint allows 5 attempts per client IP per 60-second window. On Render's public edge, the limiter reads Cloudflare's `CF-Connecting-IP` header and validates it as an IP address; it does not trust the leftmost `X-Forwarded-For` value because clients can spoof that header. If the trusted header is absent or invalid, requests share a conservative `unknown` bucket rather than gaining a fresh identity. The chat endpoint allows 20 requests per signed session per 60-second window. If Redis is missing or unavailable, these protected endpoints fail closed with HTTP 503 rather than silently running without limits. This is a baseline prototype, not a substitute for provider spending limits, alerts, or edge/WAF protections. Never expose the Redis token in frontend code or commit it.

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

## Render deployment

1. Create a Web Service from `FFFK-35/GPTs-Atelier`.
2. Set **Branch** to `main` and **Root Directory** to `backend`.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `npm start`.
5. Choose the Free instance for initial testing.
6. Add the music API first; it needs no provider credentials.

Render free web services sleep after 15 minutes without inbound traffic and may take about a minute to wake. Their filesystem is ephemeral, so do not store user data on disk.

## Model gateway safety

The Render adapter keeps `/api/auth/session` and `/api/ai/chat` disabled unless `ATELIER_ENABLE_AI_GATEWAY=true` is explicitly set. Do not enable this flag on a public service until durable platform-level rate limiting/WAF controls and provider usage/budget alerts are configured. The process-local memory of a free web service is not a durable rate limiter. Configure the four secrets above only after rotating any provider key that may have been exposed. Never commit credentials.
