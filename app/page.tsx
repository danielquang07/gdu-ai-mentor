"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/* -------------------------
   Types & constants
   ------------------------- */
type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string };
type Session = { id: string; title: string; messages: Message[]; createdAt: string };

const DEFAULT_MODEL = "gemini-2.5-flash";
const STORAGE_KEYS = {
  SESSIONS: "chat_sessions",
  CURRENT: "chat_current_session",
  MODEL: "chat_model",
  LANG: "ui_lang",
};

/* palette provided */
const theme = {
  bgMain: "#24282B",
  bgCard: "#36436F",
  textMain: "#F7E1BC",
  accent: "#A7D0D6",
  warning: "#B6000F",
};

/* localization */
const LOCALES = {
  en: {
    appName: "GDU AI Mentor",
    modelLabel: "Model:",
    newChat: "New Chat",
    searchPlaceholder: "Search chats...",
    clearAll: "Clear All",
    startHint: "Start the conversation by asking a question 👋",
    placeholder: "💭 Ask anything...",
    sendingHint: "Enter to send • Shift+Enter for newline",
    modelNotes: {
      "gemini-2.5-flash": "⚡ Fast — balanced speed & quality.",
      "gemini-2.5-pro": "💡 High accuracy — for complex tasks.",
      "gemini-2.5-flash-lite": "🌱 Lightweight — quick responses.",
      "gemini-2.0-flash": "✨ Stable and fast.",
      "gemini-2.0-flash-lite": "🌤️ Compact version for casual chat.",
      default: "🤖 AI chat model.",
    },
    errors: {
      unavailable: "💫 The model is busy — please try again in a few seconds!",
      network: "📡 Network issue — check your connection and try again.",
      timeout: "⏳ Response is slow — try again in a moment.",
      apikey: "🔑 Missing or invalid API key — check your server config.",
      generic: "⚠️ Something went wrong — please try again.",
    },
    sessionUntitled: "Untitled chat",
    noResults: "No chats found.",
    languageLabel: "EN",
    confirmDelete: "Delete this chat?",
    confirmClearAll: "Clear all sessions?",
    renamePrompt: "Rename chat",
  },
  vi: {
    appName: "GDU AI Mentor",
    modelLabel: "Mô hình:",
    newChat: "Cuộc trò chuyện mới",
    searchPlaceholder: "Tìm kiếm cuộc trò chuyện...",
    clearAll: "Xóa tất cả",
    startHint: "Bắt đầu cuộc trò chuyện bằng cách đặt câu hỏi 👋",
    placeholder: "💭 Hỏi bất cứ điều gì...",
    sendingHint: "⏎ Enter để gửi • Shift+Enter để xuống dòng",
    modelNotes: {
      "gemini-2.5-flash": "⚡ Nhanh — cân bằng tốc độ & chất lượng.",
      "gemini-2.5-pro": "💡 Chính xác — phù hợp tác vụ phức tạp.",
      "gemini-2.5-flash-lite": "🌱 Nhẹ — phản hồi nhanh.",
      "gemini-2.0-flash": "✨ Ổn định và nhanh.",
      "gemini-2.0-flash-lite": "🌤️ Phiên bản gọn cho chat hàng ngày.",
      default: "🤖 Mô hình AI hỗ trợ trò chuyện.",
    },
    errors: {
      unavailable: "💫 Mô hình đang bận — vui lòng thử lại sau vài giây!",
      network: "📡 Lỗi mạng — kiểm tra kết nối và thử lại.",
      timeout: "⏳ Phản hồi chậm — vui lòng thử lại sau.",
      apikey: "🔑 Thiếu hoặc sai API key — kiểm tra cấu hình server.",
      generic: "⚠️ Có lỗi xảy ra — vui lòng thử lại.",
    },
    sessionUntitled: "Cuộc trò chuyện chưa đặt tên",
    noResults: "Không tìm thấy cuộc trò chuyện.",
    languageLabel: "VI",
    confirmDelete: "Xóa cuộc trò chuyện này?",
    confirmClearAll: "Xóa tất cả cuộc trò chuyện?",
    renamePrompt: "Đổi tên cuộc trò chuyện",
  },
} as const;

