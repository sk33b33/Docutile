import type { Template } from "@/types";
import { CIPC_CATEGORY } from "./cipc-category";
import { slot, tpl } from "./helpers";
import { SOURCES } from "./sources";

/**
 * CIPC's intellectual property services: trade marks, patents, designs and copyright (read 2026-10-27).
 * CIPC's registration pages publish no document lists. Where a service has one, it comes from CIPC's own
 * "maintain" pages (assignments, licensees, restoration, amendments); for the four application forms (TM1, P1, D1,
 * RF1) it comes from the list printed on the form itself of what the application is accompanied by. Those lists
 * are tick-lists: CIPC does not say which items every application needs, so only the core item is marked required.
 */
export const TRADE_MARKS = "Trade marks";
export const PATENTS = "Patents";
export const DESIGNS = "Designs";
export const COPYRIGHT = "Copyright";

const TM = { category: CIPC_CATEGORY, subcategory: TRADE_MARKS } as const;
const PT = { category: CIPC_CATEGORY, subcategory: PATENTS } as const;
const DS = { category: CIPC_CATEGORY, subcategory: DESIGNS } as const;
const CR = { category: CIPC_CATEGORY, subcategory: COPYRIGHT } as const;

const tickListNote = "The application form lists what it may be accompanied by, as a tick-list. CIPC does not say which items every application needs, so only the core item is marked required: tick the ones that apply to you and change the rest in the pack builder. Fees are on CIPC's Forms and Fees pages.";
const publishedNote = "From CIPC's own page on this process. Fees change: they are on CIPC's Forms and Fees pages.";
const formOnlyNote = "CIPC's forms page names the form but lists no supporting documents: confirm with CIPC what to attach.";

const onlineFiling = "Most IP filings can be made online on CIPC's IPOnline (iponline.cipc.co.za), after registering as a CIPC customer and depositing funds.";
const paperAddress = "Lodge a paper form at CIPC (the dtic Campus, 77 Meintjies Street, Sunnyside, Pretoria): by post, by courier or in the drop box outside the office.";
const customerCode = "Write your CIPC customer code on the form.";

const poa = (p: string, description: string, required = false) => slot(`${p}_poa`, "Power of attorney", required, description);
const affidavit = (p: string, description: string) => slot(`${p}_affidavit`, "Affidavit giving the reasons", true, description);

/** A request that is one official form, with the supporting documents CIPC does not list as an optional tile. */
function formOnly(id: string, name: string, description: string, base: { category: string; subcategory: string }, source: Template["source"], form: string, ref: string, steps: string[]) {
  return tpl(`tpl_cipc_${id}`, name, description, source!, { ...base, nextSteps: steps, checklist: "form-only", checklistNote: formOnlyNote }, [
    slot(`cipc_${id}_form`, name, true, `${form}.`, ref),
    slot(`cipc_${id}_support`, "Supporting documents", false, "CIPC's forms page lists none for this request: confirm with CIPC what to attach.", undefined, true),
  ]);
}

