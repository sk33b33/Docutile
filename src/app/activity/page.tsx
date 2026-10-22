"use client";

import { useApp } from "@/components/providers/AppProvider";
import { EmptyState, PageHeader } from "@/components/ui/States";
import { formatDateTime } from "@/lib/format";

export default function ActivityPage() {
  const { activity, packs } = useApp();
  const name = (id: string | null) => (id ? packs.find((p) => p.id === id)?.name : undefined);
  return (
    <>
      <PageHeader title="Activity" description="Local activity history for this browser. It is informational only and is not an immutable or compliance-grade audit trail." />
      {activity.length === 0 ? (
        <EmptyState title="No activity yet">Events such as creating packs and attaching files will appear here.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {activity.slice(0, 500).map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 p-3 text-sm">
              <span className="min-w-0 break-words">{e.message}{name(e.packId) && <span className="text-slate-500"> · {name(e.packId)}</span>}</span>
              <time dateTime={e.timestamp} className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(e.timestamp)}</time>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
