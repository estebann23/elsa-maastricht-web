/**
 * Team members allowed to authorise an in-person payment confirmation.
 *
 * PLACEHOLDERS — replace with the real board/committee names before this is
 * used for anything real. The server checks submissions against this list, so
 * editing it here is what changes who can be selected.
 */
export const AUTHORISERS = [
  "President",
  "Secretary General",
  "Aylin Karabiyik",
  "Patricie Svobodova",
  "Tutku Kasar",
  "Ioana Preda",
  "Matti Below",
  "Christos Tsalkitzis",
  "IT Team",
  "Directors (Any)",
] as const;

export type Authoriser = (typeof AUTHORISERS)[number];

export function isAuthoriser(value: string): boolean {
  return (AUTHORISERS as readonly string[]).includes(value);
}
