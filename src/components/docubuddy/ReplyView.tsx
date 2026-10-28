import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Action, Block, Focus, Reply } from "@/lib/docubuddy/types";

const pill = "inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-left text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300";

function ActionButton({ action, onAsk, onNavigate }: { action: Action; onAsk: (text: string, focus?: Focus) => void; onNavigate: () => void }) {
  if (action.kind === "ask") {
    return <button type="button" onClick={() => onAsk(action.text, action.focus)} className={`${pill} border-cyan-300/50 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20`}>{action.label}</button>;
  }
  if (action.kind === "external") {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={`${pill} border-white/20 bg-white/5 text-slate-100 hover:bg-white/10`}>
        {action.label} <ExternalLink className="h-3 w-3" aria-hidden /><span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }
  return <Link href={action.href} onClick={onNavigate} className={`${pill} border-violet-300/50 bg-violet-400/15 text-slate-50 hover:bg-violet-400/25`}>{action.label}</Link>;
}

function BlockView({ block, onAsk, onNavigate }: { block: Block; onAsk: (text: string, focus?: Focus) => void; onNavigate: () => void }) {
  switch (block.type) {
    case "heading":
      return <p className="mt-2 text-sm font-semibold text-slate-50">{block.text}</p>;
    case "text": {
      const tone = block.tone === "warn" ? "rounded-md border border-amber-400/40 bg-amber-400/10 p-2 text-amber-100" : block.tone === "note" ? "text-xs text-slate-300" : "text-slate-100";
      return <p className={`text-sm ${tone}`}>{block.text}</p>;
    }
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className={`space-y-1 pl-5 text-sm text-slate-100 ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((item, i) => (
            <li key={`${i}-${item.text}`}>
              {item.text}
              {item.badge && <span className="ml-2 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[0.7rem] text-slate-100">{item.badge}</span>}
              {item.detail && <span className="block text-xs text-slate-300">{item.detail}</span>}
            </li>
          ))}
        </List>
      );
    }
    case "actions":
      return <div className="flex flex-wrap gap-1.5 pt-1">{block.actions.map((a, i) => <ActionButton key={`${i}-${a.label}`} action={a} onAsk={onAsk} onNavigate={onNavigate} />)}</div>;
  }
}

/** A Docubuddy reply, drawn as text only: nothing in it is ever treated as HTML. */
export function ReplyView({ reply, onAsk, onNavigate }: { reply: Reply; onAsk: (text: string, focus?: Focus) => void; onNavigate: () => void }) {
  return <div className="space-y-2">{reply.blocks.map((b, i) => <BlockView key={i} block={b} onAsk={onAsk} onNavigate={onNavigate} />)}</div>;
}
