import Link from "next/link";

import { syncCheckoutStatus } from "@/lib/membership/fulfil";
import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { Notice, PageShell } from "../shell";
import { PendingResult } from "./pending";

// Verification happens on every load, so this page must never be cached.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment result — ELSA Maastricht",
};

/**
 * Where SumUp sends the browser back after an off-site 3D Secure challenge.
 *
 * Landing here proves only that the member's browser got this far. The docs are
 * blunt about it: "Reaching the redirect_url ... does not prove that the
 * payment succeeded." So this page ignores everything in the URL except the
 * member id, finds that member's latest checkout, and asks SumUp directly.
 *
 * Re-verifying rather than fulfilling makes a refresh harmless — the result is
 * read again, never applied twice.
 */
export default async function CheckoutComplete({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { member } = await searchParams;

  if (!member || !isSupabaseConfigured()) {
    return (
      <PageShell>
        <Notice
          title="We could not find your payment"
          body="Please start again from the membership form."
        />
      </PageShell>
    );
  }

  const supabase = createServiceRoleClient();
  const { data: attempt } = await supabase
    .from("payment_attempts")
    .select("checkout_id")
    .eq("pending_member_id", member)
    .not("checkout_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attempt?.checkout_id) {
    return (
      <PageShell>
        <Notice
          title="We could not find your payment"
          body="Please start again from the membership form."
        />
      </PageShell>
    );
  }

  let status = "unknown";
  let confirmed = false;

  try {
    const result = await syncCheckoutStatus(attempt.checkout_id);
    status = result.status;
    confirmed = result.confirmed;
  } catch (cause) {
    console.error("Could not verify checkout on return:", cause);
  }

  if (status === "PAID" && confirmed) {
    return (
      <PageShell>
        <Notice
          title="Payment received. Welcome to ELSA Maastricht."
          body="Your membership is now active. A confirmation is on its way to your inbox, and your e-member card will follow shortly."
        />
      </PageShell>
    );
  }

  if (status === "PAID") {
    return (
      <PageShell>
        <Notice
          title="Payment received"
          body="Your payment went through, but we could not update your record automatically. Please contact the ELSA board so we can activate your membership."
        />
      </PageShell>
    );
  }

  // PENDING is ambiguous after a redirect payment method: the bank may still be
  // settling, or the member may have cancelled — SumUp leaves the checkout
  // PENDING either way. Hand it to the client component, which re-checks a few
  // times before deciding, rather than declaring "still processing" here.
  if (status === "PENDING") {
    return (
      <PageShell>
        <PendingResult checkoutId={attempt.checkout_id} memberId={member} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Notice
        title="The payment did not go through"
        body="Your membership has not been charged. You can try again with the same or another card."
      />
      <Link
        href={`/checkout?member=${encodeURIComponent(member)}`}
        className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-base font-medium text-background transition-colors hover:bg-[#383838]"
      >
        Try again
      </Link>
    </PageShell>
  );
}
