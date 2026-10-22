import { Badge } from "@/components/ui/Badge";
import { CHECKLIST_LABEL } from "@/lib/templates/categories";
import type { ChecklistStatus } from "@/types";

export function ChecklistBadge({ status }: { status?: ChecklistStatus }) {
  if (!status) return null;
  const { label, help } = CHECKLIST_LABEL[status];
  return (
    <span title={help}>
      <Badge tone={status === "published" ? "success" : "required"}>{label}</Badge>
    </span>
  );
}