const TRADE_MARK_TEMPLATES: Template[] = [
  tpl(
    "tpl_cipc_tm_register",
    "Register a trade mark",
    "Application to register a brand name, slogan, logo or shape. One TM1 covers goods or services in one class. A registered trade mark lasts 10 years and is renewed for further 10-year periods.",
    SOURCES.cipcTmRegister,
    {
      ...TM,
      nextSteps: [
        "Register as a CIPC customer, deposit funds, search the trade mark register, then apply. CIPC's checklist gives these as steps 1 to 4.",
        onlineFiling,
        "Choose the class for your goods or services from CIPC's class headings (the Nice classification). Each TM1 covers one class.",
      ],
      checklist: "partial",
      checklistNote: "CIPC's registration page lists steps but no documents. These tiles come from the TM1 form itself: the mark's representation goes in the form, and the form has a field for an agent's general power of attorney (GPA) number. Fees are on CIPC's Forms and Fees pages.",
    },
    [
      slot("cipc_tmr_tm1", "Application for registration of a trade mark", true, "Completed application. It covers an ordinary mark, a certification mark, a collective mark or an honest concurrent user, for goods or services in one class.", "TM1"),
      slot("cipc_tmr_representation", "Representation of the trade mark", false, "If the mark is a word, letter, numeral or combination, it is typed in the form. If it is in a special form, a good copy goes in the form (at most 8.5 cm by 10 cm): keep a scan here."),
      poa("cipc_tmr", "Applies if an agent files for you: a power of attorney, or the agent's general power of attorney (GPA) number on the form."),
    ],
  ),
  tpl(
    "tpl_cipc_tm_renew",
    "Renew a trade mark",
    "Renewal of a registered trade mark, due every 10 years from the date of application. The proprietor must make sure the registration does not expire.",
    SOURCES.cipcTmMaintain,
    {
      ...TM,
      nextSteps: [
        "A renewal reminder goes to the e-mail address on the customer profile used at registration, but the duty to renew stays with the proprietor.",
        "Renew electronically on IPOnline, or lodge the original TM5, one for each trade mark, by post, courier or the drop box outside CIPC's office at the dtic Campus, 77 Meintjies Street, Sunnyside, Pretoria.",
        "A renewal lodged more than 6 months after the expiry date carries a further penalty fee. A mark removed for non-payment can be restored (see that service).",
      ],
      checklist: "published",
      checklistNote: publishedNote,
    },
    [slot("cipc_tmn_tm5", "Renewal of registration", true, "One form for each trade mark to be renewed, lodged on or before the expiry date.", "TM5")],
  ),
  tpl(
    "tpl_cipc_tm_assign",
    "Record the assignment of a trade mark",
    "Recording that a trade mark has been sold to a new owner. The assignment should be lodged within 12 months of the date it takes effect.",
    SOURCES.cipcTmMaintain,
    {
      ...TM,
      nextSteps: [
        "Lodge within 12 months of the effective date stated in the deed of assignment. After that, a penalty fee applies for every 12 months or part of 12 months.",
        "A certificate of assignment in the new owner's name costs an extra fee. Without it, CIPC sends only a notification that the assignment was recorded.",
        onlineFiling,
      ],
      checklist: "published",
      checklistNote: publishedNote,
    },
    [
      slot("cipc_tma_tm6", "Application to record a transaction affecting the rights in a trade mark", true, "Completed form requesting that the assignment be recorded.", "TM6"),
      slot("cipc_tma_deed", "Deed of assignment", true, "The document between the previous holder (assignor) and the new holder (assignee) that shows the assignment."),
      poa("cipc_tma", "A power of attorney in the name of the assignee.", true),
    ],
  ),
  tpl(
    "tpl_cipc_tm_user",
    "Record a registered user (licensee) of a trade mark",
    "Recording the person the trade mark owner allows to use the mark. The same form is used to vary, cancel or maintain a registered user entry.",
    SOURCES.cipcTmMaintain,
    { ...TM, nextSteps: [onlineFiling, "A registered user certificate costs an extra fee if you need one."], checklist: "published", checklistNote: publishedNote },
    [
      slot("cipc_tmu_tm7", "Application for a registered user", true, "Completed and signed by both parties: the licensor (the trade mark holder) and the licensee.", "TM7"),
      slot("cipc_tmu_licence", "Licence agreement", true, "The licence agreement between licensor and licensee, signed by all parties."),
      poa("cipc_tmu", "Applies if an attorney applies on behalf of the licensor."),
    ],
  ),
  tpl(
    "tpl_cipc_tm_address",
    "Change a trade mark's address for service",
    "Request to change the address for service on a trade mark application or registration.",
    SOURCES.cipcTmMaintain,
    { ...TM, nextSteps: [onlineFiling, paperAddress], checklist: "published", checklistNote: publishedNote },
    [
      slot("cipc_tms_tm2", "Application or request to the Registrar", true, "Completed request for the change.", "TM2"),
      poa("cipc_tms", "A power of attorney, or a general power of attorney (GPA). If you already have a GPA, you can give its number on the form instead.", true),
    ],
  ),
  tpl(
    "tpl_cipc_tm_name",
    "Change the name of a trade mark applicant or proprietor",
    "Request to enter a change of name or description of the applicant, registered proprietor or registered user.",
    SOURCES.cipcTmMaintain,
    { ...TM, nextSteps: [onlineFiling, paperAddress], checklist: "published", checklistNote: publishedNote },
    [
      slot("cipc_tmc_tm2", "Application or request to the Registrar", true, "Completed request for the change.", "TM2"),
      slot("cipc_tmc_certificate", "Certificate of change of name", false, "Applies where the applicant is a company: a copy of the certificate of change of name from the Commissioner of Companies."),
    ],
  ),
  tpl(
    "tpl_cipc_tm_alter",
    "Alter a registered trade mark",
    "Request to change a registered mark. The change may not substantially alter the identity of the mark as registered. The request is advertised in the Patent Journal before it is recorded.",
    SOURCES.cipcTmMaintain,
    { ...TM, nextSteps: [onlineFiling, "The Registrar directs that the request is advertised in the Patent Journal so that interested people can object before it is recorded."], checklist: "published", checklistNote: publishedNote },
    [
      slot("cipc_tml_tm2", "Application or request to the Registrar", true, "Completed request for the amendment of the mark (section 25).", "TM2"),
      slot("cipc_tml_copies", "Two copies of the altered mark", true, "Two copies of the mark as it will appear once altered.", undefined, true),
    ],
  ),
  tpl(
    "tpl_cipc_tm_restore",
    "Restore a trade mark removed for non-payment of renewal",
    "Request to put back on the register a trade mark that was removed because the renewal fee was not paid in time.",
    SOURCES.cipcTmMaintain,
    {
      ...TM,
      nextSteps: [
        "Lodge the original TM2 by post, courier or the drop box outside CIPC's office at the dtic Campus, 77 Meintjies Street, Sunnyside, Pretoria, or file electronically.",
        "If the search shows no identical or confusingly similar mark was lodged in the meantime, the TM5 is completed and lodged with the restoration fee.",
        "CIPC sends an automated e-mail when the application is processed and publishes a notice in the Patent Journal. Restoration is final only if nobody opposes within three months of that notice.",
      ],
      checklist: "published",
      checklistNote: publishedNote,
    },
    [
      slot("cipc_tmx_tm2", "Application or request to the Registrar", true, "The original, with payment of the search fee.", "TM2"),
      slot("cipc_tmx_tm5", "Renewal of registration", true, "Completed and lodged with the restoration fee, once the search shows no conflicting mark.", "TM5"),
      affidavit("cipc_tmx", "An affidavit from the proprietor saying why the renewal fee was not paid in time."),
    ],
  ),
  formOnly("tm_oppose", "Oppose or seek rectification of a trade mark", "Notice of opposition or rectification (sections 21, 24, 26 and 27, regulation 19). A person interested in opposing may ask the Registrar not to issue the registration certificate within three months of the advertisement in the Patent Journal.", TM, SOURCES.cipcTmForms, "TM3", "TM3", [onlineFiling, "Read regulation 19 of the Trade Marks Regulations before you start an opposition."]),
  formOnly("tm_defend", "Give notice of intention to defend a trade mark", "Notice of intention to defend an opposition or rectification (sections 21, 24, 26 and 27, regulation 19).", TM, SOURCES.cipcTmForms, "TM4", "TM4", [onlineFiling, "Proceedings before the Registrar are essentially the same as application proceedings in the High Court. Where a matter cannot be decided on affidavit, the Registrar may refer it to the High Court."]),
  formOnly("tm_caveat", "Ask for information on proceedings about a trade mark (caveat)", "A caveat asks the Registrar for information on proceedings about a specific trade mark application. Any person may apply.", TM, SOURCES.cipcTmForms, "TM2 (caveat)", "TM2", [
    "On the TM2, the fields for the mark's number, class and details (21, 51 and 54 on CIPC's sample) are about the trade mark you are asking about. All other fields are about you.",
    "The Registrar can tell you about the mark's publication and acceptance, its registration, and any entry made against it in the register (such as assignments and amendments).",
  ]),
];

