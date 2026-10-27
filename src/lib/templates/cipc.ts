import type { Template, TemplateSlot } from "@/types";
import { CIPC_CATEGORY } from "./cipc-category";
import { CIPC_IP_TEMPLATES } from "./cipc-ip";
import { slot, tpl } from "./helpers";
import { SOURCES } from "./sources";

/**
 * Companies and Intellectual Property Commission (CIPC) services for companies and close corporations,
 * transcribed from CIPC's own "contact details, forms and supporting documents required" list (2021 edition,
 * still hosted on cipc.co.za), its current Forms and Fees pages and its 2026 e-mail address list (all read
 * 2026-10-27). Intellectual property services are in ./cipc-ip.ts. Annual returns and beneficial ownership filing
 * are not included.
 * "Required" = listed by the source without a condition. Conditional items are optional, with the condition in the
 * help text; users can change a slot's required flag in the pack builder.
 */
export { CIPC_CATEGORY };
export const REGISTER_COMPANY = "Register a company";
export const COMPANY_NAMES = "Company names";
export const COMPANY_CHANGES = "Company changes";
export const CLOSE_CORPORATIONS = "Close corporations";
export const CONVERSIONS = "Conversions";
export const WINDING_UP = "Winding up and deregistration";
export const BUSINESS_RESCUE = "Business rescue";

const note = "From CIPC's own list of supporting documents (2021 edition, still hosted on cipc.co.za); form numbers checked against CIPC's current forms pages. Fees and e-mail addresses change: check CIPC's Forms and Fees pages and current address list before you lodge.";
const formOnlyNote = "CIPC's list names this form but no supporting documents: confirm with CIPC what to attach.";

const idApplicant = (p: string) => slot(`${p}_id_applicant`, "Certified ID copy of applicant", true, "Certified identity copy of the person who lodges the application.");
const idSignatory = (p: string) => slot(`${p}_id_signatory`, "Certified ID copy of signatory", true, "Certified copy of the ID of the signatory (an active director, the company secretary or a company representative).");
const poa = (p: string) => slot(`${p}_poa`, "Power of attorney", false, "Applies if a representative lodges the application.");
const idsIncorporators = (p: string) => slot(`${p}_id_incorporators`, "Certified ID copies of incorporators and directors", true, "Certified identity copies of all incorporators and directors.", undefined, true);
const nameConfirmation = (p: string) => slot(`${p}_cor94`, "Confirmation of name reservation", false, "Applies if the company name was reserved beforehand: the confirmation notice of the name reservation.", "CoR9.4");

const sendTo = (address: string, extra: string[] = []) => [
  `Email the completed forms and the supporting documents to ${address}. CIPC warns that documents sent to the wrong address are not processed.`,
  "CIPC's service standard depends on the fee having been paid. Fees are on CIPC's Forms and Fees pages.",
  ...extra,
];
const online = "CIPC advises customers to transact electronically where they can (on e-Services) rather than complete a form and email it.";

const R = { category: CIPC_CATEGORY, subcategory: REGISTER_COMPANY } as const;
const N = { category: CIPC_CATEGORY, subcategory: COMPANY_NAMES } as const;
const C = { category: CIPC_CATEGORY, subcategory: COMPANY_CHANGES } as const;
const K = { category: CIPC_CATEGORY, subcategory: CLOSE_CORPORATIONS } as const;
const V = { category: CIPC_CATEGORY, subcategory: CONVERSIONS } as const;
const W = { category: CIPC_CATEGORY, subcategory: WINDING_UP } as const;
const B = { category: CIPC_CATEGORY, subcategory: BUSINESS_RESCUE } as const;

/** Notice of incorporation plus the memorandum, and the annexures CIPC lists for each type of company. */
function incorporation(
  id: string, name: string, description: string, moi: { ref: string; label: string },
  opts: { ringFencing: boolean; juristic?: boolean; steps: string[] },
) {
  const p = `cipc_${id}`;
  const slots: TemplateSlot[] = [
    slot(`${p}_cor141`, "Notice of incorporation", true, "Must have the Memorandum of Incorporation attached.", "CoR14.1"),
    slot(`${p}_moi`, moi.label, true, "The memorandum the company will be registered with.", moi.ref),
    slot(`${p}_annex_a`, "Annexure A: initial directors", true, "Lists the initial directors of the company.", "CoR14.1 Annexure A"),
    slot(`${p}_annex_b`, "Annexure B: alternative names", false, "Applies if the name is to be reserved at incorporation.", "CoR14.1 Annexure B"),
  ];
  if (opts.ringFencing) slots.push(slot(`${p}_annex_c`, "Annexure C: ring-fencing provisions", false, "Applies if the memorandum has ring-fencing provisions.", "CoR14.1 Annexure C"));
  slots.push(
    slot(`${p}_annex_d`, "Annexure D: company appointments", false, `Applies if an auditor${opts.ringFencing ? ", audit committee members" : ""} and/or a company secretary is appointed.`, "CoR14.1 Annexure D"),
    nameConfirmation(p), idApplicant(p), idsIncorporators(p), poa(p),
  );
  if (opts.juristic) {
    slots.push(slot(`${p}_juristic`, "Resolution of a trust or company incorporator", false, "Applies if a trust or company (a juristic person) is an incorporator: its resolution, with the certified ID copy of its duly authorised representative.", undefined, true));
  }
  return tpl(`tpl_cipc_${id}`, name, description, SOURCES.cipcDocs, { ...R, nextSteps: opts.steps, checklist: "published", checklistNote: note }, slots);
}

