"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { usePackEditor } from "@/components/packs/usePackEditor";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { STATUS_LABEL, buildCoverRows } from "@/lib/cover";
import { formatDate, formatDateTime } from "@/lib/format";
import { computeCompleteness } from "@/lib/validation/pack";

/** A plain, printable checklist for paper submissions or a hand-over: what is in the pack and what is not. */
export default function CoverSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { pack } = usePackEditor(id);
  if (!pack) {
    return <EmptyState title="Pack not found" action={<LinkButton href="/">Back to dashboard</LinkButton>}>This draft does not exist in this browser.</EmptyState>;
  }
  const rows = buildCoverRows(pack);
  const c = computeCompleteness(pack.slots);
  const meta: [string, string][] = [
    ["Client / organisation", pack.organisationName],
    ["Submission type", pack.submissionType],
    ["Reference", pack.referenceNumber],
    ["Due date", pack.dueDate ? formatDate(pack.dueDate) : ""],
    ["Checklist", pack.templateName],
  ];

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <LinkButton href={`/packs/${pack.id}`}><ArrowLeft className="h-4 w-4" aria-hidden /> Back to builder</LinkButton>
        <Button variant="primary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden /> Print cover sheet</Button>
        <p className="text-xs text-slate-300">Prints as black on white. It shows the pack as it is now, including what is missing.</p>
      </div>

      <article aria-label="Cover sheet" className="glass rounded-xl p-6 print:p-0">
        <h1 className="text-2xl font-semibold">{pack.name}</h1>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          {meta.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-slate-400">{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 text-sm font-semibold">
          {c.ready ? "All required documents are attached." : `Not complete: ${c.missing.length} required document${c.missing.length === 1 ? " is" : "s are"} missing.`}
        </p>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm">This pack has no document slots yet.</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <caption className="sr-only">Documents in this pack, in order</caption>
            <thead>
              <tr className="border-b border-white/20 text-xs uppercase tracking-wide text-slate-300">
                <th scope="col" className="py-2 pr-2">No.</th>
                <th scope="col" className="py-2 pr-2">Document</th>
                <th scope="col" className="py-2 pr-2">Required</th>
                <th scope="col" className="py-2 pr-2">Status</th>
                <th scope="col" className="py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.n} className="break-inside-avoid border-b border-white/10 align-top">
                  <td className="py-2 pr-2">{r.n}</td>
                  <td className="py-2 pr-2 font-medium">{r.name}{r.formRef && <span className="block text-xs font-normal text-slate-300">{r.formRef}</span>}</td>
                  <td className="py-2 pr-2">{r.required ? "Required" : "Optional"}</td>
                  <td className="py-2 pr-2 font-semibold">{STATUS_LABEL[r.status]}</td>
                  <td className="py-2 break-words">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pack.notes && <p className="mt-4 text-sm"><strong>Notes:</strong> {pack.notes}</p>}
        <p className="mt-6 text-xs text-slate-400">Printed {formatDateTime(new Date().toISOString())} from Docutile. Check the receiving office&apos;s current requirements before you lodge.</p>
      </article>
    </>
  );
}