const PATENT_TEMPLATES: Template[] = [
  tpl(
    "tpl_cipc_patent_apply",
    "Apply for a patent",
    "Application for a patent for a new invention that involves an inventive step and can be used in trade, industry or agriculture. A patent lasts up to 20 years and is renewed every year from the end of the third year.",
    SOURCES.cipcP1,
    {
      ...PT,
      nextSteps: [
        "Register as a CIPC customer, deposit funds, search patents online, then apply. CIPC's checklist gives these as steps 1 to 4.",
        onlineFiling,
        "Some things cannot be patented as such, including computer programmes, artistic works, mathematical methods, games, business methods and methods of treating humans and animals. A computer programme can be patentable as part of a technical solution.",
      ],
      checklist: "partial",
      checklistNote: tickListNote,
    },
    [
      slot("cipc_pa_p1", "Application for a patent", true, "Completed application, filed in duplicate.", "P1"),
      slot("cipc_pa_spec", "Specification", true, "A single copy of a provisional specification, or two copies of a complete specification.", undefined, true),
      slot("cipc_pa_drawings", "Drawings", false, "Drawings, if the invention has any.", undefined, true),
      slot("cipc_pa_p8", "Publication particulars and abstract", false, "Form P8 in duplicate, with a copy of the figure of the drawings for the abstract (if any).", "P8"),
      slot("cipc_pa_p3", "Declaration and power of attorney", false, "Listed on the P1 as accompanying the application.", "P3"),
      slot("cipc_pa_p2", "Particulars for claiming priority", false, "Applies if the applicant claims priority: set out on form P2.", "P2"),
      slot("cipc_pa_priority", "Certified priority documents", false, "Applies if priority is claimed: the certified priority document(s), with a translation if needed.", undefined, true),
      slot("cipc_pa_assignment", "Assignment of invention or of priority rights", false, "Applies if the applicant is not the inventor, or priority rights were assigned.", undefined, true),
      slot("cipc_pa_p4", "Request for ante-dating", false, "Applies if you ask for the application to be ante-dated.", "P4"),
      slot("cipc_pa_p9", "Request for classification", false, "Listed on the P1 as accompanying the application.", "P9"),
    ],
  ),
  tpl(
    "tpl_cipc_patent_pct",
    "Enter a PCT application into the South African national phase",
    "Entry of an international application under the Patent Cooperation Treaty, which designates South Africa, into the South African national phase.",
    SOURCES.cipcP25,
    { ...PT, nextSteps: [onlineFiling, "The P25 says whether the international application was filed or published in English. If it was not, a translation of it goes with the form."], checklist: "partial", checklistNote: `${tickListNote} CIPC's forms page also lists a PCT fee calculation sheet and form P26 (a statement on the use of indigenous biological or genetic resources or traditional knowledge).` },
    [
      slot("cipc_pc_p25", "Entry into the South African national phase", true, "Completed form, filed in duplicate.", "P25"),
      slot("cipc_pc_translation", "Translation of the international application", false, "Listed on the P25. The form also says whether the application was filed or published in English.", undefined, true),
      slot("cipc_pc_priority", "Certified priority documents", false, "Applies if priority was claimed: the certified priority document(s).", undefined, true),
      slot("cipc_pc_priority_tr", "Translations of the priority documents", false, "Applies if a priority document is not in English.", undefined, true),
      slot("cipc_pc_p2", "Particulars for the register", false, "A copy of form P2 (particulars for the register).", "P2"),
      slot("cipc_pc_p3", "Declaration and power of attorney", false, "Listed on the P25 as accompanying the application.", "P3"),
      slot("cipc_pc_fee", "PCT fee calculation sheet", false, "CIPC's forms page offers a sheet for calculating the fee."),
      slot("cipc_pc_p26", "Statement on indigenous biological or genetic resources", false, "Applies if the invention uses indigenous biological resources, genetic resources or traditional knowledge.", "P26"),
    ],
  ),
  tpl(
    "tpl_cipc_patent_renew",
    "Renew a patent",
    "Annual renewal of a patent, due on or before the end of the third year from the filing date and every year after, up to 20 years.",
    SOURCES.cipcPatentMaintain,
    {
      ...PT,
      nextSteps: [
        customerCode,
        "If your name or address changed, tell CIPC in writing before you renew.",
        "Within 6 months after the due date you can still renew by paying a fine as well. After that, the patent lapses and has to be restored.",
      ],
      checklist: "published",
      checklistNote: publishedNote,
    },
    [slot("cipc_pr_p10", "Payment and certificate of renewal", true, "Write your CIPC customer code on the form.", "P10")],
  ),
  tpl(
    "tpl_cipc_patent_restore",
    "Restore a lapsed patent",
    "Request to restore a patent that lapsed because the renewal fee was more than 6 months late. The decision is discretionary.",
    SOURCES.cipcPatentMaintain,
    { ...PT, nextSteps: [customerCode, "Restoration is at CIPC's discretion. The page says a restoration fee is payable with the request."], checklist: "published", checklistNote: "From CIPC's page on maintaining a patent. It names the request (section 47(1), regulation 49) but not the form number: confirm the form with CIPC. Fees change: they are on CIPC's Forms and Fees pages." },
    [
      slot("cipc_prs_request", "Request for restoration", true, "A request for restoration in terms of section 47(1) (regulation 49). Write your CIPC customer code on it."),
      affidavit("cipc_prs", "An affidavit stating the reasons for the delay."),
    ],
  ),
];

