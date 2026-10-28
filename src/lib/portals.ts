import { CIPC_CATEGORY } from "./templates/cipc-category";

/**
 * Official online portals for the main categories. These are plain links to the official sites: Docutile never signs
 * anyone in to them, never sees a password and never sends a document to them. Each entry names the official page
 * that lists it (all read 2026-10-28).
 */
export interface Portal {
  id: string;
  /** Matches a template category, so the portal sits under the same heading and colour as its services. */
  category: string;
  name: string;
  url: string;
  /** What it is for, in a sentence, as the official page describes it. */
  what: string;
  /** The official page that lists this portal. */
  listedOn: string;
}

const DOJ_ONLINE = "https://www.justice.gov.za/services/online-services.html";
const MASTER_PORTALS = "https://www.justice.gov.za/master/icms.html";
const CIPC_ENTERPRISE = "https://www.cipc.co.za/?page_id=149";
const CIPC_FILING = "https://www.cipc.co.za/?page_id=14187";
const CIPC_IP = "https://www.cipc.co.za/?page_id=1423";

const dojOnline = (category: string, what: string): Portal => ({
  id: `doj-online-${category}`, category, name: "DOJ Online", url: "https://dojonline.justice.gov.za", what, listedOn: DOJ_ONLINE,
});

export const PORTALS: Portal[] = [
  dojOnline("South African DOJ", "Register a deceased estate, book an appointment and track its status. Sign in or create a profile there."),
  { id: "doj-trust-bor", category: "South African DOJ", name: "Trust Beneficial Ownership Register", url: "https://trustonline.justice.gov.za/Masters", what: "File a trust's beneficial ownership information with the Master of the High Court.", listedOn: DOJ_ONLINE },
  { id: "doj-icms", category: "South African DOJ", name: "Master's ICMS web portal", url: "https://icmsweb.justice.gov.za/mastersinformation", what: "Look up information held by the Masters' offices (from 2008).", listedOn: MASTER_PORTALS },
  dojOnline("Master of the High Court: other services", "Includes the Guardian's Fund online deposit application."),
  { id: "master-icms", category: "Master of the High Court: other services", name: "Master's ICMS web portal", url: "https://icmsweb.justice.gov.za/mastersinformation", what: "Look up information held by the Masters' offices (from 2008).", listedOn: MASTER_PORTALS },
  dojOnline("South African Courts", "Online services for protection orders and maintenance orders."),
  { id: "cipc-bizportal", category: CIPC_CATEGORY, name: "BizPortal", url: "https://www.bizportal.gov.za/", what: "Register a company and other business registrations. Register or log in there.", listedOn: CIPC_ENTERPRISE },
  { id: "cipc-eservices", category: CIPC_CATEGORY, name: "CIPC e-Services", url: "https://eservices.cipc.co.za/", what: "Name reservations, annual returns, director, address and year-end changes, and more, filed online.", listedOn: CIPC_FILING },
  { id: "cipc-iponline", category: CIPC_CATEGORY, name: "CIPC IPOnline", url: "https://iponline.cipc.co.za/Account/Login.aspx", what: "Apply for, renew and search trade marks, patents and designs.", listedOn: CIPC_IP },
  { id: "cipc-enquiries", category: CIPC_CATEGORY, name: "CIPC enquiries", url: "https://enquiries.cipc.co.za/", what: "Log a query with CIPC.", listedOn: CIPC_ENTERPRISE },
];

/** Portals for one category, in the order above. A category with none (such as General business) returns an empty list. */
export const portalsFor = (category: string): Portal[] => PORTALS.filter((p) => p.category === category);

/** The categories that have portals, in the order they first appear. */
export const portalCategories = (): string[] => [...new Set(PORTALS.map((p) => p.category))];