const registerManually = sendTo("companydocs@cipc.co.za");
const registerPrivate = [
  "CIPC advises registering a private company with the standard memorandum online (BizPortal, e-Services or a self-service terminal) rather than manually.",
  "To register manually, email the completed forms and the supporting documents to companydocs@cipc.co.za. CIPC warns that documents sent to the wrong address are not processed.",
  "CIPC's service standard depends on the fee having been paid. Fees are on CIPC's Forms and Fees pages.",
];

const REGISTER_TEMPLATES: Template[] = [
  incorporation("private_short", "Register a private company: short standard MOI",
    "Notice of incorporation with the short standard memorandum for private companies (CoR15.1A). A private company needs at least one director and one incorporator, who may be the same person.",
    { ref: "CoR15.1A", label: "Memorandum of Incorporation: short standard form" }, { ringFencing: false, juristic: true, steps: registerPrivate }),
  incorporation("profit_long", "Register a profit company: long standard MOI",
    "Notice of incorporation with the long standard memorandum for profit companies (CoR15.1B).",
    { ref: "CoR15.1B", label: "Memorandum of Incorporation: long standard form" }, { ringFencing: true, steps: registerManually }),
  incorporation("npc_short", "Register a non-profit company without members: short standard MOI",
    "Notice of incorporation with the short standard memorandum for non-profit companies without members (CoR15.1C). A non-profit company must have a name and cannot use its registration number alone as its name.",
    { ref: "CoR15.1C", label: "Memorandum of Incorporation: short standard form (non-profit, no members)" }, { ringFencing: false, steps: registerManually }),
  incorporation("npc_long", "Register a non-profit company without members: long standard MOI",
    "Notice of incorporation with the long standard memorandum for non-profit companies without members (CoR15.1D).",
    { ref: "CoR15.1D", label: "Memorandum of Incorporation: long standard form (non-profit, no members)" }, { ringFencing: true, steps: registerManually }),
  incorporation("npc_members", "Register a non-profit company with members: long standard MOI",
    "Notice of incorporation with the long standard memorandum for non-profit companies with members (CoR15.1E).",
    { ref: "CoR15.1E", label: "Memorandum of Incorporation: long standard form (non-profit, with members)" }, { ringFencing: true, steps: registerManually }),
  tpl(
    "tpl_cipc_external",
    "Register an external (foreign) company",
    "Notice of registration of a company incorporated outside South Africa that does business here.",
    SOURCES.cipcDocs,
    { ...R, nextSteps: sendTo("companydocs@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_ext_cor201", "Notice of registration of external company", true, "Completed notice.", "CoR20.1"),
      slot("cipc_ext_cor201a", "Annexure to the notice of registration", true, "Listed with the notice as a main form.", "CoR20.1 Annexure A"),
      slot("cipc_ext_cor211", "Notice of change of registered office", false, "Listed by CIPC as a secondary form.", "CoR21.1"),
      slot("cipc_ext_moi", "Memorandum of Incorporation (certified copy)", true, "Certified copy of the company's memorandum of incorporation."),
      slot("cipc_ext_cert", "Certificate of incorporation (certified copy)", true, "Certified copy of the certificate of incorporation, or a comparable document, registered in the foreign jurisdiction."),
      slot("cipc_ext_current", "Current registration certificate (certified copy)", false, "Applies if it is different from the certificate of incorporation."),
      slot("cipc_ext_translation", "Translated copies", false, "Applies if an original is not in an official language of South Africa: a translated copy of each such document.", undefined, true),
    ],
  ),
  tpl(
    "tpl_cipc_foreign_transfer",
    "Transfer a foreign company's registration to South Africa",
    "Application by a foreign company to move its registration to the Republic.",
    SOURCES.cipcDocs,
    { ...R, nextSteps: sendTo("companydocs@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_ft_cor171", "Application to transfer registration", true, "Completed application.", "CoR17.1"),
      slot("cipc_ft_law", "Letter of law of the foreign jurisdiction", true, "A letter of the law of the jurisdiction where the company is registered, showing that it permits the transfer."),
      slot("cipc_ft_moi", "Memorandum of Incorporation", true, "Completed and signed: CoR15.1A or B, or the company's own memorandum.", "CoR15.1A / B"),
      slot("cipc_ft_cert", "Current registration certificate", true, "Copy of the certificate of its current registration, issued by the jurisdiction where it is registered at the time of the application."),
      slot("cipc_ft_afs", "Recent annual financial statements", true, "Copy of the company's recent annual financial statements."),
      slot("cipc_ft_resolution", "Shareholder resolution", true, "Copy of the shareholder resolution approving the transfer of the registration to South Africa."),
      slot("cipc_ft_affidavit", "Affidavit", true, "Listed by CIPC with the application documents."),
    ],
  ),
];

