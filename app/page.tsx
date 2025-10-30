"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";
type Message = { role: Role; content: string };

const DEFAULT_MODEL = "gemini-2.5-flash";

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const listRef = useRef<HTMLDivElement>(null);

  // Load from localStorage once
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chat_messages");
      if (saved) setMessages(JSON.parse(saved));
      const savedModel = localStorage.getItem("chat_model");
      if (savedModel) setModel(savedModel);
    } catch {}
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("chat_messages", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem("chat_model", model);
    } catch {}
  }, [model]);

  // Auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, isLoading]);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!canSend) return;
    const userText = input.trim();
    setInput("");
    setError(null);
    const nextMessages: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, model }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }
      const data: { reply: string } = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [canSend, input, messages, model]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 h-[var(--header-height)] border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-3xl items-center justify-between px-4">
          <h1 className="text-lg font-semibold">GDU AI Mentor</h1>
          <div className="flex items-center gap-2">
            <select
              aria-label="Model selector"
              className="rounded-md border bg-white px-2 py-1 text-sm"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
              <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
            </select>
            <button
              onClick={handleClear}
              className="rounded-md border px-3 py-1 text-sm hover:bg-neutral-50"
            >
              Xóa
            </button>
          </div>
        </div>
      </header>

      <section ref={listRef} className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-neutral-500">
            Start the conversation by asking a question.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === "user" ? "self-end" : "self-start"}>
                <div
                  className={
                    "max-w-[80ch] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 shadow-sm " +
                    (m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-neutral-900 border")
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="self-start">
                <div className="max-w-[80ch] rounded-2xl border bg-white px-4 py-3 text-neutral-500 shadow-sm">
                  Thinking…
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="sticky bottom-0 border-t bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {error && (
            <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Type a message..."
              className="max-h-40 flex-1 resize-none rounded-xl border bg-white px-3 py-3 shadow-sm focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!canSend}
              className="rounded-xl bg-blue-600 px-4 py-3 text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">Enter to send • Shift+Enter for new line</p>
        </div>
      </footer>
    </main>
  );
}
