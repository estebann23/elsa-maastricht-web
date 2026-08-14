// Kept out of actions.ts on purpose: a "use server" module may only export
// async functions, so the initial-state constant has to live somewhere else.

/** What the member typed, echoed back so a rejected form is not wiped. */
export type SignUpValues = {
  email: string;
  firstName: string;
  lastName: string;
  studyProgram: string;
  dataConsent: string;
  newsletter: string;
  membership: string;
};

export type SignUpState = {
  status: "idle" | "success" | "error";
  /** Per-field messages, keyed by the form field name. */
  errors: Record<string, string>;
  /** A message about the submission as a whole (e.g. the database was down). */
  formError?: string;
  /** Row id of the stored sign-up, used later to resume at checkout. */
  pendingMemberId?: string;
  values?: SignUpValues;
  /**
   * Which button produced this state. Only ever "in_person" on success — the
   * "online" path redirects to checkout instead of rendering a success screen.
   */
  paymentMethod?: "online" | "in_person";
};

export const initialSignUpState: SignUpState = { status: "idle", errors: {} };
