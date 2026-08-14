// Single source of truth for the form options, shared by the client form and
// the server action so the two can never drift apart.

export const STUDY_PROGRAMS = [
  "Student at Faculty of Law",
  "Alumni at Faculty of Law",
  "Exchange student",
  "Student at UM, other faculties",
  "Other",
] as const;

export const YES_NO = ["Yes", "No"] as const;

/**
 * Membership tiers and their price in euro cents.
 *
 * Prices live on the server. The form posts only the tier label, and the
 * action looks the price up here — so a member cannot edit the page and pay
 * whatever they like. Checkout must read the price from the stored row, not
 * from anything the browser sent.
 */
export const MEMBERSHIPS = [
  { label: "Full-year Membership (Regular price) - 15€", priceCents: 1500 },
  { label: "Full-year Membership (INKOM price) - 13.50€", priceCents: 1350 },
  { label: "1-semester membership - 9€", priceCents: 900 },
] as const;

export const MEMBERSHIP_LABELS = MEMBERSHIPS.map((m) => m.label);

export function findMembership(label: string) {
  return MEMBERSHIPS.find((m) => m.label === label);
}

/**
 * Which of the two submit buttons was pressed.
 *
 * Both store the sign-up identically; they differ only in what happens next —
 * "online" continues to checkout, "in_person" ends on a confirmation message.
 * Neither marks the membership as paid: that waits on payment confirmation.
 */
export const PAYMENT_METHODS = ["online", "in_person"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export type StudyProgram = (typeof STUDY_PROGRAMS)[number];
export type YesNo = (typeof YES_NO)[number];
export type MembershipLabel = (typeof MEMBERSHIPS)[number]["label"];

// The membership cycle these sign-ups belong to. Bump this for the next year.
export const ACADEMIC_YEAR = "2026/2027";
