// Kept out of actions.ts: a "use server" module may only export async
// functions, so the initial-state constant lives here.

/** A pending sign-up, reduced to what the picker needs. */
export type PendingOption = {
  id: string;
  name: string;
};

export type ConfirmState = {
  status: "idle" | "success" | "error";
  /** Per-field messages, keyed by the form field name. */
  errors: Record<string, string>;
  /** A message about the submission as a whole. */
  formError?: string;
  /** Name of the member just confirmed, for the success message. */
  confirmedName?: string;
};

export const initialConfirmState: ConfirmState = { status: "idle", errors: {} };
