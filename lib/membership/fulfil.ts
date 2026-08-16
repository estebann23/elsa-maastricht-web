import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";
import { environmentOf, getCheckout, type CheckoutStatus } from "@/lib/sumup/server";

/**
 * The single place where an online payment is allowed to change membership
 * status.
 *
 * Everything here starts from `getCheckout()` — SumUp's own answer to "was this
 * paid?". Nothing the browser sends is trusted: the widget's `success`
 * callback, a visit to the redirect URL, and a webhook body are all treated as
 * nothing more than a hint that it is worth asking SumUp again.
 *
 * Called from the checkout page, from the client-side verification action, and
 * from the webhook, so it must be safe to run repeatedly and concurrently for
 * the same checkout.
 */
export type SyncResult = {
  status: CheckoutStatus | "unknown";
  /** True once the membership is recorded as paid, whenever that happened. */
  confirmed: boolean;
  failureReason?: string;
};

export async function syncCheckoutStatus(
  checkoutId: string,
): Promise<SyncResult> {
  const supabase = createServiceRoleClient();

  // Look the attempt up first. A checkout id we never created is not ours to
  // act on, which is what makes it safe for the browser to name one: the worst
  // an attacker can do is ask us to re-check a checkout we opened ourselves.
  const { data: attempt, error: attemptError } = await supabase
    .from("payment_attempts")
    .select("id, pending_member_id, amount_cents, status")
    .eq("checkout_id", checkoutId)
    .maybeSingle();

  if (attemptError) {
    console.error("Could not load payment attempt:", attemptError);
    return { status: "unknown", confirmed: false };
  }

  if (!attempt) {
    console.warn("Ignoring unknown checkout id:", checkoutId);
    return { status: "unknown", confirmed: false };
  }

  const checkout = await getCheckout(checkoutId);
  const status = checkout.status;

  // A paid checkout for the wrong amount must not confirm a membership. This
  // should be impossible — we set the amount from the stored tier price — but
  // it is cheap to assert and expensive to miss.
  const paidCents = Math.round(checkout.amount * 100);
  const amountMatches = paidCents === attempt.amount_cents;

  if (status === "PAID" && !amountMatches) {
    console.error(
      `Checkout ${checkoutId} paid ${paidCents} cents but expected ` +
        `${attempt.amount_cents}. Not confirming; needs manual review.`,
    );
  }

  const failureReason =
    status === "FAILED" || status === "EXPIRED"
      ? (checkout.transactions?.[0]?.status ?? status)
      : undefined;

  await supabase
    .from("payment_attempts")
    .update({
      status,
      environment: environmentOf(checkout),
      merchant_code: checkout.merchant_code ?? null,
      last_verified_at: new Date().toISOString(),
      failure_reason: failureReason ?? null,
    })
    .eq("id", attempt.id);

  if (status !== "PAID" || !amountMatches || !attempt.pending_member_id) {
    return { status, confirmed: false, failureReason };
  }

  const confirmed = await confirmMembership(attempt.pending_member_id);
  return { status, confirmed };
}

/**
 * Marks the sign-up paid and copies it into `confirmed_members`.
 *
 * Idempotent by construction: `confirmed_members` has a unique index on
 * `pending_member_id`, so a refresh, a retry, or the webhook racing the browser
 * all collide on 23505 and leave the single existing row alone.
 */
async function confirmMembership(pendingMemberId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data: member, error } = await supabase
    .from("pending_members")
    // Kept on one line: supabase-js infers the row type from this string
    // literal, and splitting it across a concatenation erases that.
    .select("id, email, first_name, last_name, study_program, membership, membership_price_cents, payment_method, academic_year")
    .eq("id", pendingMemberId)
    .maybeSingle();

  if (error || !member) {
    console.error("Could not load sign-up to confirm:", error);
    return false;
  }

  const { error: insertError } = await supabase.from("confirmed_members").insert({
    pending_member_id: member.id,
    email: member.email,
    first_name: member.first_name,
    last_name: member.last_name,
    study_program: member.study_program,
    membership: member.membership,
    membership_price_cents: member.membership_price_cents,
    payment_method: member.payment_method,
    academic_year: member.academic_year,
    // There is no team member to name here: SumUp authorised this one.
    authorised_by: "SumUp online payment",
    payment_attested: true,
  });

  // 23505 = unique violation, i.e. already confirmed. That is a success.
  if (insertError && insertError.code !== "23505") {
    console.error("Could not record confirmed member:", insertError);
    return false;
  }

  const { error: statusError } = await supabase
    .from("pending_members")
    .update({ status: "paid" })
    .eq("id", member.id);

  if (statusError) {
    console.error("Could not mark sign-up as paid:", statusError);
  }

  return true;
}
