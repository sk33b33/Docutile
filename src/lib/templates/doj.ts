import { DEFAULT_MAX_FILE_SIZE_BYTES } from "../constants";
import type { Template, TemplateSlot, TemplateSource } from "@/types";

/**
 * South African Department of Justice and Constitutional Development (DOJ&CD) checklists.
 * Transcribed from the official pages named in each `source`, read on RETRIEVED. Requirements change:
 * Docutile is a preparation aid, not legal advice, and the office that receives the pack decides what it accepts.
 * "Required" = listed by the source without a condition. Conditional items are optional here, with the
 * condition in the help text; users can change a slot's required flag in the pack builder.
 */
export const DOJ_CATEGORY = "South African DOJ";
const RETRIEVED = "2026-10-22";
const SEED_DATE = "2025-01-01T00:00:00.000Z";

/** Scans and photos only, so every document in these packs can be merged into the combined PDF. */
const SCAN_TYPES = ["pdf", "png", "jpg", "jpeg"];

function slot(id: string, name: string, required: boolean, description: string, formRef?: string, allowMultiple = false): TemplateSlot {
  return { id, name, description, required, formRef, acceptedTypes: SCAN_TYPES, maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES, allowMultiple };
}

function tpl(id: string, name: string, description: string, source: TemplateSource, slots: TemplateSlot[]): Template {
  return { id, name, description, category: DOJ_CATEGORY, slots, builtIn: true, source, createdAt: SEED_DATE, updatedAt: SEED_DATE };
}

const estatesSource: TemplateSource = {
  label: "DOJ&CD Master's Office: How to report a deceased estate",
  url: "https://www.justice.gov.za/master/deceased-how.html",
  retrievedOn: RETRIEVED,
};
const trustsSource: TemplateSource = {
  label: "DOJ&CD Master's Office: Administration of Trusts",
  url: "https://justice.gov.za/master/trust.html",
  retrievedOn: RETRIEVED,
  pageUpdated: "31 Oct 2024",
};

const marriageProof = "Applies if the deceased was married. Marriage certificate, proof of registration of a customary marriage, minutes of a family meeting (where registration cannot be proved), proof of a religious (Muslim or Hindu) marriage, or a declaration of a same-sex life partnership, as the Master requests.";
const will = "Applies if there is a will. Lodge the original will and any codicils or documents purporting to be such. Originals cannot be sent electronically: keep a scan here for your records and hand the originals in.";
const nextOfKin = "Required if the deceased did not leave a valid will.";
const pre2007 = "Applies only if the deceased died before 2007: confirms the estate has not already been reported to another Master's Office or service point.";