const NAME_TEMPLATES: Template[] = [
  tpl(
    "tpl_cipc_name_reserve",
    "Reserve a company name",
    "Application to reserve a company name. CIPC says this can be done electronically.",
    SOURCES.cipcDocs,
    { ...N, nextSteps: [online, ...sendTo("namereservationsandregistrations@cipc.co.za")], checklist: "published", checklistNote: note },
    [
      slot("cipc_nr_cor91", "Application to reserve a company name", true, "Completed application.", "CoR9.1"),
      idApplicant("cipc_nr"),
      slot("cipc_nr_owner", "Letter from the owner of the associated name", false, "Applies if an associated name is used (the form's options under item 1(2) or 2 are ticked yes): a letter from the owner of the company, close corporation, co-operative or trade mark."),
      slot("cipc_nr_translation", "Certificate of translation", false, "Applies if the name is in a language other than one of South Africa's official languages."),
    ],
  ),
  tpl(
    "tpl_cipc_name_defensive",
    "Register a defensive name",
    "Application to register a name defensively, which needs a direct and material interest in that name.",
    SOURCES.cipcDocs,
    { ...N, nextSteps: sendTo("namereservationsandregistrations@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_nd_cor101", "Application for defensive name registration", true, "Completed application.", "CoR10.1"),
      slot("cipc_nd_interest", "Proof of a material interest in the name", true, "Evidence that the applicant has a direct and material interest in the name."),
    ],
  ),
  tpl(
    "tpl_cipc_name_transfer",
    "Transfer a reserved or registered name",
    "Application to transfer a reserved or registered company name to another person.",
    SOURCES.cipcDocs,
    { ...N, nextSteps: sendTo("namereservationsandregistrations@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_nt_cor111", "Application to transfer a name", true, "Completed application.", "CoR11.1"),
      slot("cipc_nt_transferor", "Details of the transferor", true, "Details of the person transferring the name."),
      slot("cipc_nt_reservation", "Reserved name and reservation number", true, "The reserved name and its reservation number, as they appear on the confirmation of name reservation.", "CoR9.4"),
      slot("cipc_nt_transferee", "Name and address of the transferee", true, "Name and address of the person receiving the name."),
      slot("cipc_nt_ids", "Certified ID copies of transferor and transferee", true, "Certified copies of the identity documents of both.", undefined, true),
    ],
  ),
];

/** A change that needs only the application's form and the applicant's certified ID. */
function simpleChange(id: string, name: string, description: string, form: string, ref: string, address: string, extraNote?: string) {
  return tpl(`tpl_cipc_${id}`, name, description, SOURCES.cipcDocs, { ...C, nextSteps: [online, ...sendTo(address)], checklist: "published", checklistNote: extraNote ? `${note} ${extraNote}` : note }, [
    slot(`cipc_${id}_form`, name, true, `${form}.`, ref),
    idApplicant(`cipc_${id}`),
  ]);
}

/** A change to the memorandum: the decision, the signatory and the applicant. */
function moiChange(id: string, name: string, description: string, ref: string, specific: TemplateSlot[], secondary: TemplateSlot[] = []) {
  const p = `cipc_${id}`;
  return tpl(`tpl_cipc_${id}`, name, description, SOURCES.cipcDocs, { ...C, nextSteps: sendTo("moiamendments@cipc.co.za"), checklist: "published", checklistNote: note }, [
    slot(`${p}_form`, name, true, "Completed notice.", ref),
    ...secondary, ...specific, idSignatory(p), poa(p), idApplicant(p),
  ]);
}

