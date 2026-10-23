import type { Template, TemplateSource } from "@/types";
import { slot, supportingDocs, tpl } from "./helpers";
import { SOURCES } from "./sources";

/**
 * The Master of the High Court's other divisions: the Guardian's Fund, curators and tutors, and insolvent estates
 * (liquidations). Kept separate from the DOJ "Estates" and "Trusts" subcategories on purpose.
 */
export const MASTER_OTHER_CATEGORY = "Master of the High Court: other services";
export const GUARDIANS_FUND = "Guardian's Fund";
export const CURATORS_TUTORS = "Curators and tutors";
export const INSOLVENT_ESTATES = "Insolvent estates";

const G = { category: MASTER_OTHER_CATEGORY, subcategory: GUARDIANS_FUND } as const;
const C = { category: MASTER_OTHER_CATEGORY, subcategory: CURATORS_TUTORS } as const;
const I = { category: MASTER_OTHER_CATEGORY, subcategory: INSOLVENT_ESTATES } as const;

const fingerprints = "The Master verifies fingerprints with Home Affairs. If you cannot lodge in person, attach a copy of your ID with your fingerprints; lodging in person needs none (the Master has an on-site fingerprint system).";
const bank = "Payments are made by EFT, so the Master needs your banking details (the DOJ's bank and personal details form, Ceftu 3).";
const noTracers = "Tracing agents may not collect Guardian's Fund money on your behalf (Harmful Business Practices Act, 1988): payment goes to the person in the Master's records.";

/** One official form plus optional supporting documents. */
function formOnly(id: string, name: string, description: string, form: string, ref: string, source: TemplateSource, note: string, opts: Partial<Pick<Template, "category" | "subcategory">>) {
  return tpl(id, name, description, source, { category: opts.category!, subcategory: opts.subcategory, checklist: "form-only", checklistNote: note }, [
    slot(`${id}_form`, name, true, `${form}.`, ref),
    supportingDocs(`${id}_support`),
  ]);
}

const gfNote = "The DOJ forms page names the form but lists no supporting documents for this request: confirm with the Guardian's Fund office of your Master.";
const gpwNote = "The DOJ forms page provides this as a Government Printing Works notice form but publishes no supporting-document list: confirm with the Master dealing with the estate.";

