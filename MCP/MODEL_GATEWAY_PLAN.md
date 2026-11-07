# Model Gateway Plan

## Purpose
Add a server-side model gateway for GPT's Atelier. The browser must never call the model provider directly and must never contain provider credentials.

## Provider
- Base URL: `https://api.hcnsec.cn/v1`
- Chat endpoint: `POST /chat/completions`
- Authentication: `Authorization: Bearer <provider key>`
- The provider documents OpenAI-compatible chat completions and a model-list endpoint. Model IDs must be copied exactly from its current model catalogue.
- Do not assume every model, free-tier route, or optional endpoint is continuously available. Confirm the selected model in the provider console before deployment.

## Backend environment variables
- `HCNSEC_API_KEY`: provider key; server-side only.
- `HCNSEC_MODEL`: exact model ID selected from the provider console.
- `ATELIER_GATEWAY_TOKEN`: a separate, high-entropy secret used by the browser-facing gateway. Never reuse the provider key.

Do not commit any of these values. If a key has appeared in chat, screenshots, logs, or source control, revoke it and issue a replacement.

## Browser-facing endpoint
- `POST /api/ai/chat`
- Requires `Authorization: Bearer <ATELIER_GATEWAY_TOKEN>`
- Accepts a bounded `messages` array and optional `temperature` / `max_tokens`.
- Server fixes the upstream model from `HCNSEC_MODEL`; clients cannot select arbitrary models or upstream URLs.
- Streaming is intentionally disabled in the first iteration.
- Responses return only assistant text and a small usage summary.
- CORS is restricted to the published GitHub Pages origin.

## Voice
The provider's public documentation currently confirms OpenAI-compatible chat completions. Treat TTS availability and custom voice-ID compatibility as unverified until an exact model/voice is documented and tested. The chosen Fish Audio voice ID remains a separate Voice Engine configuration; do not assume it can be passed to this provider's generic `voice` field.

## Deployment checklist
1. Revoke any exposed provider key and create a replacement.
2. Set the three environment variables in the backend hosting platform.
3. Select a current model ID from the provider's model catalogue.
4. Deploy and test authenticated chat, unauthenticated rejection, rate limits, and provider errors.
5. Add rate limiting before exposing the endpoint publicly.
6. Keep music endpoints independent from the model gateway.
