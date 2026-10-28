/** What Docubuddy remembers between questions, so "where do I send it?" can mean the service just discussed. */
export interface Focus {
  templateId?: string;
  packId?: string;
}

export type Action =
  /** A page inside Docutile. */
  | { kind: "link"; label: string; href: string }
  /** An official site, opened in a new tab. */
  | { kind: "external"; label: string; href: string }
  /** A follow-up question the user can send with one tap. */
  | { kind: "ask"; label: string; text: string; focus?: Focus };

export interface ListItem {
  text: string;
  /** Small label after the text, such as a form number. */
  badge?: string;
  /** A second line under the text. */
  detail?: string;
}

/** Plain data only: the chat renders these as text, never as HTML, so nothing typed or stored can inject markup. */
export type Block =
  | { type: "heading"; text: string }
  | { type: "text"; text: string; tone?: "normal" | "note" | "warn" }
  | { type: "list"; items: ListItem[]; ordered?: boolean }
  | { type: "actions"; actions: Action[] };

export interface Reply {
  blocks: Block[];
  focus?: Focus;
}
