# Chat Studio 01

A mobile-first independent chat workspace for GPT's Atelier, with an authenticated client for the existing backend model gateway.

## Open locally

Open `index.html` in a modern browser, or serve the repository with any static file server. When published through the existing GitHub Pages site, the page is available at:

`https://fffk-35.github.io/GPTs-Atelier/INTERFACES/chat-studio-01/`

## Current capabilities

- Responsive chat workspace with a mobile drawer sidebar.
- New conversations, local conversation history, full-text search, favorites filtering, and per-chat rename/delete actions.
- Export the current conversation as a plain-text file and import Chat Studio TXT exports as separate conversations (up to 1 MB / 200 messages).
- Message rendering using text nodes (no HTML injection).
- Composer with Enter-to-send and Shift+Enter for a new line.
- Dark/light theme preference.
- Return link to the existing Control Center.

## Model connection

- The page loads `chat-runtime.js`, which exchanges the workspace password for an 8-hour signed session at `POST /api/auth/session` and sends recent conversation messages to `POST /api/ai/chat`.
- The session token stays in page memory only; it is not written to localStorage. The workspace password is not retained after login.
- Conversation history remains local to this browser. The backend receives the last 20 user/assistant messages for each request.
- The current backend chat handler returns a complete response (non-streaming). Streaming, stop-generation, attachments, voice, model selection, and cloud history remain future work.
- The frontend targets the existing Render service. The official GitHub Pages origin is allowed by the backend; third-party HTML preview hosts are not allowed by CORS and cannot be used to test login/chat.
- A successful login requires the Render service to have the required environment variables and the gateway switch enabled. Do not enable it until durable rate limits/WAF and provider usage/budget alerts are in place.

## Safety boundary

- No API key or password is present in this frontend.
- Never place provider credentials in this directory or any browser-delivered file.
- Phase 2 must call the existing backend gateway only after its deployment safeguards have been reviewed and enabled by the repository owner.
- Do not enable the backend AI gateway just to make the preview appear functional.

## Manual phone acceptance checklist

1. Open the published GitHub Pages URL on a narrow mobile screen.
2. Open and close the sidebar using the menu and backdrop.
3. Create two conversations and switch between them.
4. Send a multi-line message; verify Enter sends and Shift+Enter inserts a line break.
5. Refresh the page and confirm local history remains.
6. Switch dark/light theme, refresh, and confirm the preference remains.
7. Search for a word from a message and confirm matching chats appear.
8. Favorite a conversation, enable the favorites filter, and confirm only favorites remain.
9. Use the return link to go back to Control Center.
10. Once the backend safeguards are reviewed and configured, test workspace login and a short model conversation from the official Pages origin.