/* -------------------------
   helpers
   ------------------------- */
const uid = (prefix = "") => prefix + Math.random().toString(36).slice(2, 9);
function truncateText(s: string, n = 40) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n).trim() + "…" : s.trim();
}

/* -------------------------
   Component
   ------------------------- */
export default function Page() {
  const [lang, setLang] = useState<"en" | "vi">("vi");
  const t = LOCALES[lang];
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* load persisted state */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (raw) setSessions(JSON.parse(raw));
      const cur = localStorage.getItem(STORAGE_KEYS.CURRENT);
      if (cur) setCurrentSessionId(cur);
      const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
      if (savedModel) setModel(savedModel);
      const savedLang = localStorage.getItem(STORAGE_KEYS.LANG);
      if (savedLang === "vi" || savedLang === "en") setLang(savedLang);
      else setLang("vi");
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }, [sessions]);
  useEffect(() => {
    if (currentSessionId) localStorage.setItem(STORAGE_KEYS.CURRENT, currentSessionId);
  }, [currentSessionId]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODEL, model);
  }, [model]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  }, [lang]);

  /* ensure at least one session */
  useEffect(() => {
    if (sessions.length === 0) {
      const s: Session = { id: uid("s_"), title: t.sessionUntitled, messages: [], createdAt: new Date().toISOString() };
      setSessions([s]);
      setCurrentSessionId(s.id);
      setMessages([]);
    } else if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions.length]);

  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }
    const s = sessions.find((x) => x.id === currentSessionId);
    setMessages(s ? s.messages || [] : []);
  }, [currentSessionId, sessions.length]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const updateSessionMessages = useCallback((sessionId: string | null, msgs: Message[]) => {
    if (!sessionId) return;
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, messages: msgs } : s)));
  }, []);

  // sessions can still be managed via createNewSession and clear-all below

  const createNewSession = useCallback(() => {
    const s: Session = { id: uid("s_"), title: t.sessionUntitled, messages: [], createdAt: new Date().toISOString() };
    setSessions((prev) => [s, ...prev]);
    setCurrentSessionId(s.id);
    setMessages([]);
    setError(null);
  }, [lang]);

  // search and filtered list removed per request

  const modelDescription = useMemo(() => {
    const notes = LOCALES[lang].modelNotes as Record<string, string>;
    return notes[model] ?? notes.default;
  }, [model, lang]);

  useEffect(() => {
    if (!currentSessionId) return;
    const s = sessions.find((x) => x.id === currentSessionId);
    if (!s) return;
    const isUntitled = (s.title || "").trim() === t.sessionUntitled || (s.title || "") === "";
    if (isUntitled) {
      const firstUser = (s.messages || []).find((m) => m.role === "user");
      if (firstUser && firstUser.content) {
        const newTitle = truncateText(firstUser.content, 40);
        setSessions((prev) => prev.map((sess) => (sess.id === s.id ? { ...sess, title: newTitle } : sess)));
      }
    }
  }, [sessions, currentSessionId, lang]);

  const send = useCallback(
    async (createIfNoSession = true) => {
      if (!input.trim() || isLoading) return;
      setError(null);
      if (!currentSessionId && createIfNoSession) {
        const s: Session = { id: uid("s_"), title: t.sessionUntitled, messages: [], createdAt: new Date().toISOString() };
        setSessions((prev) => [s, ...prev]);
        setCurrentSessionId(s.id);
      }
      const userMsg: Message = { id: uid("m_"), role: "user", content: input.trim() };
      const nextMessages = [...(messages || []), userMsg];
      setMessages(nextMessages);
      updateSessionMessages(currentSessionId || null, nextMessages);
      setInput("");
      setIsLoading(true);
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages, model }),
          signal: ac.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Request failed: ${res.status}`);
        }
        const data = await res.json();
        const assistantMsg: Message = { id: uid("m_"), role: "assistant", content: data.reply ?? "" };
        const after = [...nextMessages, assistantMsg];
        setMessages(after);
        updateSessionMessages(currentSessionId || null, after);
      } catch (e: any) {
        const msg = (e?.message || "").toLowerCase();
        if (msg.includes("abort")) {
          const lastUser = messages.length ? messages.slice(-0) : null;
          setMessages((prev) => {
            const withoutLastUser = prev.filter((m) => m.id !== userMsg.id);
            updateSessionMessages(currentSessionId || null, withoutLastUser);
            return withoutLastUser;
          });
          setInput(userMsg.content);
        } else if (msg.includes("503") || msg.includes("unavailable")) setError(t.errors.unavailable);
        else if (msg.includes("network")) setError(t.errors.network);
        else if (msg.includes("timeout")) setError(t.errors.timeout);
        else if (msg.includes("api key")) setError(t.errors.apikey);
        else setError(t.errors.generic);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [input, isLoading, messages, currentSessionId, model, lang, updateSessionMessages]
  );

  const stopGeneration = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send(true);
      }
    },
    [send]
  );

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const startEditMessage = useCallback((msg: Message) => {
    setEditingMessageId(msg.id);
    setInput(msg.content);
  }, []);
  const saveEditMessage = useCallback(() => {
    if (!editingMessageId) return;
    const updated = messages.map((m) => (m.id === editingMessageId ? { ...m, content: input } : m));
    setMessages(updated);
    updateSessionMessages(currentSessionId || null, updated);
    setEditingMessageId(null);
    setInput("");
  }, [editingMessageId, input, messages, updateSessionMessages, currentSessionId]);

  const formatDate = useCallback((iso?: string) => (iso ? new Date(iso).toLocaleString() : ""), []);

  /* -------------------------
     UI
     ------------------------- */
  return (
    <main style={{ backgroundColor: theme.bgMain, color: theme.textMain }} className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 border-r transition-[width] duration-300 ease-in-out overflow-hidden"
        style={{
          width: sidebarOpen ? 280 : 64,
          minWidth: sidebarOpen ? 280 : 64,
          background: theme.bgCard,
          borderColor: theme.accent + "55",
        }}
      >
        <div className="h-full flex flex-col">
          <div className="px-3 py-3 flex items-center justify-between border-b" style={{ borderColor: theme.accent + "33" }}>
            <div className="flex items-center gap-2">
              <button onClick={() => setSidebarOpen((s) => !s)} className="p-1 rounded hover:bg-white/5" title={sidebarOpen ? "Collapse" : "Expand"}>
                {sidebarOpen ? "«" : "»"}
              </button>
              <motion.span
                initial={false}
                animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "auto" : 0 }}
                transition={{ duration: 0.18 }}
                className="font-semibold overflow-hidden whitespace-nowrap"
              >
                {sidebarOpen ? (mounted ? t.newChat : LOCALES.en.newChat) : null}
              </motion.span>
            </div>

            {sidebarOpen && (
              <button onClick={createNewSession} className="px-2 py-1 rounded border text-sm" style={{ borderColor: theme.accent, color: theme.textMain, background: theme.bgMain }}>
                +
              </button>
            )}
          </div>

          {/* search removed per request */}

          {/* session list removed per request */}

          {/* footer controls */}
          <div className="px-3 py-3 border-t" style={{ borderColor: theme.accent + "33" }}>
            {sidebarOpen && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs opacity-80">
                  <div>{mounted ? LOCALES[lang].modelLabel : LOCALES.en.modelLabel}</div>
                  <div className="font-semibold">{model}</div>
                </div>

                <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded px-2 py-1 text-sm" style={{ background: theme.bgMain, border: `1px solid ${theme.accent}`, color: theme.textMain }}>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
                </select>

                <div className="text-xs opacity-80">{modelDescription}</div>

                <div className="flex items-center justify-between mt-2">
                  <button onClick={() => { if (confirm(mounted ? LOCALES[lang].confirmClearAll : LOCALES.en.confirmClearAll)) { setSessions([]); const s: Session = { id: uid("s_"), title: LOCALES[lang].sessionUntitled, messages: [], createdAt: new Date().toISOString() }; setSessions([s]); setCurrentSessionId(s.id); setMessages([]); } }} className="px-2 py-1 rounded text-sm" style={{ border: `1px solid ${theme.accent}` }}>
                    {mounted ? LOCALES[lang].clearAll : LOCALES.en.clearAll}
                  </button>

                  <button onClick={() => setLang((l) => (l === "en" ? "vi" : "en"))} className="px-2 py-1 rounded border text-sm" style={{ borderColor: theme.accent, color: theme.textMain }}>
                    {LOCALES[lang].languageLabel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 py-2 border-b"
          style={{ borderColor: theme.accent + "55", background: theme.bgCard }}
        >
          <div className="font-semibold text-lg">
            {mounted ? t.appName : LOCALES.en.appName}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                background: theme.bgMain,
                border: `1px solid ${theme.accent}`,
                color: theme.textMain,
              }}
              className="rounded px-2 py-1 text-sm"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
            </select>
            <span className="text-xs opacity-80">{modelDescription}</span>
            <button
              onClick={() => setLang((prev) => (prev === "vi" ? "en" : "vi"))}
              className="px-2 py-1 border rounded"
              style={{ borderColor: theme.accent }}
            >
              {t.languageLabel}
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          style={{
            background: theme.bgMain,
            scrollBehavior: "smooth",
          }}
        >
          {messages.length === 0 && !isLoading && (
            <div className="text-center mt-8 text-slate-400 text-sm italic">
              {mounted ? t.startHint : LOCALES.en.startHint}
            </div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`p-3 rounded-xl max-w-[80%] ${
                msg.role === "user"
                  ? "ml-auto bg-blue-600/30 text-right"
                  : "mr-auto bg-slate-700/40 text-left"
              }`}
              style={{ border: `1px solid ${theme.accent}40` }}
            >
              <div className="text-xs opacity-70 mb-1 font-mono">
                {msg.role === "user" ? "👤 You" : "🤖 AI"}
              </div>
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              {msg.role === "user" && (
                <div className="mt-1 text-right">
                  <button
                    className="text-xs opacity-60 hover:opacity-100"
                    onClick={() => startEditMessage(msg)}
                  >
                    ✏️
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {isLoading && (
            <div className="text-center text-sm opacity-70 animate-pulse">
              💭 AI is thinking...
            </div>
          )}
        </div>

        {/* Footer Input */}
        <footer
          className="border-t p-3 flex flex-col"
          style={{
            borderColor: theme.accent + "55",
            background: theme.bgCard,
          }}
        >
          {error && (
            <div
              className="text-sm text-center mb-2"
              style={{ color: theme.warning }}
            >
              {error}
            </div>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={mounted ? t.placeholder : LOCALES.en.placeholder}
            className="w-full rounded p-2 resize-none text-sm"
            rows={3}
            style={{
              background: theme.bgMain,
              border: `1px solid ${theme.accent}`,
              color: theme.textMain,
            }}
          />

          <div className="flex items-center justify-between mt-2">
            <div className="text-xs opacity-70">{t.sendingHint}</div>
            <div className="flex gap-2">
              {isLoading ? (
                <button
                  onClick={stopGeneration}
                  className="text-sm px-3 py-1 border rounded"
                  style={{ borderColor: theme.warning, color: theme.warning }}
                >
                  ⏹ Stop
                </button>
              ) : editingMessageId ? (
                <button
                  onClick={saveEditMessage}
                  className="text-sm px-3 py-1 border rounded"
                  style={{ borderColor: theme.accent, color: theme.textMain }}
                >
                  💾 Save Edit
                </button>
              ) : (
                <button
                  onClick={() => send(true)}
                  disabled={isLoading || !input.trim()}
                  className="text-sm px-3 py-1 border rounded"
                  style={{
                    borderColor: theme.accent,
                    color: theme.textMain,
                    opacity: isLoading || !input.trim() ? 0.6 : 1,
                  }}
                >
                  ➤ Send
                </button>
              )}
            </div>
          </div>
        </footer>
        </div>
      </main>
  );
}
