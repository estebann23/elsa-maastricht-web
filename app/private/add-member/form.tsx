"use client";

import { useActionState } from "react";

import { confirmMember } from "./actions";
import { AUTHORISERS } from "./constants";
import { initialConfirmState, type PendingOption } from "./types";

const labelClass = "text-base font-medium text-zinc-950";

const fieldClass =
  "h-12 w-full rounded-lg border border-solid border-black/[.08] bg-white px-4 text-base text-zinc-950 outline-none transition-colors focus:border-black/[.24]";

const errorClass = "text-sm leading-6 text-red-600";

function fieldClassFor(hasError: boolean) {
  return hasError ? `${fieldClass} border-red-500/60` : fieldClass;
}

export function ConfirmForm({
  options,
  loadError,
}: {
  options: PendingOption[];
  loadError?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    confirmMember,
    initialConfirmState,
  );

  if (loadError) {
    return (
      <p role="alert" className={errorClass}>
        {loadError}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label htmlFor="pendingMemberId" className={labelClass}>
          New Member name
        </label>
        <select
          id="pendingMemberId"
          name="pendingMemberId"
          required
          defaultValue=""
          aria-invalid={Boolean(state.errors.pendingMemberId)}
          className={`${fieldClassFor(Boolean(state.errors.pendingMemberId))} appearance-none`}
        >
          <option value="" disabled>
            {options.length === 0
              ? "No pending sign-ups"
              : "Select an option"}
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {state.errors.pendingMemberId && (
          <p className={errorClass}>{state.errors.pendingMemberId}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="authorisedBy" className={labelClass}>
          Authorised by
        </label>
        <select
          id="authorisedBy"
          name="authorisedBy"
          required
          defaultValue=""
          aria-invalid={Boolean(state.errors.authorisedBy)}
          className={`${fieldClassFor(Boolean(state.errors.authorisedBy))} appearance-none`}
        >
          <option value="" disabled>
            Select an option
          </option>
          {AUTHORISERS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {state.errors.authorisedBy && (
          <p className={errorClass}>{state.errors.authorisedBy}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 text-base leading-7 text-zinc-600">
          <input
            type="checkbox"
            name="paymentAttested"
            required
            className="mt-1.5 h-4 w-4 shrink-0 accent-zinc-950"
          />
          As an ELSA Team Member, I confirm the membership payment has already
          been completed / is being done at the moment.
        </label>
        {state.errors.paymentAttested && (
          <p className={errorClass}>{state.errors.paymentAttested}</p>
        )}
      </div>

      {state.formError && (
        <p role="alert" className={errorClass}>
          {state.formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || options.length === 0}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:self-start sm:px-8"
      >
        {isPending ? "Confirming..." : "Confirm new member"}
      </button>
    </form>
  );
}
