// Kept out of actions.ts: a "use server" module may only export async
// functions, so the initial-state constant lives here.

/** A pending sign-up, reduced to what the picker needs. */
export type PendingOption = {
  id: string;
  name: string;
};

/**
 * There is no success state: a confirmed member is redirected to
 * /private/add-member/confirmed, so the form only ever renders idle or an
 * error it needs the member to fix.
 */
export type ConfirmState = {
  status: "idle" | "error";
  /** Per-field messages, keyed by the form field name. */
  errors: Record<string, string>;
  /** A message about the submission as a whole. */
  formError?: string;
};

export const initialConfirmState: ConfirmState = { status: "idle", errors: {} };
