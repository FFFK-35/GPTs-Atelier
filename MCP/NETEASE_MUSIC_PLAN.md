# NetEase Music Lab — Implementation Plan

## Goal

Connect GPT's Atelier Control Center to NetEase Cloud Music, starting with anonymous song search and lyrics. Add account features only after the public-data path is working and the remote service is protected.

## Architecture

- Frontend: `INTERFACES/control-center-01/`, hosted by GitHub Pages.
- Backend: a separate serverless Node.js service (candidate: Vercel) that proxies NetEase public web endpoints.
- The frontend calls only the backend's HTTPS API. It must not call undocumented NetEase endpoints directly from the browser.
- GitHub Pages is static hosting; it cannot run the Node.js MCP/API server.

## Phase 1 — no login

1. Search songs by keyword.
2. Return normalized title, artists, album, duration, cover (when available), and NetEase URL.
3. Fetch timestamped lyrics and translations when available.
4. Show clear empty-result, timeout, rate-limit, region/rights, and upstream-error states.
5. Do not claim that a result is playable unless a valid playback source is actually returned and tested.

## Phase 2 — playback evaluation

- Test whether a legal, usable playback URL is available for each result.
- Respect membership, region, copyright, and DRM restrictions.
- Do not download tracks, bypass DRM, or bypass VIP/region restrictions.
- If playback cannot be provided, link to the official NetEase track page or open the NetEase app instead.

## Phase 3 — account features (later, opt-in)

- Read playlists and liked songs.
- Create and edit playlists only after explicit user confirmation for each write action.
- Store credentials only in protected server-side secrets/session storage.
- Never put cookies, tokens, or private service URLs in this public repository or browser JavaScript.
- Require HTTPS and authentication before exposing any account-capable endpoint.

## Candidate implementation and integration note

Evaluate `weiyu-t/netease-music-mcp-vercel` as a reference implementation for anonymous search and timestamped lyrics. It documents a no-login design, input validation, request timeouts/throttling, tests, and a Vercel Streamable HTTP MCP route at `/api/mcp`.

Important: this repository exposes MCP tools, not a ready-made browser REST API for the Music Lab page. The browser UI cannot simply call `/api/mcp` as if it were `/api/search`. We must either add a small authenticated/limited REST adapter for search and lyrics, or build a separate MCP-aware client layer. Do not expose a public unauthenticated account-capable MCP endpoint. For the first anonymous search/lyrics phase, use strict input validation, rate limiting, timeouts, and no account credentials.

This is an unofficial integration using public NetEase web API behavior, so upstream compatibility is not guaranteed. Do not promise audio playback: the candidate focuses on metadata and timestamped lyrics, and VIP/region/copyright restrictions remain in force.

Reference: https://github.com/weiyu-t/netease-music-mcp-vercel

## Acceptance checks

- Search returns real results for a known query.
- Lyrics endpoint returns timestamped lyrics for a known song ID when available.
- Invalid input is rejected.
- Upstream timeout and empty results are shown clearly.
- No credentials are present in frontend files, Git history, logs, or public deployment configuration.
- Mobile Edge layout remains usable on a narrow screen.

## Current status

- Control Center static frontend is deployed on GitHub Pages.
- Anonymous music backend is not deployed yet.
- No NetEase account credentials have been requested or stored.
