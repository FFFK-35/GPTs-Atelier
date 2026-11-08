import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const chatPath = resolve(here, "index.html");
const controlPath = resolve(here, "../control-center-01/index.html");

function inspectHtml(path, required = []) {
  const html = readFileSync(path, "utf8");
  for (const token of required) {
    assert.ok(html.includes(token), `Missing required UI token: ${token}`);
  }
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, `No inline script found in ${path}`);
  for (const [, source] of scripts) {
    if (source.trim()) {
      assert.doesNotThrow(
        () => new Function(source),
        `Invalid inline JavaScript in ${path}`
      );
    }
  }
  return html;
}

const chat = inspectHtml(chatPath, [
  'id="sidebar"', 'id="history"', 'id="messages"', 'id="composer"',
  'id="prompt"', 'id="themeBtn"', 'data-theme="light"', 'aria-expanded="false"',
  "localStorage", "e.shiftKey", "safe-area-inset-bottom"
]);

assert.ok(chat.includes("模型未连接"), "Preview must clearly show that no model is connected");
assert.ok(chat.includes("不会发送给模型"), "Preview must explain that messages stay local");
assert.ok(chat.includes("closeSidebar(true)"), "Mobile sidebar must support Escape and return focus to its trigger");
for (const id of ["renameChat", "exportChat", "deleteChat"]) {
  assert.ok(chat.includes('id="' + id + '"'), `Missing local conversation action: ${id}`);
}
assert.ok(chat.includes("URL.createObjectURL"), "Conversation export must create a local text download");
assert.ok(chat.includes("chats.filter(item=>item.id!==c.id)"), "Conversation deletion must remove only the active local chat");
assert.ok(!/fetch\s*\(/i.test(chat), "Phase 1 frontend must not call remote APIs");
assert.ok(
  !/HCNSEC_API_KEY|ATELIER_SESSION_SECRET|sk-[A-Za-z0-9]{16,}/.test(chat),
  "Frontend must not contain credentials"
);

inspectHtml(controlPath, ['data-view="chat"', 'id="chat"', "../chat-studio-01/"]);
console.log("Chat Studio static checks passed.");
