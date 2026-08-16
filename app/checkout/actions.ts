"use server";

import { syncCheckoutStatus } from "@/lib/membership/fulfil";

export type VerifyResult = {
  paid: boolean;
  status: string;
  message?: string;
};

/**
 * Asks the server to re-check a checkout with SumUp.
 *
 * The Payment Widget calls this from the browser after it thinks the payment
 * went through, but its own docs are explicit that a `success` callback "does
 * not always mean the transaction was successful". So the callback is treated
 * purely as a prompt to go and ask SumUp; the answer decides everything.
 *
 * Passing a checkout id from the browser is safe because `syncCheckoutStatus`
 * only acts on ids that exist in our own `payment_attempts` table, and only
 * confirms a membership when SumUp reports PAID for the expected amount.
 */
export async function verifyPayment(checkoutId: string): Promise<VerifyResult> {
  if (typeof checkoutId !== "string" || checkoutId.length === 0) {
    return { paid: false, status: "unknown", message: "Missing checkout." };
  }

  try {
    const result = await syncCheckoutStatus(checkoutId);

    if (result.status === "PAID" && result.confirmed) {
      return { paid: true, status: result.status };
    }

    if (result.status === "PAID") {
      // Paid at SumUp but we could not record it. Never tell the member the
      // payment failed — their money moved. Flag it for the team instead.
      return {
        paid: true,
        status: result.status,
        message:
          "Your payment went through, but we could not update your record " +
          "automatically. Please contact the ELSA board so we can activate " +
          "your membership.",
      };
    }

    if (result.status === "PENDING") {
      return {
        paid: false,
        status: result.status,
        message:
          "Your payment is still being processed. Refresh this page in a " +
          "moment to see the result.",
      };
    }

    return {
      paid: false,
      status: result.status,
      message: "The payment did not go through. You can try again below.",
    };
  } catch (cause) {
    console.error("Could not verify checkout:", cause);
    return {
      paid: false,
      status: "unknown",
      message: "We could not confirm the payment. Please try again.",
    };
  }
}
