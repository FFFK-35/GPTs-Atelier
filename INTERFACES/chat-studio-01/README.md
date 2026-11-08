# Chat Studio 01

A mobile-first, frontend-only preview for GPT's Atelier.

## Open locally

Open `index.html` in a modern browser, or serve the repository with any static file server. When published through the existing GitHub Pages site, the page is available at:

`https://fffk-35.github.io/GPTs-Atelier/INTERFACES/chat-studio-01/`

## Phase 1 scope

- Responsive chat workspace with a mobile drawer sidebar.
- New conversations, local conversation history, and per-chat rename/delete actions.
- Export the current conversation as a plain-text file.
- Message rendering using text nodes (no HTML injection).
- Composer with Enter-to-send and Shift+Enter for a new line.
- Dark/light theme preference.
- Return link to the existing Control Center.

## Preview limitations

This is deliberately a UI preview. It does **not** call the AI endpoint, and the send action only saves the user's own message in this browser. It does not create a fake model reply. Conversations and theme preference are stored in this browser's local storage and are not synced to another device.

The model selector, attachments, voice, streaming, cloud history, and authentication are not connected in this phase.

## Safety boundary

- No API key or password is present in this frontend.
- Never place provider credentials in this directory or any browser-delivered file.
- Phase 2 must call the existing backend gateway only after its deployment safeguards have been reviewed and enabled by the repository owner.
- Do not enable the backend AI gateway just to make the preview appear functional.

## Manual phone acceptance checklist

1. Open the page on a narrow mobile screen.
2. Open and close the sidebar using the menu and backdrop.
3. Create two conversations and switch between them.
4. Send a multi-line message; verify Enter sends and Shift+Enter inserts a line break.
5. Refresh the page and confirm local history remains.
6. Switch dark/light theme, refresh, and confirm the preference remains.
7. Use the return link to go back to Control Center.