const CHANGE_TEMPLATES: Template[] = [
  simpleChange("registered_office", "Change a company's registered office", "Notice of change of the company's registered office.", "Notice of change of registered office", "CoR21.1", "companychanges@cipc.co.za"),
  simpleChange("records_location", "Notify where company records are kept", "Notice of the location of company records. It is filed only if the records are not kept at the registered office.", "Notice of location of company records", "CoR22", "companychanges@cipc.co.za"),
  simpleChange("service_person", "Name a person authorised to accept service", "Notice of the person authorised to accept service on the company's behalf.", "Notice of person authorised to accept service", "CoR21.2", "CoR21.2@cipc.co.za"),
  simpleChange("year_end", "Change a company's financial year end", "Notice of change of the company's financial year end.", "Notice of change of financial year end", "CoR25", "companychanges@cipc.co.za"),
  tpl(
    "tpl_cipc_directors",
    "Change a company's directors",
    "Notice of change concerning a director: an appointment, resignation, removal, death or other change. CIPC advises filing director changes electronically.",
    SOURCES.cipcDocs,
    {
      ...C,
      nextSteps: [
        "File the change on CIPC's e-Services where you can: CIPC advises this over a manual form. For an electronic change, a copy of the CoR39 is filed with the supporting documents, which CIPC verifies before it releases the transaction.",
        "CIPC's 2021 list gives cm29admin4@cipc.co.za for electronic supporting documents and manualcor39@cipc.co.za for a hand-completed CoR39. The 2026 address list does not show director changes, so confirm the current address with CIPC.",
        "Which of the optional documents apply depends on the kind of change (see each tile).",
      ],
      checklist: "published",
      checklistNote: note,
    },
    [
      slot("cipc_dir_cor39", "Notice of change concerning a director", true, "CoR39. For an electronic filing, a copy of it is filed with the other supporting documents so the transaction can be unlocked.", "CoR39"),
      idApplicant("cipc_dir"),
      slot("cipc_dir_ids", "Certified ID copies of resigning, appointed and active directors", true, "Certified copies of the IDs of the directors resigning, being appointed and currently active.", undefined, true),
      slot("cipc_dir_disqualified", "Proof of disqualification or delinquency", false, "Depends on the change: a court order or sequestration order.", undefined, true),
      slot("cipc_dir_death", "Proof of death", false, "Depends on the change: the executor's letter of appointment or the death certificate."),
      slot("cipc_dir_incapacity", "Proof of incapacity", false, "Depends on the change: a court order appointing a curator, or a sequestration order.", undefined, true),
      slot("cipc_dir_resignation", "Proof of resignation", false, "Depends on the change: the director's letter of resignation."),
      slot("cipc_dir_appointment", "Proof of appointment", false, "Depends on the change: the letter of acceptance of appointment, or the minutes appointing the director.", undefined, true),
      slot("cipc_dir_mandate", "Mandate for the applicant", false, "Authority for the applicant to lodge the notice on behalf of the company."),
      slot("cipc_dir_resolution", "Resolution or minutes of the meeting", false, "The resolution or minutes by which the director was appointed, resigned, was removed or was not re-appointed.", undefined, true),
    ],
  ),
  tpl(
    "tpl_cipc_auditor_secretary",
    "Change a company's auditor or company secretary",
    "Notice of a change of auditor or company secretary (appointments and resignations), or of audit committee members.",
    SOURCES.cipcDocs,
    { ...C, nextSteps: [online, ...sendTo("CoR44@cipc.co.za")], checklist: "published", checklistNote: note },
    [
      slot("cipc_aud_cor44", "Notice of change of auditor or company secretary", true, "Completed notice.", "CoR44"),
      idApplicant("cipc_aud"),
      slot("cipc_aud_committee", "Certified ID copies of audit committee members", false, "Applies if audit committee members are appointed or changed.", undefined, true),
    ],
  ),
  moiChange("moi_amend", "Amend the Memorandum of Incorporation", "Notice of amendment of a company's memorandum, by special resolution. A draft of a proposed amendment may be lodged for vetting.", "CoR15.2",
    [
      slot("cipc_moia_resolution", "Resolution or minutes", true, "Certified copy of the written resolution, or of the minutes of the meeting at which the decision to amend was taken."),
      slot("cipc_moia_cor94", "Approved name reservation", false, "Applies if the name is changing: the approved and valid CoR9.4.", "CoR9.4"),
    ],
    [
      slot("cipc_moia_annex", "Notice of ring-fencing provisions", false, "Applies if the amendment changes the ring-fencing status of the memorandum.", "CoR15.2 Annexure A"),
      slot("cipc_moia_moi", "Memorandum of Incorporation", false, "Applies if you are aligning the memorandum: the relevant standard form (CoR15.1B, C, D or E) or the company's own memorandum.", "CoR15.1B-E"),
    ]),
  moiChange("moi_alter", "Alter the Memorandum of Incorporation or company rules (corrections)", "Notice of alteration of the memorandum, used to correct mistakes such as errors.", "CoR15.3",
    [
      slot("cipc_moial_publication", "Proof of publication", true, "Copy of the proof of publication."),
      slot("cipc_moial_extract", "Memorandum or extract showing the corrections", true, "A copy of the memorandum, or an extract of it, indicating the corrections."),
    ]),
  moiChange("moi_translate", "Translate the Memorandum of Incorporation", "Notice of translation of the memorandum into another South African official language.", "CoR15.4",
    [
      slot("cipc_moitr_translation", "Copy of the translation", true, "Copy of the translated memorandum."),
      slot("cipc_moitr_certificate", "Translation certificate", true, "The translation certificate."),
    ]),
  moiChange("moi_consolidate", "Consolidate the Memorandum of Incorporation", "Notice of a consolidated revision of the memorandum, for when three or more amendments have been made.", "CoR15.5",
    [
      slot("cipc_moic_revision", "Consolidated revision of the memorandum", true, "The consolidated revision itself. CIPC's Companies forms page says the notice must be accompanied by it."),
      slot("cipc_moic_sworn", "Sworn statement", true, "A sworn statement by a director, or a statement by an attorney or notary public."),
    ]),
  tpl(
    "tpl_cipc_par_value",
    "Convert par value shares to no par value shares",
    "Notice to convert a company's par value shares into shares of no par value, with a board report.",
    SOURCES.cipcDocs,
    { ...C, nextSteps: sendTo("moiamendments@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_pv_cor152", "Notice of amendment of the memorandum", true, "Listed with the notice as a main form.", "CoR15.2"),
      slot("cipc_pv_cor31", "Notice of board resolution to convert par value shares", true, "Completed notice.", "CoR31"),
      slot("cipc_pv_resolution", "Board resolution or minutes", true, "Original or certified copy of the written board resolution, or the minutes of the meeting at which the decision to convert was taken."),
      slot("cipc_pv_report", "Board report", true, "The board report in terms of Regulation 31(7)."),
      idSignatory("cipc_pv"), poa("cipc_pv"), idApplicant("cipc_pv"),
    ],
  ),
];

