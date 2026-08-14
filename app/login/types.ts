// Separate from actions.ts: a "use server" module may only export async
// functions, so the initial-state constant cannot live there.

export type LoginState = {
  error?: string;
};

export const initialLoginState: LoginState = {};
