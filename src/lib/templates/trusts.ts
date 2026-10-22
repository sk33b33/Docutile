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
    { ...T, checklist: "published", checklistNote: "Official list from the Master's trust page. The independent-trustee affidavit is on the DOJ trust forms list but not in the registration list: check whether it applies." },
    [
      slot("doj_iv_deed", "Trust deed", true, "Original trust deed or a notarially certified copy."),
      slot("doj_iv_fee", "Proof of payment of registration fee", true, "Fee for registering a new trust (see the Chief Master's directives and the Annexure B payment form).", "Annexure B"),
      slot("doj_iv_j401", "Application form", true, "Completed application to register the trust.", "J401"),
      slot("doj_iv_j417", "Acceptance of trusteeship", true, "Completed for each trustee.", "J417", true),
      slot("doj_iv_j405", "Acceptance of auditor application", true, "Lodged together with the acceptance of trusteeship.", "J405"),
      slot("doj_iv_j450", "Beneficiary declaration", true, "Completed beneficiary declaration.", "J450"),
      slot("doj_iv_trustee_id", "Trustee identification", true, "Certified copies of ID or passport, or proof of registration (CK1) for an organisation trustee.", undefined, true),
      slot("doj_iv_rep_id", "Trustee representative identification", false, "Mandatory where a trustee is an organisation: certified copy of the representative's ID or passport.", undefined, true),
      slot("doj_iv_benef_id", "Beneficiaries' identification", true, "Certified copies of ID, birth certificates or passports, or organisation registration (CK1).", undefined, true),
      slot("doj_iv_j344", "Bond of security or proof of exemption", false, "Applies if the Master requires security from the trustees, or if exempt.", "J344"),
      slot("doj_iv_court", "Final certified court order", false, "Applies only if a court order is relevant to this trust."),
      slot("doj_iv_indep", "Sworn affidavit by independent trustee", false, "Listed among the DOJ trust forms. Check whether it applies to your trust.", "Affidavit"),
    ],
  ),
  tpl(
    "tpl_doj_trust_testamentary",
    "Register a testamentary trust",
    "Documents for a trust created by a valid will. There are no fees and the deceased's last will serves as the trust document.",
    SOURCES.trusts,
    { ...T, checklist: "published", checklistNote: "Official list. The page also says all requirements listed on form JM21 must be lodged; JM21 is not reproduced here, so add what it lists." },
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
    "tpl_doj_trust_amend",
    "Amend a registered trust",
    "Use the registration or amendment form to amend an existing trust. There are no costs involved in amending an existing trust.",
    SOURCES.trusts,
    { ...T, checklist: "form-only", checklistNote: "The DOJ lists J401 as the registration or amendment form and says amendments are free, but publishes no amendment document list. Confirm what to attach with the Master where the trust is registered." },
    [slot("doj_ta_j401", "Registration or amendment form", true, "Completed form, marked as an amendment.", "J401"), supportingDocs("doj_ta_support")],
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
    SOURCES.forms,
    { ...T, checklist: "partial", checklistNote: "JM46 is the DOJ form for certified copies; the Master requires proof of payment of the prescribed fee for each document. Fees: see the Chief Master's directives." },
    [
      slot("doj_tc_jm46", "Application for certified copies", true, "The DOJ form for requesting certified copies.", "JM46"),
      slot("doj_tc_fee", "Proof of payment of the prescribed fee", true, "Required for each document you need a copy of."),
    ],
  ),
];