const CLOSE_CORPORATION_TEMPLATES: Template[] = [
  tpl(
    "tpl_cipc_cc_amend",
    "Amend a close corporation (CK2)",
    "Amended founding statement: a change in principal business, name, members or financial details. CIPC will not act on the request until it has the CK2 signed by all members and resigning members, with all the supporting documents.",
    SOURCES.cipcDocs,
    {
      ...K,
      nextSteps: [
        "Membership changes can be filed through e-Services (supporting documents to eservicesck2@cipc.co.za) or manually (certified scanned or hard copy of the signed CK2 and the supporting documents to manualck2@cipc.co.za, or posted to CIPC).",
        "A change in principal business, financial year end or address filed manually also goes to manualck2@cipc.co.za. (Addresses from CIPC's 2026 list.)",
        "Where there is more than one member, all members provide certified copies of their IDs, including the person who lodges on behalf of the others.",
      ],
      checklist: "published",
      checklistNote: note,
    },
    [
      slot("cipc_cc_ck2", "Amended founding statement", true, "Signed by all members and resigning members.", "CK2"),
      slot("cipc_cc_control", "CK2 / CK2A control sheet", false, "CIPC's sheet for checking that all information is submitted with the forms.", "CK2/CK2A control sheet"),
      idApplicant("cipc_cc"),
      slot("cipc_cc_member_ids", "Certified ID copies of all members and resigning members", true, "Certified IDs of every member and resigning member.", undefined, true),
      slot("cipc_cc_minutes", "Notice of meeting and signed minutes", false, "Applies to every CK2 that changes membership: a certified copy of the notice of the meeting and an extract of the minutes, signed by all members, showing the resolution to appoint or remove a member.", undefined, true),
      slot("cipc_cc_passports", "Certified passports or refugee documents", false, "Applies where a member has a passport, or is a refugee or asylum seeker: certified copies of the passport or of the valid prescribed documentation.", undefined, true),
      slot("cipc_cc_executor", "Executor's letter and ID (deceased member)", false, "Applies if a member has died: the executor's letter from the Master of the High Court, and the certified ID of the executor, who must sign the CK2.", undefined, true),
    ],
  ),
  tpl(
    "tpl_cipc_cc_address",
    "Change a close corporation's address or accounting officer (CK2A)",
    "Amendment regarding the accounting officer and the corporation's addresses.",
    SOURCES.cipcDocs,
    { ...K, nextSteps: sendTo("manualck2@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_cca_ck2a", "Amendment regarding accounting officer and addresses", true, "Signed by all members.", "CK2A"),
      slot("cipc_cca_control", "CK2 / CK2A control sheet", false, "CIPC's sheet for checking that all information is submitted with the forms.", "CK2/CK2A control sheet"),
      idApplicant("cipc_cca"),
      slot("cipc_cca_appointment", "Appointment letter of the new accounting officer", false, "Applies if the accounting officer changes: the appointment letter of the new accountant."),
      slot("cipc_cca_consent", "Consent letter from the accounting officer", false, "Applies if the accounting officer changes: the new accounting officer's letter of consent."),
    ],
  ),
];