const GUARDIAN_TEMPLATES: Template[] = [
  tpl(
    "tpl_doj_gf_claim",
    "Claim money from the Guardian's Fund (account holder)",
    "For a beneficiary claiming their invested money and interest, for example a minor who has reached the age of majority (18, marriage, or declared major by the High Court, or the age the will sets).",
    SOURCES.guardians,
    { ...G, checklist: "published", checklistNote: "From question 4 of the Master's Guardian's Fund FAQ. Payment is by EFT. Money unclaimed for 30 years is forfeited to the State." },
    [
      slot("doj_gc_j251", "Application for monies from the Guardian's Fund", true, "Completed by the beneficiary entitled to the money.", "J251"),
      slot("doj_gc_id", "Identity document, passport, marriage certificate or court order", true, "Certified copy of the account holder's identity document or passport, plus a marriage certificate or order of court if the name changed or the claim depends on it.", undefined, true),
      slot("doj_gc_bank", "Bank and personal details", false, bank, "Ceftu 3"),
      slot("doj_gc_prints", "ID copy with fingerprints", false, fingerprints),
    ],
  ),
  tpl(
    "tpl_doj_gf_fideicommissary",
    "Claim invested capital as owner (usufruct or fideicommissum)",
    "For the owner of capital held in the Guardian's Fund, usually claimable after the usufructuary or fiduciary has died. (Those entitled to the interest claim it monthly in writing on J341, giving full particulars of the instrument that created the interest.)",
    SOURCES.guardians,
    { ...G, checklist: "published", checklistNote: "From question 4 of the Master's Guardian's Fund FAQ." },
    [
      slot("doj_gf_j251", "Application for monies from the Guardian's Fund", true, "Completed by the owner of the capital.", "J251"),
      slot("doj_gf_j251a", "Foreign application", false, "Applies if you live outside South Africa.", "J251A"),
      slot("doj_gf_death", "Death certificate", true, "Certified copy of the death certificate of the usufructuary or fiduciary."),
      slot("doj_gf_id", "Beneficiary's identity document or passport", true, "Certified copy.", undefined, true),
      slot("doj_gf_bank", "Banking details", false, bank, "Ceftu 3"),
      slot("doj_gf_prints", "ID copy with fingerprints", false, fingerprints),
    ],
  ),
  tpl(
    "tpl_doj_gf_untraced",
    "Claim money held for an untraced or undetermined beneficiary",
    "For a beneficiary who finds their account (for example in the September Government Gazette list of unclaimed funds).",
    SOURCES.guardians,
    { ...G, checklist: "published", checklistNote: `From question 4 of the Master's Guardian's Fund FAQ. ${noTracers}` },
    [
      slot("doj_gu_j251", "Application for monies from the Guardian's Fund", true, "Completed by the beneficiary.", "J251"),
      slot("doj_gu_id", "Identity document or passport", true, "Certified copy of the account holder's identity document or passport."),
      slot("doj_gu_prints", "ID copy with fingerprints", false, fingerprints),
    ],
  ),
  tpl(
    "tpl_doj_gf_allowance",
    "Apply for maintenance, an allowance or interest from the Guardian's Fund",
    "Maintenance (school and university fees, clothes, medical costs, boarding and lodging and other needs that can be motivated) can be paid from interest and up to R250 000 of the invested capital. Applied for by the guardian, tutor, curator or the person caring for the account holder.",
    SOURCES.gfAllowance,
    { ...G, checklist: "published", checklistNote: "From the DOJ's requirements sheet for allowance applications. The extra documents for applicants living outside South Africa are summarised in one tile: read the sheet for the full wording." },
    [
      slot("doj_ga_j341", "Application for allowance or interest", true, "Completed by the beneficiary or guardian.", "J341"),
      slot("doj_ga_j341a", "Foreign application", false, "Applies if the beneficiary lives outside South Africa.", "J341A"),
      slot("doj_ga_bank", "Bank detail form", true, "Submitted with the application. Payments can go directly to schools, universities and bookshops.", "Ceftu 3"),
      slot("doj_ga_cert", "Certificate of maintenance", true, "Completed by a responsible person: a magistrate, minister of religion, principal or social worker, or by the minor if aged 14 or older."),
      slot("doj_ga_minor_id", "Minor's identity document", true, "Original or certified copy of the minor's bar-coded identity document."),
      slot("doj_ga_guardian_id", "Applicant's (guardian's) identity document", true, "Original or certified copy of the applicant's bar-coded identity document."),
      slot("doj_ga_school", "Minor's school report or results", false, "To be submitted with the application where the minor attends school.", undefined, true),
      slot("doj_ga_quotes", "Quotations", false, "Lodge quotations when payment is requested for clothing, transport and other expenses.", undefined, true),
      slot("doj_ga_prints", "ID copy with fingerprints", false, "Needed with a first application for an allowance, interest or maintenance. " + fingerprints),
      slot("doj_ga_name", "Name-change letter or certificate", false, "Applies if names differ or a name changed: an explanatory letter, or a certificate of alteration of name from Home Affairs."),
      slot("doj_ga_adoption", "Adoption order", false, "Applies if relevant."),
      slot("doj_ga_abroad", "Documents for applicants outside South Africa", false, "The sheet asks for: the guardian's signature authenticated by a notary public; certified passport and birth certificate of the minor and of the guardian; the guardian's marriage certificate if applicable; a letter naming the currency, bank and account details; an authenticated letter saying whether you were always a non-resident or emigrated and when (with emigration details); an authenticated copy of your citizenship certificate; and the bank that handled the emigration settlement.", undefined, true),
    ],
  ),
  tpl(
    "tpl_doj_gf_school_fees",
    "Have school fees paid from the Guardian's Fund",
    "Submit your application in November for the following year, with the school's account and confirmation that the child is registered. Funds are paid directly to the school, and the Master can issue a letter to the school confirming this.",
    SOURCES.faq,
    { ...G, checklist: "partial", checklistNote: "From question 10 of the Master's FAQ. The FAQ says 'your application' without naming a form; J341 is the Guardian's Fund form for an allowance, so confirm with your Master which they want." },
    [
      slot("doj_gs_app", "Application for payment of school fees", true, "Your application to the Guardian's Fund office.", "J341"),
      slot("doj_gs_account", "School's account", true, "The school's account or quotation for the fees."),
      slot("doj_gs_reg", "Confirmation the child is registered", true, "Confirmation that the child is registered to attend the school next year."),
      slot("doj_gs_ceftu", "School's banking details (Ceftu 3)", true, "Completed by the school with its banking details.", "Ceftu 3"),
    ],
  ),
  tpl(
    "tpl_doj_gf_executor",
    "Claim a deceased beneficiary's money (executor or representative)",
    "For an executor or Master's representative claiming money held for a beneficiary who has died.",
    SOURCES.forms,
    { ...G, checklist: "published", checklistNote: "The attachment list is printed on the DOJ form itself (read in full). Section B is a certificate by the executor(s) of the depositing estate." },
    [
      slot("doj_gx_form", "Application for monies by the executor or representative", true, "Section A by the person appointed in the deceased beneficiary's estate; Section B certified by the executor(s) who deposited the money.", "Executor form"),
      slot("doj_gx_letters", "Letters of appointment", true, "Letters of appointment as executor or representative."),
      slot("doj_gx_appointee_id", "Appointee's ID", true, "Certified copy of the ID document of the appointee."),
      slot("doj_gx_benef_id", "Deceased beneficiary's ID or birth certificate", true, "Certified copy of the ID document and/or birth certificate."),
      slot("doj_gx_death", "Death certificate", true, "Certified copy of the deceased beneficiary's death certificate."),
      slot("doj_gx_marriage", "Marriage certificate", false, "Applies if the deceased beneficiary was married: certified copy."),
    ],
  ),
  tpl(
    "tpl_doj_gf_liquidator",
    "Claim money as a liquidator or trustee (insolvent estate)",
    "For a liquidator or trustee claiming money paid into the Guardian's Fund for an insolvent estate or company in liquidation.",
    SOURCES.forms,
    { ...G, checklist: "published", checklistNote: "The attachment list is printed on the DOJ form itself (read in full)." },
    [
      slot("doj_gl_form", "Application by the liquidator or trustee", true, "Section A (applicant), B (the estate or company) and C (certificate of identity).", "Liquidator form"),
      slot("doj_gl_letters", "Letters of appointment", true, "Letters of appointment as trustee or liquidator."),
      slot("doj_gl_id", "Appointee's ID", true, "Certified copy of the ID document of the appointee."),
    ],
  ),
  tpl(
    "tpl_doj_gf_creditor",
    "Claim a refund of unclaimed money (creditor)",
    "For a creditor claiming money that an estate, trustee or liquidator paid in for them.",
    SOURCES.forms,
    { ...G, checklist: "published", checklistNote: `The attachment is printed on the DOJ form itself (read in full). ${noTracers}` },
    [
      slot("doj_gr_form", "Application for refund of unclaimed monies by a creditor", true, "Sections A to C by the applicant; Section D is the depositor's declaration and certificate of identity.", "Creditor form"),
      slot("doj_gr_id", "Identity document with two thumbprints", true, "Certified copy of the bar-coded identity document, with two thumbprints."),
      slot("doj_gr_depositor", "Depositor's declaration (Section D)", false, "Completed by the liquidator, trustee or executor who deposited the money, if not already completed on the form."),
    ],
  ),
  formOnly("tpl_doj_gf_eft_missing", "Report an EFT payment not received", "Affidavit that a Guardian's Fund payment made by EFT was not received.", "Affidavit: payment not received (EFT)", "Affidavit (EFT)", SOURCES.forms, gfNote, G),
  formOnly("tpl_doj_gf_cheque_missing", "Report a cheque payment not received", "Affidavit that a Guardian's Fund payment made by cheque was not received.", "Affidavit: payment not received (cheque)", "Affidavit (cheque)", SOURCES.forms, gfNote, G),
  formOnly("tpl_doj_gf_natural_guardian", "Pay Guardian's Fund money to a natural guardian for investment for a minor", "Application for payment of money from the Guardian's Fund to the natural guardian, to invest for and on behalf of a minor.", "Application for payment to natural guardian for investment for a minor", "Natural guardian form", SOURCES.forms, gfNote, G),
  tpl(
    "tpl_doj_gf_vehicle",
    "Ask for help buying a motor vehicle from the Guardian's Fund",
    "Application for assistance to purchase a motor vehicle from the Guardian's Fund, with an explanation of the assistance needed and how it was worked out.",
    SOURCES.forms,
    { ...G, checklist: "form-only", checklistNote: gfNote },
    [
      slot("doj_gv_form", "Assistance required to purchase a motor vehicle", true, "The DOJ application form.", "Vehicle form"),
      slot("doj_gv_nature", "Nature of assistance required and how arrived at", false, "The DOJ form explaining what is needed and how the amount was worked out."),
      supportingDocs("doj_gv_support"),
    ],
  ),
];

