import type { TemplateSource } from "@/types";
import { RETRIEVED } from "./helpers";

/** Date the CIPC pages and PDFs were read. */
const CIPC_RETRIEVED = "2026-10-27";

const master = "DOJ&CD Master of the High Court";

export const SOURCES = {
  estatesReport: { label: `${master}: How to report a deceased estate`, url: "https://www.justice.gov.za/master/deceased-how.html", retrievedOn: RETRIEVED },
  estatesOverview: { label: `${master}: Deceased estates`, url: "https://www.justice.gov.za/master/deceased.html", retrievedOn: RETRIEVED },
  faq: { label: `${master}: Frequently asked questions`, url: "https://www.justice.gov.za/master/faq.html", retrievedOn: RETRIEVED },
  forms: { label: `${master}: Forms`, url: "https://www.justice.gov.za/master/forms.html", retrievedOn: RETRIEVED },
  guardians: { label: `${master}: Guardians and the Guardian's Fund (FAQ)`, url: "https://www.justice.gov.za/master/guardian.html", retrievedOn: RETRIEVED },
  gfAllowance: { label: "DOJ&CD: Applications for maintenance / allowance from the Guardian's Fund (requirements)", url: "https://www.justice.gov.za/master/m_forms/GF_AllowanceReq.pdf", retrievedOn: RETRIEVED },
  trusts: { label: `${master}: Administration of trusts`, url: "https://justice.gov.za/master/trust.html", retrievedOn: RETRIEVED, pageUpdated: "31 Oct 2024" },
  maintenance: { label: "DOJ&CD Maintenance leaflet (2026) and Maintenance FAQ", url: "https://www.justice.gov.za/vg/mnt-FAQ-2026.pdf", retrievedOn: RETRIEVED },
  dvForms: { label: "DOJ&CD Domestic Violence forms (Regulations 2022, published 14 Apr 2023)", url: "https://www.justice.gov.za/forms/form_dva.htm", retrievedOn: RETRIEVED },
  maintenanceForms: { label: "DOJ&CD Maintenance forms", url: "https://www.justice.gov.za/forms/form_mnt.htm", retrievedOn: RETRIEVED },
  durban: { label: "Master of the High Court, Durban: checklist for reporting a deceased estate", url: "https://www.justice.gov.za/master/m_forms/Deceased-Estate-Checklist-DBN-eForm.pdf", retrievedOn: RETRIEVED },
  j401: { label: "DOJ&CD form J401: trust registration and amendments", url: "https://www.justice.gov.za/master/m_forms/J401_trust-registration-amendment-eform.pdf", retrievedOn: RETRIEVED },
  cipcDocs: { label: "CIPC: contact details, forms and supporting documents required when transacting with CIPC (2021 edition)", url: "https://www.cipc.co.za/wp-content/uploads/2024/02/Email-addresses-for-applications-and-supporting-docs-required-v5-2021.pdf", retrievedOn: CIPC_RETRIEVED },
  cipcCompanyForms: { label: "CIPC: company forms and fees", url: "https://www.cipc.co.za/?page_id=3804", retrievedOn: CIPC_RETRIEVED },
  cipcCloseCorpForms: { label: "CIPC: close corporation forms and fees", url: "https://www.cipc.co.za/?page_id=4068", retrievedOn: CIPC_RETRIEVED },
  cipcEmails: { label: "CIPC: e-mail addresses for submitting documents (2026)", url: "https://www.cipc.co.za/wp-content/uploads/2026/03/Email-addresses-for-applications-v2.0.pdf", retrievedOn: CIPC_RETRIEVED },
} satisfies Record<string, TemplateSource>;
