import { NextResponse } from "next/server";

import { syncCheckoutStatus } from "@/lib/membership/fulfil";

export const dynamic = "force-dynamic";

/**
 * Receives SumUp's `CHECKOUT_STATUS_CHANGED` notification.
 *
 * The payload is only ever a nudge. SumUp's own instruction is that "after
 * receiving a webhook call, your application must always verify if the event
 * really took place, by calling a relevant SumUp's API" — so this handler takes
 * nothing from the body but the checkout id, and `syncCheckoutStatus` goes and
 * asks. That is also what makes the endpoint safe to leave unauthenticated: a
 * forged call can only make us re-read a checkout we created ourselves, and
 * only SumUp's answer can mark anything paid.
 *
 * SumUp retries on any non-2xx (after 1m, 5m, 20m, 2h), so this answers 200 for
 * anything it has finished handling — including ids it does not recognise,
 * which will never become recognisable on a retry.
 */
export async function POST(request: Request) {
  let payload: { event_type?: string; id?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const checkoutId = payload?.id;

  if (typeof checkoutId !== "string" || checkoutId.length === 0) {
    console.warn("SumUp webhook without a checkout id:", payload);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    const result = await syncCheckoutStatus(checkoutId);
    console.log(
      `SumUp webhook: checkout ${checkoutId} is ${result.status}` +
        (result.confirmed ? " (membership confirmed)" : ""),
    );
  } catch (cause) {
    // A 5xx here buys a retry from SumUp, which is what we want if their API
    // was briefly unreachable.
    console.error("Could not process SumUp webhook:", cause);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
