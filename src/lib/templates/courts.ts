import type { Template } from "@/types";
import { slot, supportingDocs, tpl } from "./helpers";
import { SOURCES } from "./sources";

export const COURTS_CATEGORY = "South African Courts";
export const MAINTENANCE = "Maintenance";
export const DOMESTIC_VIOLENCE = "Domestic violence";
const M = { category: COURTS_CATEGORY, subcategory: MAINTENANCE } as const;
const D = { category: COURTS_CATEGORY, subcategory: DOMESTIC_VIOLENCE } as const;

/** From the 2026 DOJ maintenance leaflet. */
const MAINTENANCE_STEPS = [
  "Go to any magistrate's court on a working day. The service is free and you do not need an attorney.",
  "The maintenance clerk helps you fill in the application and checks what you have. The application is registered and given a file number even if some documents are missing.",
  "The Maintenance Officer holds an informal enquiry. The court serves a directive or subpoena on the respondent with the date to appear.",
  "If the parties agree, the magistrate confirms the agreement as a maintenance order. If they do not agree on the amount, the magistrate holds a formal hearing and decides.",
];

/** From the DOJ domestic violence service page. Its form numbers are outdated, so only the process is used. */
const PROTECTION_ORDER_STEPS = [
  "Apply at the magistrate's court nearest to where you live or work. You can apply at any time, including outside court hours, on weekends and on public holidays. The service is free.",
  "The clerk of the court certifies the application and takes it in.",
  "The magistrate sets a date for you to return to court and prepares a notice telling the respondent about the order and the date.",
  "After the court appearance, the magistrate may grant the protection order.",
];

const mntFormOnly = "The DOJ maintenance forms page names the form but lists no supporting documents. The maintenance clerk assists at the court: confirm what to attach.";
const dvFormOnly = "The DOJ domestic violence forms page names the form but lists no supporting documents: confirm with the clerk of the court.";

/** A maintenance service that is just one official form plus optional supporting documents. */
function mntForm(id: string, name: string, description: string, form: string, ref: string) {
  return tpl(`tpl_doj_mnt_${id}`, name, description, SOURCES.maintenanceForms, { ...M, checklist: "form-only", checklistNote: mntFormOnly }, [
    slot(`doj_mn_${id}_form`, name, true, `${form}.`, ref),
    supportingDocs(`doj_mn_${id}_support`),
  ]);
}

function dvForm(id: string, name: string, description: string, form: string, ref: string, required = true) {
  return tpl(`tpl_doj_dv_${id}`, name, description, SOURCES.dvForms, { ...D, checklist: "form-only", checklistNote: dvFormOnly }, [
    slot(`doj_dv_${id}_form`, name, required, `${form}.`, ref),
    supportingDocs(`doj_dv_${id}_support`),
  ]);
}

