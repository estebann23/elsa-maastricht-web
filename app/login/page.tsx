import Image from "next/image";

import { safeNextPath } from "@/lib/auth";
import { LoginForm } from "./form";

export const metadata = {
  title: "Sign in — ELSA Maastricht",
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans">
      <div className="flex w-full max-w-md flex-col gap-8 rounded-lg border border-solid border-black/[.08] bg-white p-10">
        <div className="flex flex-col gap-3">
          <Image
            src="/elsa-logo.jpg"
            alt="ELSA Maastricht logo"
            width={447}
            height={447}
            priority
            className="h-24 w-24 self-center rounded-lg"
          />
          <h1 className="text-2xl font-semibold leading-8 tracking-tight text-black">
            ELSA Maastricht team login
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            This area is for the ELSA team. Please sign in to continue.
          </p>
        </div>

        {error === "unconfigured" && (
          <p role="alert" className="text-sm leading-6 text-red-600">
            Login is not configured on this deployment. Set ADMIN_PASSWORD and
            ADMIN_SESSION_SECRET, then try again.
          </p>
        )}

        <LoginForm next={safeNextPath(next)} />
      </div>
    </div>
  );
}
