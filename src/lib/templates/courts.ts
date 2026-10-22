import type { Template } from "@/types";
import { slot, tpl } from "./helpers";
import { SOURCES } from "./sources";

export const COURTS_CATEGORY = "South African Courts";
const C = { category: COURTS_CATEGORY, subcategory: "Magistrate's courts" } as const;

export const COURT_TEMPLATES: Template[] = [
  tpl(
    "tpl_doj_maintenance",
    "Maintenance application",
    "Documents to lodge a maintenance claim at any local magistrate's court where the complainant lives or works. The service is free and the maintenance clerk assists; per the DOJ leaflet an application is registered even if you do not yet have all the documents.",
    SOURCES.maintenance,
    { ...C, checklist: "published", checklistNote: "Official list from the 2026 leaflet. The last two tiles come from the older DOJ maintenance FAQ page." },
    [
      slot("doj_mn_id", "Complainant's identity document", true, "Identity document of the person applying."),
      slot("doj_mn_child", "Child's birth certificate or ID", true, "Birth certificate or identity document of the child."),
      slot("doj_mn_child_proof", "Proof of expenses for the child", true, "Receipts, invoices or similar evidence of the child's expenses.", undefined, true),
      slot("doj_mn_child_list", "List of the child's expenses", true, "A written list of the child's expenses."),
      slot("doj_mn_parent_list", "List of the applicant parent's expenses", true, "A written list of your own expenses."),
      slot("doj_mn_income", "Proof of applicant's income and expenditure", false, "Include if available.", undefined, true),
      slot("doj_mn_resp", "Respondent's name and address", false, "Name and surname of the person responsible for paying, and their physical or work address, if available."),
      slot("doj_mn_bank", "Bank statements of both parents", false, "Listed on the older DOJ maintenance FAQ page but not in the 2026 leaflet. Include if you have them.", undefined, true),
      slot("doj_mn_resp_list", "List of the respondent's expenses", false, "Listed on the older DOJ maintenance FAQ page but not in the 2026 leaflet."),
    ],
  ),
  tpl(
    "tpl_doj_protection_order",
    "Domestic violence protection order application",
    "Forms to apply for a protection order at the nearest magistrate's court or High Court. Free; available any time, including outside court hours in emergencies. Take the forms to the clerk of court to be certified and submitted.",
    SOURCES.protection,
    { ...C, checklist: "published", checklistNote: "The DOJ page was last updated in 2011 and some third-party sites give different form numbers: confirm Form 2 and Form 6 with the clerk of court." },
    [
      slot("doj_dv_f6", "Interim protection order", true, "Apply for the interim protection order first.", "Form 6"),
      slot("doj_dv_f2", "Application for protection order", true, "Must be an affidavit stating the facts, the order sought, and the police station where a breach would likely be reported.", "Form 2"),
      slot("doj_dv_consent", "Complainant's written consent", false, "Applies if someone else applies on the complainant's behalf (not needed if the complainant is a minor or cannot consent)."),
      slot("doj_dv_interest", "Applicant's interest and capacity", false, "Applies if applying on someone else's behalf: the affidavit must state your material interest in their well-being, your occupation and the capacity in which you apply."),
      slot("doj_dv_evidence", "Supporting evidence", false, "Not required by the DOJ page, but often useful: photographs, messages, medical reports, witness statements.", undefined, true),
    ],
  ),
];