export const DOJ_TEMPLATES: Template[] = [
  tpl(
    "tpl_doj_estate_over_250k",
    "Deceased estate report: estate over R250 000",
    "Reporting documents for the Master of the High Court (letters of executorship). Report within 14 days of death to the Master's Office where the deceased normally lived.",
    estatesSource,
    [
      slot("doj_eo_j294", "Death notice", true, "Completed Death Notice, in English or Afrikaans.", "J294"),
      slot("doj_eo_death", "Death certificate", true, "Original or certified copy of the death certificate."),
      slot("doj_eo_marriage", "Proof of marriage", false, marriageProof),
      slot("doj_eo_decl", "Declaration of marriage by the surviving spouse", false, "Applies if there is a surviving spouse: states how the deceased was married."),
      slot("doj_eo_will", "Will and codicils", false, will, undefined, true),
      slot("doj_eo_j192", "Next-of-kin affidavit", false, nextOfKin, "J192"),
      slot("doj_eo_j243", "Inventory of assets", true, "Completed inventory showing all the assets of the deceased.", "J243"),
      slot("doj_eo_nom", "Heirs' nominations of executor", false, "Applies in an intestate estate, where the will names no executor, or where the nominated executor has died or declines.", undefined, true),
      slot("doj_eo_j190", "Acceptance of trust as executor", true, "Completed in duplicate by each nominated executor.", "J190"),
      slot("doj_eo_id", "Executor's ID (photo page)", true, "Certified copy of the photo page of each executor's ID document.", undefined, true),
      slot("doj_eo_j262", "Undertaking and bond of security", false, "Not needed if the will exempts the executor from security, or the executor is the parent, spouse or child of the deceased.", "J262"),
      slot("doj_eo_pre2007", "Affidavit: estate not reported elsewhere", false, pre2007),
    ],
  ),
  tpl(
    "tpl_doj_estate_under_250k",
    "Deceased estate report: estate under R250 000",
    "Reporting documents where the Master may issue letters of authority (section 18(3), Administration of Estates Act) instead of letters of executorship. Service points only handle estates with no valid will and a gross value below R125 000 (where PEAS is not in use).",
    estatesSource,
    [
      slot("doj_eu_j294", "Death notice", true, "Completed Death Notice, in English or Afrikaans.", "J294"),
      slot("doj_eu_death", "Death certificate", true, "Original or certified copy of the death certificate."),
      slot("doj_eu_marriage", "Proof of marriage", false, marriageProof),
      slot("doj_eu_decl", "Declaration of subsisting marriages", false, "Applies if the deceased was married."),
      slot("doj_eu_will", "Will and codicils", false, will, undefined, true),
      slot("doj_eu_j192", "Next-of-kin affidavit", false, nextOfKin, "J192"),
      slot("doj_eu_j243", "Inventory of assets", true, "Completed inventory of all assets, with proof of the value of the assets.", "J243", true),
      slot("doj_eu_creditors", "List of creditors", false, "Applies if the deceased had creditors."),
      slot("doj_eu_nom", "Heirs' nominations of Master's representative", false, "Applies in an intestate estate, or where no executor is nominated or the nominee declines.", undefined, true),
      slot("doj_eu_pre2007", "Declaration: estate not reported elsewhere", false, pre2007),
      slot("doj_eu_j155", "Acceptance of Master's directions", true, "Completed and signed by the person nominated as Master's representative.", "J155"),
      slot("doj_eu_id", "Representative's ID (certified copy)", true, "Certified copy of the ID of the person to be appointed as Master's representative."),
    ],
  ),
  tpl(
    "tpl_doj_trust_inter_vivos",
    "Trust registration: inter vivos trust",
    "Documents to register a trust created between living persons with the Master of the High Court, so the Master can issue letters of authority to the trustees. Register with the Master whose area holds most of the trust assets.",
    trustsSource,
    [
      slot("doj_iv_deed", "Trust deed", true, "Original trust deed or a notarially certified copy."),
      slot("doj_iv_fee", "Proof of payment of registration fee", true, "Fee for registering a new trust (see the Chief Master's directives)."),
      slot("doj_iv_j401", "Application form", true, "Completed application to register the trust.", "J401"),
      slot("doj_iv_j417", "Acceptance of trusteeship", true, "Completed for each trustee.", "J417", true),
      slot("doj_iv_j405", "Acceptance of auditor application", true, "Lodged together with the acceptance of trusteeship.", "J405"),
      slot("doj_iv_j450", "Beneficiary declaration", true, "Completed beneficiary declaration.", "J450"),
      slot("doj_iv_trustee_id", "Trustee identification", true, "Certified copies of ID or passport, or proof of registration (CK1) for an organisation trustee.", undefined, true),
      slot("doj_iv_rep_id", "Trustee representative identification", false, "Mandatory where a trustee is an organisation: certified copy of the representative's ID or passport.", undefined, true),
      slot("doj_iv_benef_id", "Beneficiaries' identification", true, "Certified copies of ID, birth certificates or passports, or organisation registration (CK1).", undefined, true),
      slot("doj_iv_j344", "Bond of security or proof of exemption", false, "Applies if the Master requires security from the trustees, or if exempt.", "J344"),
      slot("doj_iv_court", "Final certified court order", false, "Applies only if a court order is relevant to this trust."),
    ],
  ),
  tpl(
    "tpl_doj_trust_testamentary",
    "Trust registration: testamentary trust",
    "Documents for a trust created by a valid will. There are no fees and the deceased's last will serves as the trust document.",
    trustsSource,
    [
      slot("doj_tt_j401", "Application form", true, "Completed application to register the trust.", "J401"),
      slot("doj_tt_j417", "Acceptance of trusteeship", true, "Completed for each trustee.", "J417", true),
      slot("doj_tt_j405", "Acceptance of auditor application", true, "Lodged together with the acceptance of trusteeship.", "J405"),
      slot("doj_tt_j450", "Beneficiary declaration", true, "Completed beneficiary declaration.", "J450"),
      slot("doj_tt_id", "Trustee ID (photo page)", true, "Photo page of the ID document of each trustee.", undefined, true),
      slot("doj_tt_jm21", "Other requirements on form JM21", false, "The DOJ page says all requirements listed on form JM21 must also be lodged. Check JM21 and add what it lists.", "JM21", true),
    ],
  ),
  tpl(
    "tpl_doj_trust_termination",
    "Trust deregistration: terminated trust",
    "Documents to ask the Master to deregister a trust that has terminated (for example, its object was fulfilled). Lodge with the Master where the trust is registered.",
    trustsSource,
    [
      slot("doj_td_loa", "Original letter of authority", true, "The original letter of authority issued by the Master."),
      slot("doj_td_bank", "Bank statements showing a nil balance", true, "Bank statements, with a nil balance on the final statement.", undefined, true),
      slot("doj_td_proof", "Proof beneficiaries received their benefits", true, "Evidence that the beneficiaries have received what they were due.", undefined, true),
    ],
  ),
  tpl(
    "tpl_doj_maintenance",
    "Maintenance application (magistrate's court)",
    "Documents to lodge a maintenance claim at any local magistrate's court where the complainant lives or works. The service is free and the maintenance clerk assists; per the DOJ leaflet an application is registered even if you do not yet have all the documents.",
    {
      label: "DOJ&CD Maintenance leaflet (2026) and Maintenance FAQ",
      url: "https://www.justice.gov.za/vg/mnt-FAQ-2026.pdf",
      retrievedOn: RETRIEVED,
    },
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
    {
      label: "DOJ&CD: Apply for a Domestic Violence protection order",
      url: "https://justice.gov.za/services/dv-protection-order.html",
      retrievedOn: RETRIEVED,
      pageUpdated: "6 Jul 2011",
    },
    [
      slot("doj_dv_f6", "Interim protection order", true, "Apply for the interim protection order first.", "Form 6"),
      slot("doj_dv_f2", "Application for protection order", true, "Must be an affidavit stating the facts, the order sought, and the police station where a breach would likely be reported.", "Form 2"),
      slot("doj_dv_consent", "Complainant's written consent", false, "Applies if someone else applies on the complainant's behalf (not needed if the complainant is a minor or cannot consent).", undefined),
      slot("doj_dv_interest", "Applicant's interest and capacity", false, "Applies if applying on someone else's behalf: the affidavit must state your material interest in their well-being, your occupation and the capacity in which you apply."),
      slot("doj_dv_evidence", "Supporting evidence", false, "Not required by the DOJ page, but often useful: photographs, messages, medical reports, witness statements.", undefined, true),
    ],
  ),
];