const CONVERSION_TEMPLATES: Template[] = [
  tpl(
    "tpl_cipc_cc_to_company",
    "Convert a close corporation to a company",
    "Notice of conversion of a close corporation to a private company. It needs a statement that the close corporation is not in liquidation or in business rescue.",
    SOURCES.cipcDocs,
    { ...V, nextSteps: sendTo("companydocs@cipc.co.za"), checklist: "published", checklistNote: `${note} Based on CIPC's more detailed list for conversion to a private company.` },
    [
      slot("cipc_cv_cor181", "Notice of conversion of a close corporation", true, "Completed notice (with the tracking number).", "CoR18.1"),
      slot("cipc_cv_moi", "Memorandum of Incorporation", true, "CoR15.1A, CoR15.1B or the company's own memorandum. The notice must have it attached.", "CoR15.1A / B"),
      slot("cipc_cv_cor39", "Appointment of initial directors", true, "Notice of change concerning a director, to appoint the initial directors.", "CoR39"),
      slot("cipc_cv_resolution", "Resolution or minutes to convert", true, "Original or certified copy of the written resolution, or of the minutes of the meeting with its agenda or notice, at which the decision to convert was taken."),
      slot("cipc_cv_director_ids", "Certified ID copies of directors", true, "Certified copies of the IDs of the directors.", undefined, true),
      idApplicant("cipc_cv"),
      slot("cipc_cv_statement", "Statement that the close corporation is not in liquidation or business rescue", true, "A written statement, in a letter, that the close corporation is not in liquidation or engaged in business rescue proceedings."),
      slot("cipc_cv_cor211", "Change of registered office", false, "Applies if the registered office changes.", "CoR21.1"),
      slot("cipc_cv_cor25", "Change of financial year end", false, "Applies if the financial year end changes.", "CoR25"),
      slot("cipc_cv_cor44", "Appointment or change of auditor, secretary or audit committee", false, "Applies if an auditor, company secretary or audit committee is appointed or changed.", "CoR44", true),
      slot("cipc_cv_name", "Name reservation or change of name", false, "Applies if the name changes: the reserved name (CoR9.4) or an application to reserve one.", "CoR9.4 / CoR9.1"),
    ],
  ),
  tpl(
    "tpl_cipc_company_type",
    "Convert one type of company to another",
    "Conversion between company types, done through an amendment of the memorandum.",
    SOURCES.cipcDocs,
    { ...V, nextSteps: sendTo("moiamendments@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_ct_cor152", "Notice of amendment of the memorandum", true, "Completed notice.", "CoR15.2"),
      slot("cipc_ct_annex", "Notice of ring-fencing provisions", false, "Applies if the memorandum is to contain ring-fencing provisions.", "CoR15.2 Annexure A"),
      slot("cipc_ct_moi", "Memorandum for the new company type", true, "The relevant memorandum for the newly adopted company type: CoR15.1B, C, D, E or the company's own.", "CoR15.1B-E"),
      slot("cipc_ct_director_ids", "Certified ID copies of directors", true, "Certified copies of the IDs of the directors.", undefined, true),
      idApplicant("cipc_ct"),
      slot("cipc_ct_resolution", "Resolution or minutes to convert", true, "Original or certified copy of the written resolution, or the minutes of the meeting at which the decision to convert was taken."),
    ],
  ),
  tpl(
    "tpl_cipc_company_to_coop",
    "Convert a company to a co-operative",
    "Application to convert a company into a co-operative. Needs proof that creditors were told and are not prejudiced.",
    SOURCES.cipcDocs,
    { ...V, nextSteps: sendTo("Coopsconversions@cipc.co.za", ["That address is the one CIPC's 2026 list gives for co-operative conversions. Its 2021 list gives no address for this conversion, so confirm with CIPC."]), checklist: "published", checklistNote: note },
    [
      slot("cipc_cp_cr1", "Application for registration of a co-operative", true, "Completed application.", "CR1"),
      slot("cipc_cp_constitution", "Constitution (in duplicate)", true, "The constitution in duplicate: CR4 or CR8.", "CR4 / CR8", true),
      slot("cipc_cp_name", "Name change", false, "Applies if the name changes with the conversion: CR5 or CoR9.4.", "CR5 / CoR9.4"),
      idApplicant("cipc_cp"),
      slot("cipc_cp_member_ids", "Certified ID copies of members", true, "Certified copies of the members' identity documents.", undefined, true),
      slot("cipc_cp_creditors", "Proof about creditors", true, "Proof of written notice of at least 3 months of the proposal to each creditor with a claim above R1000; that any creditor who demanded payment has been paid in full; and that no creditor will be prejudiced by the conversion.", undefined, true),
      slot("cipc_cp_resolution", "Resolution and reasons", true, "Copy of the resolution and an explanation of the reasons for the conversion."),
      slot("cipc_cp_registration", "Proof of company registration", true, "Proof that the company is registered."),
      slot("cipc_cp_moi", "Memorandum and articles of association (two certified copies)", true, "Two certified copies of the company's memorandum and articles of association.", undefined, true),
      slot("cipc_cp_afs", "Latest audited financial statements", true, "A certified copy of the company's latest audited financial statements."),
      slot("cipc_cp_members", "Schedule of members", true, "Full names and addresses of the members, the number and class of shares each holds, and each member's occupation."),
      slot("cipc_cp_directors", "Schedule of directors", true, "Full names and addresses of the company's directors."),
      slot("cipc_cp_interests", "Schedule of interests in other companies", true, "Particulars and extent of the company's interest in any other company."),
    ],
  ),
  tpl(
    "tpl_cipc_coop_to_company",
    "Convert a co-operative to a company",
    "Application to convert a co-operative into a company and cancel its registration as a co-operative. It needs the approval of the Registrar of Co-operatives.",
    SOURCES.cipcDocs,
    { ...V, nextSteps: sendTo("companydocs@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_pc_incorporation", "New company incorporation forms", true, "CIPC's list says the forms are the same as for a new incorporation: the notice of incorporation with a memorandum.", "CoR14.1", true),
      slot("cipc_pc_cover", "Cover letter", true, "A letter requesting conversion to a company and cancellation of the co-operative's registration."),
      slot("cipc_pc_proposal", "Board proposal and reasons", true, "A copy of the board's proposal to members at a general meeting to convert, with the detailed reasons. Members must have approved it by special resolution."),
      slot("cipc_pc_notice", "Notice of the general meeting", true, "A copy of the notice of the general meeting."),
      slot("cipc_pc_declaration", "Declaration by the board", true, "A declaration that the application complies with the Co-operatives Act, 2005, and that creditors' interests will be protected under section 64 of that Act."),
      slot("cipc_pc_creditors", "Proof about creditors", true, "Proof of written notice of at least 3 months of the proposal to each creditor with a claim above R1000; that any creditor who demanded payment has been paid; and that no creditor will be prejudiced.", undefined, true),
      slot("cipc_pc_registrar", "Approval letter from the Registrar of Co-operatives", true, "The Registrar's approval of the conversion."),
    ],
  ),
];

