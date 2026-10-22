import { CheckCircle2, CircleDashed, Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Pack } from "@/types";

export function PackStatusBadge({ status }: { status: Pack["status"] }) {
  if (status === "exported") return <Badge tone="info" icon={<Download className="h-3 w-3" aria-hidden />}>Exported</Badge>;
  if (status === "ready") return <Badge tone="success" icon={<CheckCircle2 className="h-3 w-3" aria-hidden />}>Ready</Badge>;
  return <Badge icon={<CircleDashed className="h-3 w-3" aria-hidden />}>Draft</Badge>;
}
