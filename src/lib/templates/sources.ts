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
  protection: { label: "DOJ&CD: Apply for a Domestic Violence protection order", url: "https://justice.gov.za/services/dv-protection-order.html", retrievedOn: RETRIEVED, pageUpdated: "6 Jul 2011" },
} satisfies Record<string, TemplateSource>;