const WINDING_UP_TEMPLATES: Template[] = [
  tpl(
    "tpl_cipc_wind_up_solvent",
    "Wind up a solvent company or close corporation voluntarily",
    "Notice of resolution to wind up a solvent company or close corporation (section 82 of the Companies Act, 2008, as CIPC's list states it).",
    SOURCES.cipcDocs,
    { ...W, nextSteps: sendTo("liquidations@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_ws_cor401", "Notice of resolution to wind up a solvent company", true, "Completed notice.", "CoR40.1"),
      slot("cipc_ws_resolution", "Special resolution or minutes", true, "Original or certified copy of the written special resolution, or of the minutes with the agenda or notice of the meeting at which the decision to wind up was taken."),
      slot("cipc_ws_security", "Security or consent to dispense with security", false, "Applies if the winding up is by the company or its members: security (JM12), or the consent to dispense with security.", "JM12"),
      idSignatory("cipc_ws"), poa("cipc_ws"),
    ],
  ),
  tpl(
    "tpl_cipc_wind_up_insolvent",
    "Wind up an insolvent company or close corporation voluntarily",
    "Voluntary winding up under Chapter 14 of the Companies Act, 1973. CIPC's list gives a penalty for filing the special resolution more than a month after the meeting.",
    SOURCES.cipcDocs,
    { ...W, nextSteps: sendTo("liquidations@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_wi_cm26", "Special resolution", true, "Completed special resolution form.", "CM26"),
      slot("cipc_wi_consent", "Consent to waive notice, with the notice of the meeting", true, "CM25A or CM25, plus the notice of the meeting.", "CM25A / CM25"),
      slot("cipc_wi_resolution", "Special resolution or minutes", true, "Original or certified copy of the written special resolution, or of the minutes with the agenda or notice of the meeting at which the decision to wind up was taken."),
      slot("cipc_wi_security", "Security or consent to dispense with security", false, "Applies if the winding up is by the company: security (JM12) or the consent to dispense with it.", "JM12"),
      slot("cipc_wi_cm100", "Statement of company affairs", true, "Completed statement of affairs.", "CM100"),
      idSignatory("cipc_wi"), poa("cipc_wi"),
    ],
  ),
  tpl(
    "tpl_cipc_wind_up_court",
    "Lodge a winding-up court order",
    "For a winding up ordered by a court. CIPC's 2026 list sends court documents and court orders to its corporate legal services.",
    SOURCES.cipcDocs,
    { ...W, nextSteps: sendTo("corporatelegalservices@cipc.co.za", ["That address is from CIPC's 2026 list (court documents and court orders). Its 2021 list gave liquidations@cipc.co.za for winding up by court order."]), checklist: "published", checklistNote: note },
    [
      slot("cipc_wc_letter", "Covering letter", true, "On the letterhead of the person submitting the order, with their contact details and their CIPC customer code."),
      slot("cipc_wc_order", "Court order", true, "Copy of the court order to commence winding-up proceedings."),
    ],
  ),
  tpl(
    "tpl_cipc_deregister",
    "Deregister a company or close corporation",
    "Request to deregister a dormant company or close corporation with no assets (or too few for liquidation to be reasonable).",
    SOURCES.cipcDocs,
    { ...W, nextSteps: sendTo("deregistrations@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_dr_letter", "Request letter", true, "On the original letterhead of the company or close corporation (or of the person applying). It states that the business is not trading or is dormant and has no assets, or too few for liquidation to be reasonable, and gives the tax number if available. If the company or close corporation applies, every active director or member, or its authorised representative, signs it."),
      slot("cipc_dr_proof", "Proof that it is dormant and has no assets", true, "Sufficient documentary proof of both points in the letter."),
      slot("cipc_dr_sars", "SARS tax clearance or confirmation", true, "A tax clearance certificate, or other written confirmation from the South African Revenue Service that no tax liability is outstanding."),
      slot("cipc_dr_ids", "Certified ID copies of the signatories", true, "A certified ID copy of each person who signs the letter.", undefined, true),
    ],
  ),
  tpl(
    "tpl_cipc_reinstate",
    "Reinstate a deregistered company or close corporation",
    "Application to reinstate a deregistered company or close corporation. CIPC's list asks for a 21-day newspaper notice of the application.",
    SOURCES.cipcDocs,
    { ...W, nextSteps: sendTo("re-instatements@cipc.co.za"), checklist: "published", checklistNote: note },
    [
      slot("cipc_ri_cor405", "Application for reinstatement", true, "Completed application.", "CoR40.5"),
      slot("cipc_ri_id_applicant", "Certified ID copy of the applicant", true, "Certified ID copy of the applicant (a director or member)."),
      slot("cipc_ri_id_filer", "Certified ID copy of the customer filing", true, "Certified ID copy of the customer who files the application."),
      slot("cipc_ri_deed", "Deeds search", true, "A deeds search showing whether or not the company owns immovable property."),
      slot("cipc_ri_treasury", "No-objection letters (immovable property)", false, "Applies if it owns immovable property: letters from National Treasury and the Department of Public Works saying they have no objection.", undefined, true),
      slot("cipc_ri_advert", "Newspaper advertisement", true, "An advertisement in a local newspaper giving 21 days' notice of the proposed application."),
      slot("cipc_ri_affidavit_returns", "Affidavit: why annual returns were not filed", false, "Applies if it was deregistered for not filing annual returns."),
      slot("cipc_ri_affidavit_request", "Affidavit: why deregistration was requested", false, "Applies if the company or close corporation itself applied for deregistration."),
      slot("cipc_ri_trading", "Proof it was trading or had assets or liabilities", true, "Sufficient documentary proof that it was in business, or had outstanding assets or liabilities (such as property or intellectual property rights), when it was deregistered.", undefined, true),
    ],
  ),
];

