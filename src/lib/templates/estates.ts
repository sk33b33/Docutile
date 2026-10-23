import type { Template } from "@/types";
import { slot, supportingDocs, tpl } from "./helpers";
import { SOURCES } from "./sources";

export const DOJ_CATEGORY = "South African DOJ";
export const ESTATES = "Estates";
const E = { category: DOJ_CATEGORY, subcategory: ESTATES } as const;

const marriageProof = "Applies if the deceased was married (or divorced). Marriage certificate, divorce order, proof of registration of a customary marriage, minutes of a family meeting (where registration cannot be proved), proof of a religious (Muslim or Hindu) marriage, or a declaration of a same-sex life partnership, as the Master requests.";
const will = "Applies if there is a will. Lodge the original will and any codicils or documents purporting to be such. The Master cannot accept a certified copy of a will, so keep a scan here for your records and hand the originals in.";
const nextOfKin = "Required if the deceased did not leave a valid will.";
const pre2007 = "Applies only if the deceased died before 2007: confirms the estate has not already been reported to another Master's Office or service point.";
const bankValue = "Supports the inventory: confirmation of the value of a bank account (Annexure B, Chief Master Directive 09/2023). Applies if the inventory includes bank accounts.";
const policyValue = "Supports the inventory: confirmation of the value of an insurance policy (Annexure C, Chief Master Directive 09/2023). Applies if the inventory includes policies.";

const durban = " Listed on the Durban Master's Office checklist; confirm with your own Master's Office.";

/** From the DOJ "How to report a deceased estate" page. */
const reportSteps = (letters: string) => [
  "Report the estate within 14 days of the death, to the Master's Office where the deceased normally lived.",
  "Post or hand in the documents at the Master's Office. Faxed documents are not accepted. Original wills and codicils must be handed in.",
  "The Master opens a file in the deceased's name. An examiner checks the documents for correctness, and the assistant Master considers the will, if there is one.",
  letters,
  "Some Master's offices also take reports through the DOJ online deceased estate system (dojonline.justice.gov.za). It is being rolled out in stages.",
];

