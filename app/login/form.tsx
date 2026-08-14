"use client";

import { useActionState } from "react";

import { login } from "./actions";
import { initialLoginState } from "./types";

const labelClass = "text-base font-medium text-zinc-950";

const fieldClass =
  "h-12 w-full rounded-lg border border-solid border-black/[.08] bg-white px-4 text-base text-zinc-950 outline-none transition-colors focus:border-black/[.24]";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(
    login,
    initialLoginState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-6">
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-2">
        <label htmlFor="username" className={labelClass}>
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm leading-6 text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
