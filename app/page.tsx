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
  // language default: vi (user requested default Vietnam)
  const [lang, setLang] = useState<"en" | "vi">("vi");
  const t = LOCALES[lang];

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]); // current session mirror
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* load persisted state on mount */
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
      else setLang("vi"); // default vi
    } catch {
      // ignore
    } finally {
      setMounted(true);
    }
  }, []);

  /* persist sessions/model/lang */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  useEffect(() => {
    try {
      if (currentSessionId) localStorage.setItem(STORAGE_KEYS.CURRENT, currentSessionId);
    } catch {}
  }, [currentSessionId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MODEL, model);
    } catch {}
  }, [model]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LANG, lang);
    } catch {}
  }, [lang]);

  /* ensure at least one session exists on first load */
  useEffect(() => {
    if (sessions.length === 0) {
      const s: Session = {
        id: uid("s_"),
        title: LOCALES[lang].sessionUntitled,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      setSessions([s]);
      setCurrentSessionId(s.id);
      setMessages([]);
    } else if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.length]);

  /* sync messages when currentSessionId or sessions length changes */
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }
    const s = sessions.find((x) => x.id === currentSessionId);
    setMessages(s ? s.messages || [] : []);
  }, [currentSessionId, sessions.length]);

  /* auto-scroll when messages change */
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  /* helpers to update sessions */
  const updateSessionMessages = useCallback((sessionId: string | null, msgs: Message[]) => {
    if (!sessionId) return;
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, messages: msgs } : s)));
  }, []);

  const renameSession = useCallback((id: string, title: string) => {
    if (!title || !title.trim()) return;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: title.trim() } : s)));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) {
      const rest = sessions.filter((s) => s.id !== id);
      if (rest.length) setCurrentSessionId(rest[0].id);
      else {
        // create a fresh one
        const fresh: Session = { id: uid("s_"), title: LOCALES[lang].sessionUntitled, messages: [], createdAt: new Date().toISOString() };
        setSessions([fresh]);
        setCurrentSessionId(fresh.id);
      }
    }
  }, [currentSessionId, sessions, lang]);

  const createNewSession = useCallback(() => {
    const s: Session = { id: uid("s_"), title: LOCALES[lang].sessionUntitled, messages: [], createdAt: new Date().toISOString() };
    setSessions((prev) => [s, ...prev]);
    setCurrentSessionId(s.id);
    setMessages([]);
    setError(null);
  }, [lang]);

  /* filter sessions for search */
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.messages || []).some((m) => m.content.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery]);

  /* model description localized */
  const modelDescription = useMemo(() => {
    const notes = LOCALES[lang].modelNotes as Record<string, string>;
    return notes[model] ?? notes.default;
  }, [model, lang]);

  /* --- Auto-rename session based on first user message --- */
  useEffect(() => {
    // If current session titled as untitled and there's a first user message, set title
    if (!currentSessionId) return;
    const s = sessions.find((x) => x.id === currentSessionId);
    if (!s) return;
    const isUntitled = (s.title || "").trim() === LOCALES[lang].sessionUntitled || (s.title || "") === "";
    if (isUntitled) {
      const firstUser = (s.messages || []).find((m) => m.role === "user");
      if (firstUser && firstUser.content) {
        const newTitle = truncateText(firstUser.content, 40);
        setSessions((prev) => prev.map((sess) => (sess.id === s.id ? { ...sess, title: newTitle } : sess)));
      }
    }
  }, [sessions, currentSessionId, lang]);

  /* send message with Abort support */
  const send = useCallback(
    async (createIfNoSession = true) => {
      if (!input.trim() || isLoading) return;
      setError(null);

      // ensure session
      if (!currentSessionId && createIfNoSession) {
        const s: Session = { id: uid("s_"), title: LOCALES[lang].sessionUntitled, messages: [], createdAt: new Date().toISOString() };
        setSessions((prev) => [s, ...prev]);
        setCurrentSessionId(s.id);
      }

      // append user message
      const userMsg: Message = { id: uid("m_"), role: "user", content: input.trim() };
      const nextMessages = [...(messages || []), userMsg];
      setMessages(nextMessages);
      updateSessionMessages(currentSessionId || null, nextMessages);

      // clear input before sending
      setInput("");
      setIsLoading(true);

      // create an AbortController for this request and save it to ref
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

        const data = await res.json(); // expecting { reply }
        const assistantMsg: Message = { id: uid("m_"), role: "assistant", content: data.reply ?? "" };
        const after = [...nextMessages, assistantMsg];
        setMessages(after);
        updateSessionMessages(currentSessionId || null, after);
      } catch (e: any) {
        if (e?.name === "AbortError") {
          // user stopped the generation
          // Put last user content back to input for editing and remove it from messages
          const lastUser = (messages || []).length ? (messages as Message[]).slice(-0) : null;
          // Our `userMsg` was appended to messages state before sending; we remove it
          setMessages((prev) => {
            const withoutLastUser = prev.filter((m) => m.id !== userMsg.id);
            updateSessionMessages(currentSessionId || null, withoutLastUser);
            return withoutLastUser;
          });
          setInput(userMsg.content); // let user edit
          setError(null);
        } else {
          // Friendly error mapping
          const msg = (e?.message || "").toLowerCase();
          if (msg.includes("503") || msg.includes("unavailable") || msg.includes("overloaded")) setError(LOCALES[lang].errors.unavailable);
          else if (msg.includes("network") || msg.includes("fetch")) setError(LOCALES[lang].errors.network);
          else if (msg.includes("timeout")) setError(LOCALES[lang].errors.timeout);
          else if (msg.includes("api key")) setError(LOCALES[lang].errors.apikey);
          else setError(LOCALES[lang].errors.generic);
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [input, isLoading, messages, currentSessionId, model, lang, updateSessionMessages]
  );

  /* stop currently inflight request */
  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  /* keyboard handler */
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send(true);
      }
    },
    [send]
  );

  /* edit message inline: allow editing existing message by id */
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

  /* formatted date helper */
  const formatDate = useCallback((iso?: string) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
  }, []);

  /* UI render */
  return (
    <main style={{ backgroundColor: theme.bgMain, color: theme.textMain }} className="min-h-screen flex">
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
          {/* header */}
          <div className="px-3 py-3 flex items-center justify-between border-b" style={{ borderColor: theme.accent + "33" }}>
            <div className="flex items-center gap-2">
              <button onClick={() => setSidebarOpen((s) => !s)} className="p-1 rounded hover:bg-white/5" title={sidebarOpen ? "Collapse" : "Expand"}>
                {sidebarOpen ? "«" : "»"}
              </button>

              <motion.span initial={false} animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "auto" : 0 }} transition={{ duration: 0.18 }} className="font-semibold overflow-hidden whitespace-nowrap">
                {sidebarOpen ? (mounted ? LOCALES[lang].newChat : LOCALES.en.newChat) : null}
              </motion.span>
            </div>

            {sidebarOpen && (
              <button onClick={createNewSession} className="px-2 py-1 rounded border text-sm" style={{ borderColor: theme.accent, color: theme.textMain, background: theme.bgMain }}>
                + 
              </button>
            )}
          </div>

          {/* search */}
          <div className="px-3 py-2">
            {sidebarOpen ? (
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={mounted ? LOCALES[lang].searchPlaceholder : LOCALES.en.searchPlaceholder}
                className="w-full rounded px-3 py-2 text-sm"
                style={{ background: theme.bgMain, border: `1px solid ${theme.accent}`, color: theme.textMain }}
              />
            ) : (
              <div className="flex justify-center py-3">
                <button title={mounted ? LOCALES[lang].searchPlaceholder : LOCALES.en.searchPlaceholder} onClick={() => setSidebarOpen(true)} className="p-1 rounded hover:bg-white/5">
                  🔎
                </button>
              </div>
            )}
          </div>

          {/* sessions list */}
          <div className="px-2 py-2 flex-1 overflow-auto">
            {filteredSessions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">{mounted ? LOCALES[lang].noResults : LOCALES.en.noResults}</div>
            ) : (
              filteredSessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    setError(null);
                  }}
                  className={`px-3 py-2 my-1 rounded cursor-pointer flex items-center justify-between hover:bg-white/5 ${currentSessionId === s.id ? "ring-2" : ""}`}
                  style={{ background: currentSessionId === s.id ? theme.bgMain : "transparent", borderColor: currentSessionId === s.id ? theme.accent : "transparent" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.title || (mounted ? LOCALES[lang].sessionUntitled : LOCALES.en.sessionUntitled)}</div>
                    <div className="text-xs opacity-70">{formatDate(s.createdAt)}</div>
                  </div>

                  <div className="ml-2 flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newTitle = prompt(mounted ? LOCALES[lang].renamePrompt : LOCALES.en.renamePrompt, s.title) || s.title;
                        renameSession(s.id, newTitle);
                      }}
                      className="text-xs px-2 py-1 rounded hover:bg-white/5"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(mounted ? LOCALES[lang].confirmDelete : LOCALES.en.confirmDelete)) deleteSession(s.id);
                      }}
                      className="text-xs px-2 py-1 rounded hover:bg-white/5"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

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

      {/* Main chat column */}
      <div className="flex-1 flex flex-col">
        {/* header */}
        <header className="sticky top-0 z-20 border-b" style={{ background: theme.bgCard, borderColor: theme.accent + "33" }}>
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{mounted ? LOCALES[lang].appName : LOCALES.en.appName}</h2>
              <div className="text-xs opacity-80">{lang === "vi" ? "(VN)" : ""}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm opacity-80">{mounted ? LOCALES[lang].modelLabel : LOCALES.en.modelLabel}</div>
              <div className="text-sm font-medium">{model}</div>
            </div>
          </div>
        </header>

        {/* chat area */}
        <section ref={listRef} className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-4xl flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-400">{mounted ? LOCALES[lang].startHint : LOCALES.en.startHint}</div>
            ) : (
              messages.map((m) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] px-4 py-3 rounded-2xl shadow ${m.role === "user" ? "bg-[#A7D0D6] text-[#24282B]" : "bg-[#36436F] text-[#F7E1BC]"}`}>
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.content}</div>
                  </div>
                </motion.div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 bg-[#36436F] text-[#A7D0D6]">
                  <span className="w-2 h-2 rounded-full bg-[#A7D0D6] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[#A7D0D6] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-[#A7D0D6] animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* input area */}
        <footer className="sticky bottom-0 border-t" style={{ background: theme.bgCard, borderColor: theme.accent + "33" }}>
          <div className="mx-auto max-w-4xl px-4 py-3">
            {error && (
              <div className="mb-2 rounded-md px-3 py-2 text-sm" style={{ background: `${theme.warning}22`, border: `1px solid ${theme.warning}`, color: theme.textMain }}>
                {error}
              </div>
            )}

            <div className="flex items-end gap-3">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} rows={1} placeholder={mounted ? LOCALES[lang].placeholder : LOCALES.en.placeholder} className="flex-1 rounded-2xl px-4 py-3 text-sm" style={{ background: theme.bgMain, color: theme.textMain, border: `1px solid ${theme.accent}` }} />

              {/* send / stop button */}
              {!isLoading ? (
                editingMessageId ? (
                  <div className="flex gap-2">
                    <button onClick={saveEditMessage} className="rounded-2xl px-4 py-3 font-medium" style={{ background: theme.accent, color: theme.bgMain }}>
                      Save
                    </button>
                    <button onClick={() => { setEditingMessageId(null); setInput(""); }} className="rounded-2xl px-4 py-3 border" style={{ borderColor: theme.accent, color: theme.textMain }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => send(true)} disabled={!input.trim()} className="rounded-2xl px-4 py-3 font-medium" style={{ background: theme.accent, color: theme.bgMain }}>
                    ➤
                  </button>
                )
              ) : (
                <button onClick={stopGeneration} className="rounded-2xl px-4 py-3 font-medium" style={{ background: theme.warning, color: theme.textMain }}>
                  ⏹
                </button>
              )}
            </div>

            <div className="text-center text-xs opacity-70 mt-2">{mounted ? LOCALES[lang].sendingHint : LOCALES.en.sendingHint}</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