const DESIGN_TEMPLATES: Template[] = [
  tpl(
    "tpl_cipc_design_apply",
    "Register a design",
    "Application to register an aesthetic design (shape, pattern or ornamentation that appeals to the eye, protected for 15 years) or a functional design (shape necessitated by its function, 10 years). It must be new and capable of being made by an industrial process.",
    SOURCES.cipcD1,
    {
      ...DS,
      nextSteps: [
        "Register as a CIPC customer, deposit funds, search designs, then apply. CIPC's checklist gives these as steps 1 to 4.",
        onlineFiling,
        "A registered design is renewed every year, starting at the end of the third year from the date of filing.",
      ],
      checklist: "partial",
      checklistNote: tickListNote,
    },
    [
      slot("cipc_da_d1", "Design application and acknowledgement", true, "Completed application, lodged in duplicate.", "D1"),
      slot("cipc_da_representations", "Representations of the design", true, "The sheets of representations the application is accompanied by, with their copies.", undefined, true),
      slot("cipc_da_d2", "Register sheet", false, "Listed on the D1: the register sheet in duplicate.", "D2"),
      slot("cipc_da_d3", "Declaration and power of attorney", false, "Listed on the D1 as accompanying the application.", "D3"),
      slot("cipc_da_d8", "Publication particulars", false, "Form D8 in duplicate, with a drawing for publication.", "D8", true),
      slot("cipc_da_d9", "Request for classification", false, "Form D9 in duplicate.", "D9"),
      slot("cipc_da_statement", "Definitive statement and explanatory statement", false, "Listed on the D1 as accompanying the application.", "D6"),
      slot("cipc_da_priority", "Priority documents", false, "Applies if priority is claimed: the certified priority document(s), a translation of them, and an assignment of priority rights if any.", undefined, true),
    ],
  ),
  formOnly("design_renew", "Renew a design", "Payment and certificate of renewal of a registered design, including a request for extension. Renewal is annual, starting at the end of the third year from the filing date.", DS, SOURCES.cipcDesignForms, "D10", "D10", [onlineFiling, "An aesthetic design is valid for one period of 15 years and a functional design for one period of 10 years, subject to annual renewal fees."]),
  tpl(
    "tpl_cipc_design_details",
    "Change a design applicant's name or address for service",
    "Request to change the name of the applicant or the address for service on a design application or registration.",
    SOURCES.cipcDesignMaintain,
    {
      ...DS,
      nextSteps: [customerCode, "No evidence of the change has to be submitted with the request."],
      checklist: "published",
      checklistNote: publishedNote,
    },
    [
      slot("cipc_dd_d4", "Application or request to the Registrar", true, "State the new name, or the new address for service. Write your CIPC customer code on the form.", "D4"),
      poa("cipc_dd", "Applies if an agent represents you: the power of attorney, needed to record a new address for service."),
    ],
  ),
  tpl(
    "tpl_cipc_design_assign",
    "Record the assignment of a design",
    "Recording that a design has been assigned to another party. It must be recorded to be valid with respect to third parties.",
    SOURCES.cipcDesignMaintain,
    {
      ...DS,
      nextSteps: [
        customerCode,
        "The assignment document must show the exact name of the current owner, the name of the new owner, the date the assignment was executed, the design number(s) it relates to, and the signature of every assignor.",
      ],
      checklist: "published",
      checklistNote: publishedNote,
    },
    [
      slot("cipc_ds_d7", "Application to record a transaction affecting the rights in a design", true, "Request for the assignment to be recorded. Write your CIPC customer code on the form.", "D7"),
      slot("cipc_ds_document", "Assignment document", true, "A deed of assignment, merger document, sale agreement or any other document that satisfies CIPC, showing the assignment.", undefined, true),
    ],
  ),
  tpl(
    "tpl_cipc_design_restore",
    "Restore a lapsed design",
    "Request to restore a design that lapsed because the renewal fee was more than 6 months late. The decision is discretionary.",
    SOURCES.cipcDesignMaintain,
    {
      ...DS,
      nextSteps: [
        customerCode,
        "If restoration is allowed, CIPC publishes the request in the Patent Journal. If nobody opposes within 2 months of publication, CIPC restores the design once the outstanding renewal fees are paid. CIPC calculates those fees and notifies you.",
      ],
      checklist: "published",
      checklistNote: publishedNote,
    },
    [
      slot("cipc_dr_d18", "Request for restoration", true, "Completed request (section 23(1), regulation 35(1)). Write your CIPC customer code on the form.", "D18"),
      affidavit("cipc_dr", "An affidavit stating the reasons for the delay."),
    ],
  ),
];

