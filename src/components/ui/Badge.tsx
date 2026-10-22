import type { ReactNode } from "react";

const tones = {
  neutral: "bg-white/10 text-slate-200 border-white/20",
  required: "bg-amber-400/10 text-amber-200 border-amber-400/40",
  success: "bg-emerald-400/10 text-emerald-200 border-emerald-400/40",
  info: "bg-cyan-400/10 text-cyan-200 border-cyan-400/40",
  danger: "bg-red-400/10 text-red-200 border-red-400/40",
};

export function Badge({ tone = "neutral", icon, children }: { tone?: keyof typeof tones; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