const rescue = sendTo("businessrescue@cipc.co.za");
const customerCodeId = (p: string) => slot(`${p}_id_code_owner`, "Certified ID copy of the customer code owner", true, "Certified ID copy of the owner of the CIPC customer code.");

const BUSINESS_RESCUE_TEMPLATES: Template[] = [
  tpl(
    "tpl_cipc_rescue_start",
    "Give notice that business rescue proceedings begin",
    "Notice of the start of business rescue proceedings.",
    SOURCES.cipcDocs,
    { ...B, nextSteps: rescue, checklist: "published", checklistNote: note },
    [
      slot("cipc_br_cor1231", "Notice of start of business rescue proceedings", true, "Duly completed, including the customer code and a signature.", "CoR123.1"),
      customerCodeId("cipc_br"),
      slot("cipc_br_sworn", "Sworn statement with the reasons", true, "A sworn statement setting out in detail the reasons for the resolution."),
      slot("cipc_br_pi", "Public interest score breakdown", true, "The PI score breakdown and total."),
      slot("cipc_br_activities", "Primary business activities", true, "An indication of the primary business activities."),
      slot("cipc_br_resolution", "Resolution to start business rescue", true, "The resolution by the company or close corporation to start business rescue."),
      slot("cipc_br_nomination", "Practitioner nomination letter", true, "The company's or close corporation's letter nominating the practitioner."),
      slot("cipc_br_acceptance", "Practitioner's acceptance letter", true, "The practitioner's letter of acceptance."),
    ],
  ),
  tpl(
    "tpl_cipc_rescue_practitioner",
    "Give notice of a business rescue practitioner's appointment",
    "Notice of the appointment of a business rescue practitioner.",
    SOURCES.cipcDocs,
    { ...B, nextSteps: rescue, checklist: "form-only", checklistNote: formOnlyNote },
    [
      slot("cipc_bp_cor1232", "Notice of appointment of a practitioner", true, "Completed notice.", "CoR123.2"),
      slot("cipc_bp_support", "Supporting documents", false, "CIPC's list gives no supporting documents for this notice: confirm with CIPC.", undefined, true),
    ],
  ),
  tpl(
    "tpl_cipc_rescue_end",
    "Give notice that business rescue proceedings have ended",
    "Notice of termination of business rescue proceedings. It is signed by the practitioner.",
    SOURCES.cipcDocs,
    { ...B, nextSteps: rescue, checklist: "published", checklistNote: note },
    [
      slot("cipc_be_cor1252", "Notice of termination of business rescue proceedings", true, "Duly completed, including the customer code and the practitioner's signature.", "CoR125.2"),
      customerCodeId("cipc_be"),
    ],
  ),
  tpl(
    "tpl_cipc_rescue_plan",
    "Give notice that a business rescue plan is substantially implemented",
    "Notice of substantial implementation of a business rescue plan. It is signed by the practitioner.",
    SOURCES.cipcDocs,
    { ...B, nextSteps: rescue, checklist: "published", checklistNote: note },
    [
      slot("cipc_bi_cor1253", "Notice of substantial implementation of the plan", true, "Duly completed, including the customer code and the practitioner's signature.", "CoR125.3"),
      customerCodeId("cipc_bi"),
    ],
  ),
  tpl(
    "tpl_cipc_rescue_licence",
    "Apply for a business rescue practitioner licence",
    "Application to CIPC for a licence as a business rescue practitioner.",
    SOURCES.cipcDocs,
    { ...B, nextSteps: rescue, checklist: "published", checklistNote: note },
    [
      slot("cipc_bl_cor1261", "Application for a practitioner licence", true, "Completed application.", "CoR126.1"),
      slot("cipc_bl_cv", "Resume of education, experience and affiliations", true, "A resume of your relevant education, experience and professional affiliations."),
      slot("cipc_bl_turnaround", "Resume of business turnaround experience", false, "Applies if you have any: a resume of your history and experience in business turnaround practice."),
    ],
  ),
];

export { TRADE_MARKS, PATENTS, DESIGNS, COPYRIGHT } from "./cipc-ip";

export const CIPC_TEMPLATES: Template[] = [
  ...REGISTER_TEMPLATES, ...NAME_TEMPLATES, ...CHANGE_TEMPLATES, ...CLOSE_CORPORATION_TEMPLATES,
  ...CONVERSION_TEMPLATES, ...WINDING_UP_TEMPLATES, ...BUSINESS_RESCUE_TEMPLATES,
  ...CIPC_IP_TEMPLATES,
];