const COPYRIGHT_TEMPLATES: Template[] = [
  tpl(
    "tpl_cipc_copyright_film",
    "Register copyright in a cinematograph film",
    "Only cinematograph films can be registered with CIPC. Other works, such as books, music, art and computer programs, are protected automatically when they are created.",
    SOURCES.cipcRF1,
    {
      ...CR,
      nextSteps: [
        "Register as a CIPC customer, deposit funds, then apply for copyright. CIPC's checklist gives these as steps 1 to 3.",
        "CIPC lists copyright protection for 50 years for films, counted from the date the film was shown.",
      ],
      checklist: "partial",
      checklistNote: tickListNote,
    },
    [
      slot("cipc_cf_rf1", "Application and acknowledgement of receipt", true, "Completed application for registration of copyright in a cinematograph film.", "RF1"),
      slot("cipc_cf_rf2", "Register of copyright in cinematograph films", true, "Form RF2, in duplicate.", "RF2"),
      slot("cipc_cf_case", "Statement of case with sworn declaration", true, "The statement of case, verified by a sworn declaration on form RF9.", "RF9"),
      slot("cipc_cf_rf3", "Publication particulars and abstract", true, "Form RF3, in duplicate.", "RF3"),
      slot("cipc_cf_title", "Proof of title or authority to apply", false, "Applies if the applicant is not the author: documentary proof of title, or of authority to apply."),
      poa("cipc_cf", "Listed on the RF1 as accompanying the application. Normally needed when an agent files for you: confirm with CIPC."),
    ],
  ),
];

export const CIPC_IP_TEMPLATES: Template[] = [...TRADE_MARK_TEMPLATES, ...PATENT_TEMPLATES, ...DESIGN_TEMPLATES, ...COPYRIGHT_TEMPLATES];
