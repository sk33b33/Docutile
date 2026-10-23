import { COURT_TEMPLATES } from "./courts";
import { ESTATE_TEMPLATES } from "./estates";
import { TRUST_TEMPLATES } from "./trusts";

export { DOJ_CATEGORY, ESTATES } from "./estates";
export { TRUSTS } from "./trusts";
export { COURTS_CATEGORY, MAINTENANCE, DOMESTIC_VIOLENCE } from "./courts";

/**
 * South African Department of Justice and Constitutional Development checklists, transcribed from the official
 * pages named in each template's `source` (read 2026-10-22). Each template says how much of its document list the
 * source actually publishes (`checklist`). Requirements change: Docutile is a preparation aid, not legal advice,
 * and the office that receives the pack decides what it accepts.
 * "Required" = listed by the source without a condition. Conditional items are optional, with the condition in the
 * help text; users can change a slot's required flag in the pack builder.
 */
export const DOJ_TEMPLATES = [...ESTATE_TEMPLATES, ...TRUST_TEMPLATES, ...COURT_TEMPLATES];
