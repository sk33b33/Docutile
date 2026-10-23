import type { TemplateSource } from "@/types";
import { RETRIEVED } from "./helpers";

const master = "DOJ&CD Master of the High Court";

export const SOURCES = {
  estatesReport: { label: `${master}: How to report a deceased estate`, url: "https://www.justice.gov.za/master/deceased-how.html", retrievedOn: RETRIEVED },
  estatesOverview: { label: `${master}: Deceased estates`, url: "https://www.justice.gov.za/master/deceased.html", retrievedOn: RETRIEVED },
  faq: { label: `${master}: Frequently asked questions`, url: "https://www.justice.gov.za/master/faq.html", retrievedOn: RETRIEVED },
  forms: { label: `${master}: Forms`, url: "https://www.justice.gov.za/master/forms.html", retrievedOn: RETRIEVED },
  trusts: { label: `${master}: Administration of trusts`, url: "https://justice.gov.za/master/trust.html", retrievedOn: RETRIEVED, pageUpdated: "31 Oct 2024" },
  maintenance: { label: "DOJ&CD Maintenance leaflet (2026) and Maintenance FAQ", url: "https://www.justice.gov.za/vg/mnt-FAQ-2026.pdf", retrievedOn: RETRIEVED },
  dvForms: { label: "DOJ&CD Domestic Violence forms (Regulations 2022, published 14 Apr 2023)", url: "https://www.justice.gov.za/forms/form_dva.htm", retrievedOn: RETRIEVED },
  maintenanceForms: { label: "DOJ&CD Maintenance forms", url: "https://www.justice.gov.za/forms/form_mnt.htm", retrievedOn: RETRIEVED },
  durban: { label: "Master of the High Court, Durban: checklist for reporting a deceased estate", url: "https://www.justice.gov.za/master/m_forms/Deceased-Estate-Checklist-DBN-eForm.pdf", retrievedOn: RETRIEVED },
  j401: { label: "DOJ&CD form J401: trust registration and amendments", url: "https://www.justice.gov.za/master/m_forms/J401_trust-registration-amendment-eform.pdf", retrievedOn: RETRIEVED },
} satisfies Record<string, TemplateSource>;
