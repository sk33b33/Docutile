import type { Template } from "@/types";
import { DOJ_CATEGORY } from "./estates";
import { slot, supportingDocs, tpl } from "./helpers";
import { SOURCES } from "./sources";

export const TRUSTS = "Trusts";
const T = { category: DOJ_CATEGORY, subcategory: TRUSTS } as const;

const declarationExemption = (what: string, mail: string) =>
  `Completed "reporting a ${what} trust declaration" template. Send to ${mail}. Exempt trusts need not lodge beneficial ownership information.`;

export const TRUST_TEMPLATES: Template[] = [
  tpl(
    "tpl_doj_trust_inter_vivos",
    "Register an inter vivos trust",
    "Documents to register a trust created between living persons with the Master of the High Court, so the Master can issue letters of authority to the trustees. Register with the Master whose area holds most of the trust assets.",
    SOURCES.trusts,
    { ...T, checklist: "published", checklistNote: "Official list from the Master's trust page, cross-checked with section 2 of form J401 (amended July 2026), which adds the RAF-only items. The independent-trustee affidavit is on the DOJ trust forms list but not in the registration list: check whether it applies." },
    [
      slot("doj_iv_deed", "Trust deed", true, "Original trust deed or a notarially certified copy."),
      slot("doj_iv_fee", "Proof of payment of registration fee", true, "Fee for registering a new trust (see the Chief Master's directives and the Annexure B payment form).", "Annexure B"),
      slot("doj_iv_j401", "Application form", true, "Completed application to register the trust.", "J401"),
      slot("doj_iv_j417", "Acceptance of trusteeship", true, "Completed for each trustee.", "J417", true),
      slot("doj_iv_j405", "Acceptance of auditor application", true, "Lodged together with the acceptance of trusteeship.", "J405"),
      slot("doj_iv_j450", "Beneficiary declaration", true, "Completed beneficiary declaration.", "J450"),
      slot("doj_iv_trustee_id", "Trustee identification", true, "Certified copies of ID or passport, or proof of registration (CK1) for an organisation trustee.", undefined, true),
      slot("doj_iv_rep_id", "Trustee representative identification", false, "Mandatory where a trustee is an organisation: certified copy of the representative's ID or passport.", undefined, true),
      slot("doj_iv_benef_id", "Beneficiaries' identification", true, "Certified copies of ID, birth certificates or passports, or organisation registration (CK1). The J401 form (amended July 2026) marks this mandatory for Road Accident Fund (RAF) trusts; the DOJ web page lists it for all.", undefined, true),
      slot("doj_iv_guardian_id", "Beneficiaries' guardian identification", false, "Mandatory for RAF trusts (per the J401 form): certified copies of the guardian's ID or passport.", undefined, true),
      slot("doj_iv_j344", "Bond of security or proof of exemption", false, "Applies if the Master requires security from the trustees, or if exempt. Mandatory for RAF trusts. Bonds must be lodged as originals.", "J344"),
      slot("doj_iv_auditor", "Undertaking by auditor or accountant", false, "Applies if the trust is audited (mandatory for RAF trusts, per the J401 form)."),
      slot("doj_iv_court", "Final certified court order", false, "Applies only if a court order is relevant to this trust."),
      slot("doj_iv_indep", "Sworn affidavit by independent trustee", false, "Listed among the DOJ trust forms. Check whether it applies to your trust.", "Affidavit"),
    ],
  ),
  tpl(
    "tpl_doj_trust_testamentary",
    "Register a testamentary trust",
    "Documents for a trust created by a valid will. There are no fees and the deceased's last will serves as the trust document.",
    SOURCES.trusts,
    { ...T, checklist: "published", checklistNote: "Official list from the Master's trust page, plus the stated case the Master asks trustees for on form JM21 (read in full). The JM21 topics are covered by the stated-case tile and the optional tiles below it." },
    [
      slot("doj_tt_j401", "Application form", true, "Completed application to register the trust.", "J401"),
      slot("doj_tt_j417", "Acceptance of trusteeship", true, "Completed for each trustee.", "J417", true),
      slot("doj_tt_j405", "Acceptance of auditor application", true, "Lodged together with the acceptance of trusteeship.", "J405"),
      slot("doj_tt_j450", "Beneficiary declaration", true, "Completed beneficiary declaration.", "J450"),
      slot("doj_tt_id", "Trustee ID (photo page)", true, "Photo page of the ID document of each trustee (JM21 also asks for the trustees' full names and ID copies).", undefined, true),
      slot("doj_tt_jm21", "Stated case for the Master (JM21 memorandum)", true, "Trustees state a case for the Master's discretion under section 6(3) of the Trust Property Control Act. It should cover: beneficiaries' names and ages, the trustees' relationship to them and the probable duration of the trust; trustees' occupations; each trustee's trust-administration experience; whether the trust will be audited; the bank and branch of the trust account; and how accurate records will be kept.", "JM21"),
      slot("doj_tt_views", "Beneficiaries' written views on security", false, "JM21 item 3: the written views of the beneficiaries on exempting the trustees from furnishing security. Applies if you are asking for exemption.", undefined, true),
      slot("doj_tt_auditor", "Auditor's details and undertakings", false, "JM21 item 6: applies if the trust is subject to an annual audit. The auditor's name and address, the auditor's undertakings to the Master, and the trustees' undertaking to instruct the auditor to give the Master any information requested.", undefined, true),
    ],
  ),
  tpl(
    "tpl_doj_trust_amend_trustees",
    "Change trustees (J401 trustee amendment)",
    "Use form J401 marked 'Trustee Amendments' (complete sections 1.1, 1.3, 6 and 9). A separate J401 must be submitted for each amendment type. Amending an existing trust costs nothing.",
    SOURCES.j401,
    { ...T, checklist: "partial", checklistNote: "Sections to complete come from the J401 form. The form says to insert the acceptance-of-trusteeship forms behind the trustee summary; it does not list other supporting documents for an amendment: confirm with the Master where the trust is registered." },
    [
      slot("doj_ac_j401", "Trustee amendment form", true, "J401 with 'Trustee Amendments' selected: sections 1.1, 1.3, 6 and 9.", "J401"),
      slot("doj_ac_j417", "Acceptance of trusteeship", true, "The J401 asks for the acceptance of trusteeship forms to be inserted behind the trustee summary.", "J417", true),
      slot("doj_ac_id", "Trustee identification", false, "Certified ID, passport or CK1 for new trustees, as for registration (not stated for amendments: confirm).", undefined, true),
      supportingDocs("doj_ac_support"),
    ],
  ),
  tpl(
    "tpl_doj_trust_amend_auditor",
    "Change auditor (J401 auditor amendment)",
    "Use form J401 marked 'Auditor Amendments' (complete sections 1.1, 1.3, 7 and 9), with the auditor's details and accreditation.",
    SOURCES.j401,
    { ...T, checklist: "form-only", checklistNote: "The J401 form lists the sections to complete but no supporting documents for an auditor change. The acceptance of auditor (J405) is a trust-registration form: confirm whether the Master wants it." },
    [
      slot("doj_aa_j401", "Auditor amendment form", true, "J401 with 'Auditor Amendments' selected: sections 1.1, 1.3, 7 and 9.", "J401"),
      slot("doj_aa_j405", "Acceptance of auditor", false, "Listed among the DOJ trust forms. Confirm whether it applies to a change of auditor.", "J405"),
      supportingDocs("doj_aa_support"),
    ],
  ),
  tpl(
    "tpl_doj_trust_amend_bond",
    "Amend bond of security (J401 bond amendment)",
    "Use form J401 marked 'Bond of Security Amendments' (complete sections 1.1, 1.3, 8 and 9): whether security is required, the amount, the financial institution and the policy reference.",
    SOURCES.j401,
    { ...T, checklist: "form-only", checklistNote: "The J401 form lists the sections to complete but no supporting documents. J344 is the DOJ bond-of-security form; bonds must be lodged as originals." },
    [
      slot("doj_ab_j401", "Bond of security amendment form", true, "J401 with 'Bond of Security Amendments' selected: sections 1.1, 1.3, 8 and 9.", "J401"),
      slot("doj_ab_j344", "Undertaking and bond of security", false, "The DOJ bond form, if the Master requires a new or changed bond. Original must be lodged.", "J344"),
      supportingDocs("doj_ab_support"),
    ],
  ),
  tpl(
    "tpl_doj_trust_amend_general",
    "General trust amendments (J401)",
    "Use form J401 marked 'General Trust Amendments' (sections 1.1, 1.2 if applicable, 1.3, 3, 4, 5 if applicable, and 9): general details, main contact, bank details and founders.",
    SOURCES.j401,
    { ...T, checklist: "form-only", checklistNote: "The J401 form lists the sections to complete but no supporting documents." },
    [slot("doj_ag_j401", "General amendment form", true, "J401 with 'General Trust Amendments' selected.", "J401"), supportingDocs("doj_ag_support")],
  ),
  tpl(
    "tpl_doj_trust_trustee_details",
    "Update trustee contact details",
    "If the Trust Beneficial Ownership system says there are no contact details for the trust, update the J417 for at least one trustee, sign it and lodge a scan electronically with the Master. Allow 15 working days.",
    SOURCES.trusts,
    { ...T, checklist: "published", checklistNote: "From the Master's BO register FAQ on this exact situation." },
    [slot("doj_td2_j417", "Updated acceptance of trusteeship", true, "Completed and signed for at least one trustee.", "J417")],
  ),
  tpl(
    "tpl_doj_trust_bo_register",
    "Trust beneficial ownership register",
    "Trustees must keep the beneficial ownership register with ID copies of all beneficial owners and lodge the register with the Master. It can only be uploaded electronically: no hard copy is accepted.",
    SOURCES.trusts,
    { ...T, checklist: "published", checklistNote: "Uses the Master's spreadsheet template and online system (trustonline.justice.gov.za). The DOJ page gave a filing deadline of 15 November 2024, which has passed: check the current status. Docutile only collects the documents; it cannot lodge them." },
    [
      slot("doj_bo_register", "Beneficial ownership register (spreadsheet)", true, "The Master's BO register template, completed. Use the current template: older ones fail validation. Upload it on the Master's online system.", undefined, false, ["xlsx"]),
      slot("doj_bo_ids", "Beneficial owners' ID copies", true, "Copies of the IDs of all beneficial owners (natural persons). Trustees keep these in their records.", undefined, true),
    ],
  ),
  tpl(
    "tpl_doj_trust_terminated_report",
    "Report a terminated trust (beneficial ownership exemption)",
    "Formally terminated trusts are exempt from providing BO information. Email the documents to TerminatedTrust@justice.gov.za.",
    SOURCES.trusts,
    { ...T, checklist: "published", checklistNote: "Official three-item list from the Master's trust page." },
    [
      slot("doj_rt_decl", "Terminated trust declaration", true, declarationExemption("terminated", "TerminatedTrust@justice.gov.za")),
      slot("doj_rt_id", "ID of the person making the declaration", true, "Copy of the ID of the person who signs the declaration."),
      slot("doj_rt_support", "Supporting documents", true, "All relevant documents that prove what you have declared.", undefined, true),
    ],
  ),
  tpl(
    "tpl_doj_trust_dormant_report",
    "Report a dormant trust (beneficial ownership exemption)",
    "A dormant trust has never been economically active and has no bank account and no property. It is exempt while dormant. Email the documents to DormantTrust@justice.gov.za. If it stops being dormant, the trustee must lodge BO information.",
    SOURCES.trusts,
    { ...T, checklist: "published", checklistNote: "Official three-item list from the Master's trust page." },
    [
      slot("doj_rd_decl", "Dormant trust declaration", true, declarationExemption("dormant", "DormantTrust@justice.gov.za")),
      slot("doj_rd_id", "ID of the person making the declaration", true, "Copy of the ID of the person who signs the declaration."),
      slot("doj_rd_support", "Supporting documents", true, "All relevant documents that prove what you have declared.", undefined, true),
    ],
  ),
  tpl(
    "tpl_doj_trust_termination",
    "Deregister a terminated trust",
    "Documents to ask the Master to deregister a trust that has terminated (for example, its object was fulfilled). Lodge with the Master where the trust is registered.",
    SOURCES.trusts,
    { ...T, checklist: "published", checklistNote: "Official three-item list. The Act has no deregistration provision; the Master deregisters on proof the trust has terminated." },
    [
      slot("doj_td_loa", "Original letter of authority", true, "The original letter of authority issued by the Master."),
      slot("doj_td_bank", "Bank statements showing a nil balance", true, "Bank statements, with a nil balance on the final statement.", undefined, true),
      slot("doj_td_proof", "Proof beneficiaries received their benefits", true, "Evidence that the beneficiaries have received what they were due.", undefined, true),
    ],
  ),
  tpl(
    "tpl_doj_trust_info",
    "Request information on a trust",
    "Apply in writing to the Master's Office where the trust is registered, giving reasons. The Master asks the trustees and beneficiaries and then decides whether to release the information.",
    SOURCES.trusts,
    { ...T, checklist: "partial", checklistNote: "The DOJ page only requires a written application with reasons. If the Master refuses, you must apply to the department's Information Officer." },
    [slot("doj_ti_letter", "Written application with reasons", true, "Why you need the information (for example, trustee names)."), supportingDocs("doj_ti_support")],
  ),
  tpl(
    "tpl_doj_trust_copies",
    "Certified copies of documents in a trust file",
    "Request certified copies of documents held in the Master's file for a trust.",
    SOURCES.j401,
    { ...T, checklist: "partial", checklistNote: "Form J401 has a 'Trust Copies' option (sections 1.1, 1.3 and 9); the DOJ forms page also lists JM46 (Application for Certified Copies). The Master requires proof of payment of the prescribed fee for each document: confirm which form your office wants." },
    [
      slot("doj_tc_j401", "Trust copies request", true, "J401 with 'Trust Copies' selected: sections 1.1, 1.3 and 9.", "J401"),
      slot("doj_tc_jm46", "Application for certified copies", false, "The DOJ form for requesting certified copies. Confirm whether your office also wants it.", "JM46"),
      slot("doj_tc_fee", "Proof of payment of the prescribed fee", true, "Required for each document you need a copy of."),
    ],
  ),
];
