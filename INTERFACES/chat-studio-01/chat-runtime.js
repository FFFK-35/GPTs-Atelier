'use strict';
(() => {
  const API_BASE = "https://gpts-atelier.onrender.com";
  let sessionToken = null;
  let busy = false;
  let pendingMessage = "";
  const status = document.querySelector(".status");
  const topActions = document.querySelector(".top-actions");
  const note = document.getElementById("connectionNote");
  const sendButton = document.getElementById("sendBtn");
  const prompt = document.getElementById("prompt");

  const style = document.createElement("style");
  style.textContent = ".auth-btn{padding:7px 11px;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--soft);font-size:10px}.auth-overlay{position:fixed;z-index:50;inset:0;display:none;place-items:center;padding:20px;background:#08060dcc}.auth-overlay.open{display:grid}.auth-card{width:min(100%,390px);padding:24px;border:1px solid var(--line);border-radius:16px;background:var(--side);box-shadow:var(--shadow)}.auth-card h2{margin:0 0 8px;font:22px Georgia,serif;font-weight:400}.auth-card p{margin:0 0 18px;color:var(--muted);font-size:11px;line-height:1.8}.auth-card input{width:100%;padding:12px;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--text);font:inherit;outline:none}.auth-card input:focus{border-color:var(--accent2)}.auth-error{min-height:20px;margin:8px 0;color:#d69b9b;font-size:10px}.auth-actions{display:flex;justify-content:flex-end;gap:8px}.auth-actions button{padding:9px 13px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text);font:inherit;font-size:11px}.auth-actions .auth-submit{border-color:var(--accent2);background:var(--accent);color:#24192d}";
  document.head.append(style);

  const loginButton = document.createElement("button");
  loginButton.type = "button";
  loginButton.className = "auth-btn";
  loginButton.textContent = "登录工作室";
  loginButton.setAttribute("aria-label", "登录工作室");
  topActions.insertBefore(loginButton, document.getElementById("themeBtn"));

  const overlay = document.createElement("div");
  overlay.className = "auth-overlay";
  overlay.innerHTML = '<form class="auth-card" id="atelierAuthForm"><h2>进入私人工作室</h2><p>请输入工作室访问密码。密码只会发送到 Atelier 后端用于验证，不会保存在浏览器中。</p><input id="atelierPassword" type="password" autocomplete="current-password" maxlength="256" placeholder="工作室访问密码" required><div class="auth-error" id="atelierAuthError" role="status"></div><div class="auth-actions"><button type="button" id="atelierAuthCancel">取消</button><button class="auth-submit" type="submit">验证并进入</button></div></form>';
  document.body.append(overlay);

  const authForm = document.getElementById("atelierAuthForm");
  const passwordInput = document.getElementById("atelierPassword");
  const authError = document.getElementById("atelierAuthError");
  const authSubmit = authForm.querySelector('[type="submit"]');

  function setStatus(message, description) {
    status.textContent = message;
    if (description) note.textContent = description;
  }
  function openLogin() {
    authError.textContent = "";
    overlay.classList.add("open");
    passwordInput.value = "";
    passwordInput.focus();
  }
  function closeLogin() {
    overlay.classList.remove("open");
    loginButton.focus();
  }

  loginButton.addEventListener("click", () => {
    if (sessionToken) {
      sessionToken = null;
      setStatus("尚未登录", "已退出工作室。再次发送消息时需要重新登录。");
      loginButton.textContent = "登录工作室";
      loginButton.setAttribute("aria-label", "登录工作室");
      return;
    }
    openLogin();
  });
  document.getElementById("atelierAuthCancel").addEventListener("click", closeLogin);
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeLogin();
  });

  authForm.addEventListener("submit", async event => {
    event.preventDefault();
    const password = passwordInput.value;
    if (!password) return;
    authSubmit.disabled = true;
    authError.textContent = "正在验证…";
    try {
      const response = await fetch(API_BASE + "/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || typeof data.token !== "string") {
        throw new Error(data?.error?.message || "登录失败，请检查后端配置。");
      }
      sessionToken = data.token;
      setStatus("工作室已登录", "已通过工作室后端建立会话。发送消息时将调用已配置的模型服务。");
      loginButton.textContent = "退出登录";
      loginButton.setAttribute("aria-label", "退出工作室登录");
      closeLogin();
      if (pendingMessage) {
        const queued = pendingMessage;
        pendingMessage = "";
        await window.sendMessage(queued);
      }
    } catch (error) {
      authError.textContent = error instanceof Error ? error.message : "暂时无法连接工作室后端。";
    } finally {
      authSubmit.disabled = false;
    }
  });

  window.sendMessage = async function sendToModel(text) {
    const content = String(text || "").trim();
    if (!content || busy) return;
    if (!sessionToken) {
      pendingMessage = content;
      openLogin();
      authError.textContent = "请先登录，登录成功后会继续发送这条消息。";
      return;
    }

    let chat = current();
    if (!chat) {
      chat = { id: makeId(), title: content.slice(0, 24), updated: Date.now(), messages: [] };
      chats.unshift(chat);
      activeId = chat.id;
    }
    if (!chat.messages.length) chat.title = content.replace(/\s+/g, " ").slice(0, 24);
    chat.messages.push({ role: "user", content, time: Date.now() });
    chat.updated = Date.now();
    saveChats();
    prompt.value = "";
    resizePrompt();
    busy = true;
    sendButton.disabled = true;
    setStatus("正在思考…", "消息已发送到工作室后端，正在等待模型回复。");
    render();

    try {
      const messages = chat.messages
        .filter(message => ["user", "assistant"].includes(message.role))
        .slice(-20)
        .map(message => ({ role: message.role, content: message.content }));
      const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
      if (totalChars > 12000) throw new Error("当前对话上下文超过 12,000 字，请新建对话后继续。");

      const response = await fetch(API_BASE + "/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + sessionToken
        },
        body: JSON.stringify({ messages, max_tokens: 800 })
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        sessionToken = null;
        loginButton.textContent = "登录工作室";
        loginButton.setAttribute("aria-label", "登录工作室");
        throw new Error("登录会话已过期，请重新登录后再发送。");
      }
      if (!response.ok || !data.ok || typeof data.message?.content !== "string") {
        throw new Error(data?.error?.message || "模型暂时无法回复，请稍后重试。");
      }

      chat.messages.push({ role: "assistant", content: data.message.content, time: Date.now() });
      chat.updated = Date.now();
      saveChats();
      setStatus("模型已连接", "当前模型：" + (data.model || "已配置模型") + "。对话保存在此浏览器。");
    } catch (error) {
      setStatus(sessionToken ? "连接暂时中断" : "需要重新登录", "本条消息已保存在本机；模型未成功回复。你可以检查网络或重新登录后重试。");
      window.alert(error instanceof Error ? error.message : "发送失败，请稍后重试。");
    } finally {
      busy = false;
      render();
      sendButton.disabled = !prompt.value.trim();
      prompt.focus();
    }
  };

  setStatus("尚未登录", "登录后，消息将通过工作室后端发送给模型。");
})();