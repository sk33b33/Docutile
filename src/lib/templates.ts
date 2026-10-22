import { DEFAULT_ACCEPTED_TYPES, DEFAULT_MAX_FILE_SIZE_BYTES } from "./constants";
import type { Template, TemplateSlot } from "@/types";

const SEED_DATE = "2025-01-01T00:00:00.000Z";

function slot(
  id: string,
  name: string,
  description: string,
  required: boolean,
  extra: Partial<TemplateSlot> = {},
): TemplateSlot {
  return {
    id,
    name,
    description,
    required,
    acceptedTypes: DEFAULT_ACCEPTED_TYPES,
    maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
    allowMultiple: false,
    ...extra,
  };
}

function tpl(id: string, name: string, category: string, description: string, slots: TemplateSlot[]): Template {
  return { id, name, category, description, slots, builtIn: true, createdAt: SEED_DATE, updatedAt: SEED_DATE };
}

export const BUILT_IN_TEMPLATES: Template[] = [
  tpl("tpl_supplier", "Supplier onboarding", "Procurement", "Standard documents for onboarding a new supplier.", [
    slot("sup_cover", "Cover letter", "Introductory letter from the supplier.", true),
    slot("sup_reg", "Certificate of incorporation", "Company registration certificate.", true),
    slot("sup_tax", "Tax / VAT registration", "Evidence of tax registration.", true),
    slot("sup_ins", "Insurance certificates", "Public liability and professional indemnity cover.", true, { allowMultiple: true }),
    slot("sup_bank", "Bank details confirmation", "Bank letter or signed bank details form.", true),
    slot("sup_policy", "Health & safety policy", "Current health and safety policy.", false),
    slot("sup_refs", "Trade references", "Up to three references.", false, { allowMultiple: true }),
  ]),
  tpl("tpl_client", "Client onboarding", "Operations", "Documents collected when onboarding a new client.", [
    slot("cli_form", "Client information form", "Completed and signed intake form.", true),
    slot("cli_id", "Proof of identity", "Photo ID for authorised representative.", true, { acceptedTypes: ["pdf", "png", "jpg", "jpeg"] }),
    slot("cli_addr", "Proof of address", "Utility bill or bank statement, under 3 months old.", true),
    slot("cli_terms", "Signed terms of engagement", "Counter-signed engagement terms.", true),
    slot("cli_auth", "Letter of authority", "Authority to act on the client's behalf.", false),
    slot("cli_other", "Supporting documents", "Anything else relevant.", false, { allowMultiple: true }),
  ]),
  tpl("tpl_compliance", "Compliance review", "Compliance", "Evidence pack for a periodic compliance review.", [
    slot("cmp_summary", "Review summary", "Summary of the review period and findings.", true),
    slot("cmp_policy", "Policy documents", "Current policies in scope.", true, { allowMultiple: true }),
    slot("cmp_training", "Training records", "Evidence of staff training completion.", true),
    slot("cmp_incident", "Incident log", "Incidents recorded during the period.", true),
    slot("cmp_sign", "Sign-off sheet", "Signed approval by the responsible officer.", true),
    slot("cmp_evidence", "Additional evidence", "Supplementary evidence.", false, { allowMultiple: true }),
  ]),
  tpl("tpl_general", "General submission", "General", "A simple pack: a cover letter, main document and attachments.", [
    slot("gen_cover", "Cover letter", "Covering letter for the submission.", true),
    slot("gen_main", "Main document", "The primary document being submitted.", true),
    slot("gen_attach", "Attachments", "Supporting attachments.", false, { allowMultiple: true }),
  ]),
];

export function cloneTemplateSlots(slots: TemplateSlot[]): TemplateSlot[] {
  return slots.map((s) => ({ ...s, acceptedTypes: [...s.acceptedTypes] }));
}