export const ESTATE_TEMPLATES: Template[] = [
  tpl(
    "tpl_doj_estate_over_250k",
    "Report a deceased estate: over R250 000",
    "Reporting documents for the Master of the High Court (letters of executorship). Report within 14 days of death to the Master's Office where the deceased normally lived.",
    SOURCES.estatesReport,
    { ...E, nextSteps: reportSteps("The Master issues the letters of executorship, and the full process of the Administration of Estates Act follows."), checklist: "published", checklistNote: "Official reporting list for estates over R250 000, plus optional tiles from the DOJ forms page and the Durban Master's Office checklist. Note: the Durban checklist asks for the J190 where the estate is above R125 000, not R250 000: confirm the threshold with your Master's Office." },
    [
      slot("doj_eo_j294", "Death notice", true, "Completed Death Notice, in English or Afrikaans.", "J294"),
      slot("doj_eo_death", "Death certificate", true, "Original or certified copy of the death certificate."),
      slot("doj_eo_marriage", "Proof of marriage", false, marriageProof),
      slot("doj_eo_deceased_id", "Deceased's ID (certified copy)", false, "Certified copy of the deceased's identity document." + durban),
      slot("doj_eo_care", "Affidavit of care", false, "Applies if there is a minor child: completed by the child's caregiver." + durban),
      slot("doj_eo_party_ids", "IDs of applicant and nominating heirs", false, "Certified copies of the ID of the applicant and of everyone nominating the applicant." + durban, undefined, true),
      slot("doj_eo_minor_births", "Birth certificates of minors", false, "Applies if there are minor heirs: certified copies of their birth certificates." + durban, undefined, true),
      slot("doj_eo_decl", "Declaration of marriage by the surviving spouse", false, "Applies if there is a surviving spouse: states how the deceased was married."),
      slot("doj_eo_will", "Will and codicils", false, will, undefined, true),
      slot("doj_eo_j192", "Next-of-kin affidavit", false, nextOfKin, "J192"),
      slot("doj_eo_j243", "Inventory of assets", true, "Completed inventory showing all the assets of the deceased.", "J243"),
      slot("doj_eo_bank", "Bank account value confirmation", false, bankValue, "MBU 09(A)", true),
      slot("doj_eo_policy", "Policy value confirmation", false, policyValue, "MBU 09(B)", true),
      slot("doj_eo_nom", "Heirs' nominations of executor", false, "Applies in an intestate estate, where the will names no executor, or where the nominated executor has died or declines.", undefined, true),
      slot("doj_eo_j190", "Acceptance of trust as executor", true, "Completed in duplicate by each nominated executor.", "J190"),
      slot("doj_eo_id", "Executor's ID (photo page)", true, "Certified copy of the photo page of each executor's ID document.", undefined, true),
      slot("doj_eo_j262", "Undertaking and bond of security", false, "Not needed if the will exempts the executor from security, or the executor is the parent, spouse or child of the deceased.", "J262"),
      slot("doj_eo_pre2007", "Affidavit: estate not reported elsewhere", false, pre2007),
    ],
  ),
  tpl(
    "tpl_doj_estate_under_250k",
    "Report a deceased estate: under R250 000",
    "Reporting documents where the Master may issue letters of authority (section 18(3), Administration of Estates Act) instead of letters of executorship. Service points only handle estates with no valid will and a gross value below R125 000 (where PEAS is not in use).",
    SOURCES.estatesReport,
    { ...E, nextSteps: reportSteps("The Master issues the letter of authority (section 18(3)) or the letter of appointment as Master's representative."), checklist: "published", checklistNote: "Official reporting list for estates under R250 000, plus optional tiles from the DOJ forms page and the Durban Master's Office checklist, which treats R125 000 as its threshold: confirm with your Master's Office." },
    [
      slot("doj_eu_j294", "Death notice", true, "Completed Death Notice, in English or Afrikaans.", "J294"),
      slot("doj_eu_death", "Death certificate", true, "Original or certified copy of the death certificate."),
      slot("doj_eu_marriage", "Proof of marriage", false, marriageProof),
      slot("doj_eu_deceased_id", "Deceased's ID (certified copy)", false, "Certified copy of the deceased's identity document." + durban),
      slot("doj_eu_care", "Affidavit of care", false, "Applies if there is a minor child: completed by the child's caregiver." + durban),
      slot("doj_eu_party_ids", "IDs of applicant and nominating heirs", false, "Certified copies of the ID of the applicant and of everyone nominating the applicant." + durban, undefined, true),
      slot("doj_eu_minor_births", "Birth certificates of minors", false, "Applies if there are minor heirs: certified copies of their birth certificates." + durban, undefined, true),
      slot("doj_eu_decl", "Declaration of subsisting marriages", false, "Applies if the deceased was married."),
      slot("doj_eu_will", "Will and codicils", false, will, undefined, true),
      slot("doj_eu_j192", "Next-of-kin affidavit", false, nextOfKin, "J192"),
      slot("doj_eu_j243", "Inventory of assets", true, "Completed inventory of all assets, with proof of the value of the assets.", "J243", true),
      slot("doj_eu_bank", "Bank account value confirmation", false, bankValue, "MBU 09(A)", true),
      slot("doj_eu_policy", "Policy value confirmation", false, policyValue, "MBU 09(B)", true),
      slot("doj_eu_creditors", "List of creditors", false, "Applies if the deceased had creditors."),
      slot("doj_eu_vouchers", "Vouchers for the assets", false, "For section 18(3) estates: proof of fixed property, movables and bank accounts." + durban, undefined, true),
      slot("doj_eu_nom", "Heirs' nominations of Master's representative", false, "Applies in an intestate estate, or where no executor is nominated or the nominee declines.", undefined, true),
      slot("doj_eu_pre2007", "Declaration: estate not reported elsewhere", false, pre2007),
      slot("doj_eu_j155", "Acceptance of Master's directions", true, "Completed and signed by the person nominated as Master's representative.", "J155"),
      slot("doj_eu_id", "Representative's ID (certified copy)", true, "Certified copy of the ID of the person to be appointed as Master's representative."),
    ],
  ),
  tpl(
    "tpl_doj_estate_foreign",
    "Report an estate of a person not living in South Africa",
    "For a person who was not living in South Africa when they died but left property or a will here. Report to one Master of the High Court only (any one).",
    SOURCES.estatesOverview,
    { ...E, checklist: "partial", checklistNote: "The DOJ page requires an affidavit that letters of executorship were not granted by another Master, alongside the reporting documents. It does not publish a separate foreign-estate list, so the other tiles follow the standard reporting list: confirm with the Master." },
    [
      slot("doj_ef_affidavit", "Affidavit: no letters granted by another Master", true, "States that letters of executorship have not already been granted by any other Master of the High Court in South Africa. Must accompany the reporting documents."),
      slot("doj_ef_j294", "Death notice", true, "Completed Death Notice.", "J294"),
      slot("doj_ef_death", "Death certificate", true, "Original or certified copy."),
      slot("doj_ef_will", "Will and codicils", false, will, undefined, true),
      slot("doj_ef_j192", "Next-of-kin affidavit", false, nextOfKin, "J192"),
      slot("doj_ef_j243", "Inventory of assets in South Africa", true, "Completed inventory of the deceased's assets in South Africa.", "J243"),
      slot("doj_ef_j190", "Acceptance of trust as executor", false, "Standard reporting document: confirm with the Master whether it applies.", "J190"),
      slot("doj_ef_j262", "Undertaking and bond of security (foreign executor)", false, "The DOJ forms page lists a bond form for a foreign executor. Confirm whether it applies.", "J262"),
      slot("doj_ef_id", "Executor's ID (photo page)", false, "Certified copy of the photo page of the executor's ID or passport.", undefined, true),
    ],
  ),
  tpl(
    "tpl_doj_estate_laa",
    "Liquidation and distribution account (executor)",
    "After appointment, an executor has six months to lodge a full liquidation and distribution account, then advertises it for inspection and distributes within two months of the inspection period ending. Build this pack in stages.",
    SOURCES.faq,
    { ...E, checklist: "partial", checklistNote: "Based on the Master's FAQ description of the process (question 6) and the two Government Printing Works notice forms. The DOJ does not publish a single lodging checklist: confirm with your Master's Office. Later-stage items are optional so the account can be lodged first." },
    [
      slot("doj_la_account", "Liquidation and distribution account", true, "Assets, liabilities, cash reconciliation, distribution of assets, income and expenditure after death, any fiduciary assets, and the estate duty calculation."),
      slot("doj_la_creditors", "Proof of advertisement for creditors", true, "Notice in the Government Gazette and a local newspaper giving creditors 30 days to lodge claims.", "J193", true),
      slot("doj_la_inspection", "Proof the account lay open for inspection", false, "Stage 2: after the Master permits it (section 35), the account is advertised and lies open for 21 days at the Master's Office and the Magistrate's Office.", "J187", true),
      slot("doj_la_replies", "Executor's reply to objections", false, "Stage 2: only if an objection was lodged. The executor must reply to the Master within 14 days.", undefined, true),
      slot("doj_la_amended", "Amended account", false, "Stage 2: only if the Master directs an amendment. An amended account must lie open for inspection again.", undefined, true),
      slot("doj_la_cert", "Magistrate's certificate: no objection lodged", false, "Stage 3: certificate from the Magistrate where the account lay open, confirming no objection was lodged. The Master then permits distribution."),
      slot("doj_la_distribution", "Proof of distribution", false, "Stage 3: proof that the distribution was completed satisfactorily, lodged within two months after the inspection period.", undefined, true),
    ],
  ),
  tpl(
    "tpl_doj_estate_objection",
    "Object to a liquidation and distribution account",
    "An interested party can lodge a complaint with the Master within the 21 days the account lies open for inspection. The Master then takes it up with the executor, who replies within 14 days.",
    SOURCES.faq,
    { ...E, checklist: "partial", checklistNote: "The DOJ FAQ describes the right to object and the time limit, but publishes no objection form or document list. Confirm requirements with the Master." },
    [
      slot("doj_ob_letter", "Written objection", true, "Your complaint about the account, lodged with the Master within the 21-day inspection period."),
      supportingDocs("doj_ob_support"),
    ],
  ),
  tpl(
    "tpl_doj_estate_copies",
    "Certified copies of documents in an estate file",
    "Apply in writing to the Master's Office where the estate was registered, with proof of payment of the prescribed fee for each document you need copied.",
    SOURCES.faq,
    { ...E, checklist: "partial", checklistNote: "The FAQ requires a written application and proof of payment of the prescribed fee; the forms page lists JM46 (Application for Certified Copies) for this. Fees: see the Chief Master's directives." },
    [
      slot("doj_ec_jm46", "Application for certified copies", true, "The DOJ form for requesting certified copies.", "JM46"),
      slot("doj_ec_letter", "Written application", false, "Your written request, naming the estate and each document you need. The FAQ asks for a written application."),
      slot("doj_ec_fee", "Proof of payment of the prescribed fee", true, "Required for each document you need a copy of. Payment method: see the Chief Master's Directive 2017-03."),
    ],
  ),
  tpl(
    "tpl_doj_estate_s42",
    "Section 42(2) endorsement (Administration of Estates Act)",
    "Application for endorsement in terms of section 42(2) of the Administration of Estates Act.",
    SOURCES.forms,
    { ...E, checklist: "form-only", checklistNote: "The DOJ forms page lists the application form (paragraphs 1 to 6 and 12) but no supporting-document list." },
    [slot("doj_s42_form", "Application for endorsement", true, "Section 42(2): paragraphs 1 to 6 and 12 of the form.", "JM33_42"), supportingDocs("doj_s42_support")],
  ),
  tpl(
    "tpl_doj_estate_s80",
    "Section 80 endorsement (Administration of Estates Act)",
    "Application for endorsement in terms of section 80 of the Administration of Estates Act.",
    SOURCES.forms,
    { ...E, checklist: "form-only", checklistNote: "The DOJ forms page lists the application form but no supporting-document list." },
    [slot("doj_s80_form", "Application for endorsement", true, "Section 80 application form.", "Section 80"), supportingDocs("doj_s80_support")],
  ),
  tpl(
    "tpl_doj_estate_funeral",
    "Obtain funds from a bank for funeral purposes",
    "Annexure D to Chief Master Directive 09/2023: obtaining funds from a deceased person's bank account to pay for a funeral.",
    SOURCES.forms,
    { ...E, checklist: "form-only", checklistNote: "The DOJ forms page lists MBU 12 and the affidavit MBU 19 (Annexure A) but not a full document list. Banks may ask for more: confirm with the bank and the Master." },
    [
      slot("doj_fn_mbu12", "Funeral funds request", true, "Obtaining funds from a bank for funeral purposes (Annexure D).", "MBU 12"),
      slot("doj_fn_mbu19", "Affidavit / affirmation", false, "Annexure A to the Directive. Confirm with the Master whether it applies.", "MBU 19"),
      supportingDocs("doj_fn_support"),
    ],
  ),
];
