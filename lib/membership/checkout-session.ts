import "server-only";

import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createCheckout, isSumUpConfigured, SumUpError } from "@/lib/sumup/server";
import { syncCheckoutStatus } from "./fulfil";

export type CheckoutSession =
  | { state: "ready"; checkoutId: string; member: MemberSummary }
  | { state: "paid"; member: MemberSummary }
  | { state: "error"; message: string };

export type MemberSummary = {
  firstName: string;
  email: string;
  membership: string;
  amountCents: number;
};

/**
 * Prepares the Payment Widget for a sign-up: returns the checkout id to mount,
 * or reports that the membership is already paid.
 *
 * The amount is read from the member's stored row and never from the URL, so
 * editing the query string cannot change what someone is charged.
 */
export async function startCheckout(
  memberId: string,
  origin: string,
): Promise<CheckoutSession> {
  if (!isSupabaseConfigured() || !isSumUpConfigured()) {
    return {
      state: "error",
      message: "Online payment is not configured on this deployment.",
    };
  }

  const supabase = createServiceRoleClient();

  const { data: member, error } = await supabase
    .from("pending_members")
    .select("id, email, first_name, membership, membership_price_cents, status")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    console.error("Could not load sign-up for checkout:", error);
    return { state: "error", message: "We could not load your sign-up." };
  }

  if (!member) {
    return {
      state: "error",
      message:
        "We could not find your sign-up. Please fill in the membership form again.",
    };
  }

  const summary: MemberSummary = {
    firstName: member.first_name,
    email: member.email,
    membership: member.membership,
    amountCents: member.membership_price_cents,
  };

  if (member.status === "paid") {
    return { state: "paid", member: summary };
  }

  // Reuse the most recent open checkout instead of creating one per page view.
  // SumUp's guidance for an abandoned payment is to retrieve the existing
  // checkout before deciding a new one is needed, and it keeps a refresh from
  // filling the table with dead attempts.
  const { data: existing } = await supabase
    .from("payment_attempts")
    .select("checkout_id")
    .eq("pending_member_id", member.id)
    .not("checkout_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.checkout_id) {
    try {
      const synced = await syncCheckoutStatus(existing.checkout_id);
      if (synced.status === "PAID" && synced.confirmed) {
        return { state: "paid", member: summary };
      }
      if (synced.status === "PENDING") {
        return { state: "ready", checkoutId: existing.checkout_id, member: summary };
      }
      // FAILED or EXPIRED: fall through and open a fresh checkout, which needs
      // a new reference of its own.
    } catch (cause) {
      // A checkout SumUp no longer knows about should not block a retry.
      console.error("Could not re-check existing checkout:", cause);
    }
  }

  return createFreshCheckout(member.id, summary, origin);
}

async function createFreshCheckout(
  memberId: string,
  summary: MemberSummary,
  origin: string,
): Promise<CheckoutSession> {
  const supabase = createServiceRoleClient();

  // Unique per attempt, as SumUp requires: reusing a reference it has already
  // processed makes it reject the checkout.
  const reference = `ELSA-${memberId.slice(0, 8)}-${Date.now().toString(36)}`;

  // Insert before calling SumUp, so a checkout can never exist at SumUp without
  // a row here to match it against. The reverse order risks a member paying a
  // checkout we have no record of.
  const { data: attempt, error: insertError } = await supabase
    .from("payment_attempts")
    .insert({
      pending_member_id: memberId,
      checkout_reference: reference,
      amount_cents: summary.amountCents,
      currency: "EUR",
      status: "PENDING",
    })
    .select("id")
    .single();

  if (insertError || !attempt) {
    console.error("Could not record payment attempt:", insertError);
    return { state: "error", message: "We could not start the payment." };
  }

  try {
    const checkout = await createCheckout({
      checkoutReference: reference,
      amountCents: summary.amountCents,
      currency: "EUR",
      description: `ELSA Maastricht — ${summary.membership}`,
      // Where the browser returns after an off-site 3D Secure challenge.
      redirectUrl: `${origin}/checkout/complete?member=${memberId}`,
      // The webhook is server-to-server, so SumUp has to be able to reach it.
      // On localhost it cannot, and sending an unreachable URL only invites a
      // validation error — the page verifies on load, which covers dev.
      returnUrl: origin.startsWith("https://")
        ? `${origin}/api/sumup/webhook`
        : undefined,
    });

    await supabase
      .from("payment_attempts")
      .update({
        checkout_id: checkout.id,
        merchant_code: checkout.merchant_code ?? null,
        environment: checkout.merchant_sandbox ? "sandbox" : "live",
      })
      .eq("id", attempt.id);

    // Keep the sign-up honest about how it is being paid, in case the member
    // originally chose in-person and then came here.
    await supabase
      .from("pending_members")
      .update({ payment_method: "online" })
      .eq("id", memberId);

    return { state: "ready", checkoutId: checkout.id, member: summary };
  } catch (cause) {
    const detail =
      cause instanceof SumUpError
        ? `${cause.message}${cause.param ? ` (${cause.param})` : ""}`
        : String(cause);
    console.error("SumUp rejected the checkout:", detail);

    await supabase
      .from("payment_attempts")
      .update({ status: "FAILED", failure_reason: detail })
      .eq("id", attempt.id);

    return {
      state: "error",
      message: "We could not reach the payment provider. Please try again.",
    };
  }
}