export const COURT_TEMPLATES: Template[] = [
  tpl(
    "tpl_doj_maintenance",
    "Apply for a maintenance order",
    "Documents to lodge a maintenance claim at any local magistrate's court where the complainant lives or works. The service is free and the maintenance clerk assists; per the DOJ leaflet an application is registered even if you do not yet have all the documents.",
    SOURCES.maintenance,
    { ...M, nextSteps: MAINTENANCE_STEPS, checklist: "published", checklistNote: "Official list from the 2026 leaflet. Form A (J101) is confirmed on the DOJ maintenance forms page. The last two tiles come from the older DOJ maintenance FAQ page." },
    [
      slot("doj_mn_form_a", "Application for maintenance order", false, "Form A. The maintenance clerk helps you complete it at the court, so it may not be ready beforehand.", "Form A · J101"),
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
  mntForm("substitution", "Substitute or discharge a maintenance order", "Ask the court to substitute or discharge an existing maintenance order.", "Form B", "Form B · J107"),
  mntForm("consent", "Consent maintenance order (section 17)", "Consent and maintenance order in terms of section 17 read with section 16 of the Maintenance Act, 1998 (Regulation 6).", "Form G", "Form G · J214"),
  mntForm("variation", "Vary or set aside a default maintenance order", "Application for variation or setting aside of an order made by default, in terms of section 19(4) of the Maintenance Act, 1998 (Regulation 6).", "Form I", "Form I · J256"),
  mntForm("enforcement", "Enforce a maintenance order (section 26)", "Application for enforcement of a maintenance or other order in terms of section 26 of the Maintenance Act, 1998 (Regulation 6).", "Form K", "Form K · J306"),
  mntForm("warrant", "Set aside a warrant of execution (section 27(3))", "Application for setting aside of a warrant of execution in terms of section 27(3) of the Maintenance Act, 1998 (Regulation 6).", "Form M", "Form M · J435"),
  mntForm("emoluments", "Suspend or rescind an emoluments attachment order (section 28(2))", "Application for suspension, amendment or rescission of an order for the attachment of emoluments, in terms of section 28(2) of the Maintenance Act, 1998 (Regulation 6).", "Form N", "Form N · J438"),
  mntForm("debts", "Suspend or rescind a debt attachment order (section 30(2))", "Application for suspension, amendment or rescission of an order for the attachment of debts, in terms of section 30(2) of the Maintenance Act, 1998 (Regulation 6).", "Form P", "Form P · J458"),
  mntForm("noncompliance", "Complain of failure to comply with a maintenance order (section 31(1))", "Complaint of failure to comply with a maintenance order, for purposes of section 31(1) of the Maintenance Act, 1998 (Regulation 6).", "Form Q", "Form Q · J470"),

  tpl(
    "tpl_doj_protection_order",
    "Apply for a protection order",
    "Apply at the nearest magistrate's court or High Court. The service is free. The application (Form 06) is made under oath: the commissioner's certificate (Part B) must be completed. The court issues the interim protection order itself (Form 12).",
    SOURCES.dvForms,
    { ...D, nextSteps: PROTECTION_ORDER_STEPS, checklist: "published", checklistNote: "Form numbers are from the DOJ forms page under the Domestic Violence Regulations 2022 (published April 2023; Form 06 updated 7 March 2025). The older DOJ service page (last updated 2011) used different numbers and is outdated. Evidence is invited by Form 06 itself: it says to attach documents, photos, witness statements and medical records." },
    [
      slot("doj_dv_f6", "Application for protection order", true, "Part A is completed by the complainant or the person applying on their behalf; Part B is the commissioner of oaths' certificate.", "Form 06 · J480"),
      slot("doj_dv_consent", "Consent for another person to apply", false, "Applies if someone else applies on the victim's behalf (the Act exempts minors and people who cannot consent).", "Form 07 · J965"),
      slot("doj_dv_evidence", "Supporting evidence", false, "Form 06 asks you to attach any documents, photos, witness statements, medical records and similar evidence of the abuse.", undefined, true),
    ],
  ),
  dvForm("report", "Report suspected domestic violence (affidavit by an adult)", "Affidavit by an adult who reports knowledge, belief or suspicion of acts of domestic violence.", "Form 03", "Form 03 · J962"),
  dvForm("variation", "Vary or set aside a protection order", "Application for variation or setting aside of a protection order.", "Form 38", "Form 38 · J649"),
  dvForm("contravention", "Report a contravention of a protection order", "Affidavit regarding a contravention of a protection order.", "Form 35", "Form 35 · J608"),
  dvForm("warrant", "Second or further warrant of arrest", "Affidavit for purposes of a second or further warrant of arrest.", "Form 34", "Form 34 · J591"),
  dvForm("monitoring", "Domestic violence safety monitoring notice", "Application for a domestic violence safety monitoring notice.", "Form 09", "Form 09 · J966"),
  dvForm("service", "Alternative manner of service", "Request for authorisation of an alternative manner of service.", "Form 41", "Form 41 · J988"),
];
