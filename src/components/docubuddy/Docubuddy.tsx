"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, Send, Trash2, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { PRIVACY, answer } from "@/lib/docubuddy/answer";
import type { Focus, Reply } from "@/lib/docubuddy/types";
import { ReplyView } from "./ReplyView";

interface Message { id: number; from: "user" | "bot"; text?: string; reply?: Reply }

/** The pack open on screen, from its address (/packs/<id>, not /packs/new). */
function packIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/packs\/([^/]+)/);
  return m && m[1] !== "new" ? m[1] : undefined;
}

const greeting = (): Message => ({ id: 0, from: "bot", reply: answer("help", { templates: [], packs: [] }) });

/**
 * Docubuddy: a built-in assistant that answers from Docutile's own checklists and the user's own packs. It runs in the
 * browser, uses no outside AI service and sends nothing anywhere.
 */
export function Docubuddy() {
  const { templates, packs } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [greeting()]);
  const [focus, setFocus] = useState<Focus | undefined>();
  const [input, setInput] = useState("");
  const nextId = useRef(1);
  const launcher = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) field.current?.focus(); }, [open]);
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [messages, open]);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  function send(question: string, withFocus?: Focus) {
    const q = question.trim().slice(0, 300);
    if (!q) return;
    const reply = answer(q, { templates, packs, currentPackId: packIdFromPath(pathname), focus: withFocus ?? focus });
    setFocus(reply.focus ?? withFocus ?? focus);
    setMessages((m) => [...m, { id: nextId.current++, from: "user", text: q }, { id: nextId.current++, from: "bot", reply }]);
    setInput("");
  }

  function clear() {
    setMessages([greeting()]);
    setFocus(undefined);
    field.current?.focus();
  }

  return (
    <div className="no-print">
      {open && (
        <section
          id="docubuddy-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Docubuddy assistant"
          onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); close(); } }}
          className="fixed bottom-20 right-4 z-40 flex max-h-[min(38rem,calc(100dvh-6.5rem))] w-[min(26rem,calc(100vw-2rem))] flex-col rounded-2xl border border-cyan-300/40 bg-slate-950/97 shadow-[0_0_40px_rgba(34,211,238,0.2),0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <header className="flex items-center justify-between gap-2 border-b border-white/10 p-3">
            <p className="flex items-center gap-2 font-semibold text-slate-50"><Bot className="h-5 w-5" aria-hidden /> Docubuddy</p>
            <div className="flex gap-1">
              <button type="button" onClick={clear} aria-label="Clear the conversation" title="Clear the conversation" className="rounded p-2 text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><Trash2 className="h-4 w-4" aria-hidden /></button>
              <button type="button" onClick={close} aria-label="Close Docubuddy" className="rounded p-2 text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><X className="h-4 w-4" aria-hidden /></button>
            </div>
          </header>

          <div ref={log} role="log" aria-live="polite" aria-label="Conversation" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => m.from === "user" ? (
              <p key={m.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-sm text-slate-50">{m.text}</p>
            ) : (
              <div key={m.id} className="max-w-full rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 p-3">
                <ReplyView reply={m.reply!} onAsk={send} onNavigate={() => setOpen(false)} />
              </div>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-white/10 p-3">
            <div className="flex gap-2">
              <input
                ref={field}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={300}
                aria-label="Ask Docubuddy"
                placeholder="Ask about a service, a form or your packs"
                autoComplete="off"
                className="glass-input h-10 min-w-0 flex-1 rounded-md px-3 text-sm text-slate-50 placeholder:text-slate-400 focus-visible:outline-none"
              />
              <button type="submit" disabled={!input.trim()} aria-label="Send" className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-r from-cyan-700 to-violet-700 text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-[0.7rem] text-slate-400">{PRIVACY}</p>
          </form>
        </section>
      )}
      <button
        ref={launcher}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="docubuddy-panel"
        className="glass-strong fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-slate-50 hover:shadow-[0_0_24px_rgba(34,211,238,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
      >
        <Bot className="h-5 w-5" aria-hidden /> Docubuddy
      </button>
    </div>
  );
}
