import { headers } from "next/headers";

import { startCheckout } from "@/lib/membership/checkout-session";
import { formatEuros, Notice, PageShell } from "./shell";
import { PaymentWidget } from "./widget";

// A checkout is created and verified per visit, so nothing here may be cached.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout — ELSA Maastricht",
};

/**
 * Absolute origin of this deployment, for the URLs handed to SumUp.
 *
 * These decide where a member lands after an off-site 3D Secure challenge and
 * where SumUp posts its webhook, so SITE_URL takes precedence when set: it
 * pins both to a known address instead of trusting a request header. Without
 * it we fall back to the host actually being served, which is what keeps
 * Vercel preview deployments self-consistent.
 */
async function currentOrigin(): Promise<string> {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { member } = await searchParams;

  if (!member) {
    return (
      <PageShell>
        <Notice
          title="Nothing to pay for yet"
          body="Start from the membership form so we know who you are."
        />
      </PageShell>
    );
  }

  const session = await startCheckout(member, await currentOrigin());

  if (session.state === "error") {
    return (
      <PageShell>
        <Notice title="We could not open the checkout" body={session.message} />
      </PageShell>
    );
  }

  if (session.state === "paid") {
    return (
      <PageShell>
        <Notice
          title="This membership is already paid."
          body={`Thank you, ${session.member.firstName}. Your ELSA Maastricht membership is active — there is nothing left to pay.`}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black">
          Complete your membership
        </h1>
        <p className="mx-auto max-w-md text-lg leading-8 text-zinc-600">
          Almost there, {session.member.firstName}. Pay securely below to
          activate your membership straight away.
        </p>
      </div>

      <dl className="flex w-full flex-col gap-3 rounded-lg border border-solid border-black/[.08] bg-zinc-50 p-6">
        <div className="flex items-baseline justify-between gap-6">
          <dt className="text-base text-zinc-600">Membership</dt>
          <dd className="text-right text-base font-medium text-zinc-950">
            {session.member.membership}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 border-t border-solid border-black/[.08] pt-3">
          <dt className="text-base text-zinc-600">Total</dt>
          <dd className="text-right text-lg font-semibold text-zinc-950">
            {formatEuros(session.member.amountCents)}
          </dd>
        </div>
      </dl>

      <PaymentWidget
        checkoutId={session.checkoutId}
        email={session.member.email}
        amountCents={session.member.amountCents}
      />
    </PageShell>
  );
}
