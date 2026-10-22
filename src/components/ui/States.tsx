import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="title-glow text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-300">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-cyan-300/30 glass p-8 text-center">
      <h2 className="text-base font-semibold text-slate-50">{title}</h2>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-slate-300">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-6 text-sm text-slate-300">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorBanner({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div role="alert" className="flex gap-2 rounded-md border border-red-400/50 bg-red-950/60 p-3 text-sm text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.2)] backdrop-blur-xl">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div><p className="font-medium">{title}</p>{children && <div className="mt-1">{children}</div>}</div>
    </div>
  );
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full progress-glow transition-all" style={{ width: `${percent}%` }} />
    </div>
  );
}
