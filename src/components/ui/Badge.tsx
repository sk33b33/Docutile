import type { ReactNode } from "react";

const tones = {
  neutral: "bg-slate-100 text-slate-700 border-slate-300",
  required: "bg-amber-50 text-amber-900 border-amber-300",
  success: "bg-green-50 text-green-800 border-green-300",
  info: "bg-blue-50 text-blue-800 border-blue-300",
  danger: "bg-red-50 text-red-800 border-red-300",
};

export function Badge({ tone = "neutral", icon, children }: { tone?: keyof typeof tones; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  );
}