const CURATOR_TEMPLATES: Template[] = [
  tpl(
    "tpl_doj_curator_apply",
    "Apply for appointment as a curator or tutor",
    "A tutor looks after a minor's property and a curator looks after the property of a person under disability or an absent person. The application is signed before a magistrate or other responsible person, with witnesses.",
    SOURCES.forms,
    { ...C, checklist: "partial", checklistNote: "Built from form J197 (read in full) and the curator and tutor forms on the DOJ forms page. The form says the bond of security is attached or will follow, or that you are exempt. It does not list further supporting documents: confirm with the Master." },
    [
      slot("doj_cu_j197", "Application for appointment as tutor or curator", true, "Names the minor or the person under disability or absent; states your domicilium, that you are not an unrehabilitated insolvent, and your bond or exemption.", "J197"),
      slot("doj_cu_bond", "Bond of security or proof of exemption", false, "A bond for the full value of the assets is attached or forwarded later, unless you are exempt. Bond forms: J312 (curator or tutor), J262 (interim curator), J344.", "J312"),
      slot("doj_cu_j243", "Inventory", false, "Listed among the curator and tutor forms: inventory of the assets.", "J243"),
      supportingDocs("doj_cu_support"),
    ],
  ),
  formOnly("tpl_doj_curator_notice", "Notice of curator or tutor appointment (Government Gazette)", "Notice of a curator and tutor, a Government Printing Works form.", "Notice of Curator and Tutor", "J295", SOURCES.forms, gpwNote, C),
  formOnly("tpl_doj_curator_election", "Election of executors, curators and tutors (Government Gazette)", "Notice of an election of executors, curators and tutors, a Government Printing Works form.", "Election of executors, curators and tutors", "J297", SOURCES.forms, gpwNote, C),
];

const INSOLVENCY_FORMS: [string, string, string, string][] = [
  ["j28", "Notice: estate or company sequestrated or wound up provisionally", "Insolvent estates, companies or close corporations sequestrated or wound up provisionally.", "J28"],
  ["j29", "Notice: first meeting of creditors (estates and companies)", "First meetings of creditors, contributories, members or debenture-holders of sequestrated estates or companies being wound up.", "J29"],
  ["j29cc", "Notice: first meeting of creditors (close corporations)", "First meetings of creditors and members of close corporations being wound up.", "J29 CC"],
  ["form1", "Appoint trustees and liquidators; proof of claims", "Appointment of trustees and liquidators and proof of claims in sequestrated estates or companies being wound up.", "Insolvency Form 1"],
  ["form2", "Notice of meeting of creditors", "Meeting of creditors in sequestrated estates or companies being wound up.", "Insolvency Form 2"],
  ["form3", "Extend the time to lodge liquidation accounts", "Extension of time within which to lodge liquidation accounts and plans of distribution or contribution.", "Insolvency Form 3"],
  ["form4", "Lodge liquidation accounts and plans of distribution or contribution", "Liquidation accounts and plans of distribution or contribution in sequestrated estates or companies being wound up.", "Insolvency Form 4"],
  ["form5", "Pay dividends and collect contributions", "Payment of dividends and collection of contributions in sequestrated estates or companies being wound up.", "Insolvency Form 5"],
  ["form6", "Apply for rehabilitation", "Application for rehabilitation.", "Insolvency Form 6"],
  ["form7", "Notice of trustees", "Notice of trustees.", "Insolvency Form 7"],
  ["form8", "Dates fixed for creditors to prove claims", "Dates fixed for creditors to prove claims.", "Insolvency Form 8"],
  ["form9", "Notice of surrender of a debtor's estate", "Notice of surrender of a debtor's estate.", "Insolvency Form 9"],
];

const INSOLVENCY_TEMPLATES: Template[] = [
  ...INSOLVENCY_FORMS.map(([id, name, desc, ref]) => formOnly(`tpl_doj_ins_${id}`, name, desc, name, ref, SOURCES.forms, gpwNote, I)),
  formOnly("tpl_doj_ins_bond_s9", "Liquidator's bond of security (section 9(3))", "Bond of security in terms of section 9(3) of the Insolvency Act, 1936, section 346(3) of the Companies Act, 1973 read with section 66 of the Close Corporations Act, 1984.", "Bond of security, section 9(3)", "J475", SOURCES.forms, "The DOJ forms page names the form but lists no supporting documents: confirm with the Master.", I),
  formOnly("tpl_doj_ins_bond_prov", "Bond of security by provisional liquidator(s) or liquidator(s)", "Undertaking and bond of security by provisional liquidators or liquidators.", "Undertaking and bond of security", "J468", SOURCES.forms, "The DOJ forms page names the form but lists no supporting documents: confirm with the Master.", I),
  formOnly("tpl_doj_ins_list_new", "Apply to be placed on the national list of liquidators", "Affidavit providing the required information for persons applying to be placed on the National List of Liquidators.", "Affidavit for the National List of Liquidators (new)", "Liquidator list affidavit", SOURCES.forms, "The DOJ forms page provides the affidavit (updated 20 March 2017) but no supporting-document list: confirm with the Master.", I),
  formOnly("tpl_doj_ins_list_renew", "Renew your place on the national list of liquidators", "Renewal affidavit providing the required information for persons applying to remain on the National List of Liquidators.", "Renewal affidavit for the National List of Liquidators", "Liquidator list renewal", SOURCES.forms, "The DOJ forms page provides the renewal affidavit (updated 20 March 2017) but no supporting-document list: confirm with the Master.", I),
];

export const MASTER_OTHER_TEMPLATES: Template[] = [...GUARDIAN_TEMPLATES, ...CURATOR_TEMPLATES, ...INSOLVENCY_TEMPLATES];
