"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { verifyPayment } from "../actions";

/** Re-checks after 2s, 4s, 6s, 8s — about 20 seconds in total. */
const RETRY_DELAYS_MS = [2000, 4000, 6000, 8000];

type Outcome = "checking" | "paid" | "paid-unrecorded" | "failed" | "unresolved";

/**
 * Shown when a member returns from an off-site payment and the checkout is
 * still PENDING.
 *
 * PENDING is genuinely ambiguous here. A redirect payment method like iDEAL
 * leaves the checkout PENDING both while the bank is still settling *and* when
 * the member pressed "Cancel payment" at their bank — SumUp does not mark a
 * cancelled checkout FAILED, it just stays open until it expires. Reporting
 * that as "your payment is still processing, do not pay again" strands anyone
 * who cancelled on a page that will never resolve.
 *
 * So this polls a few times with the bounded backoff SumUp's 3D Secure guide
 * asks for, and if the status still has not moved, says so plainly and offers a
 * way back instead of telling the member to keep waiting.
 */
export function PendingResult({
  checkoutId,
  memberId,
}: {
  checkoutId: string;
  memberId: string;
}) {
  const [outcome, setOutcome] = useState<Outcome>("checking");
  const [attempt, setAttempt] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    async function poll() {
      for (const [index, delay] of RETRY_DELAYS_MS.entries()) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (cancelled.current) return;

        setAttempt(index + 1);

        const result = await verifyPayment(checkoutId);
        if (cancelled.current) return;

        if (result.paid) {
          // `paid` is also true when SumUp took the money but we could not
          // record it. Never show that member a failure.
          setOutcome(result.message ? "paid-unrecorded" : "paid");
          return;
        }

        if (result.status !== "PENDING" && result.status !== "unknown") {
          setOutcome("failed");
          return;
        }
      }

      if (!cancelled.current) setOutcome("unresolved");
    }

    void poll();

    return () => {
      cancelled.current = true;
    };
  }, [checkoutId]);

  if (outcome === "paid") {
    return (
      <Result
        title="Payment received. Welcome to ELSA Maastricht."
        body="Your membership is now active. A confirmation is on its way to your inbox, and your e-member card will be sent shortly to your inbox too."
      />
    );
  }

  if (outcome === "paid-unrecorded") {
    return (
      <Result
        title="Payment received"
        body="Your payment went through, but we could not update your record automatically. ELSA will contact you so we can fully activate your membership."
      />
    );
  }

  if (outcome === "checking") {
    return (
      <Result
        title="Checking your payment"
        body={
          "We are confirming the result with your bank. This usually takes a " +
          "few seconds — please do not close this page." +
          (attempt > 0 ? ` (attempt ${attempt} of ${RETRY_DELAYS_MS.length})` : "")
        }
      />
    );
  }

  // Either an explicit failure, or still PENDING after the full backoff. Both
  // mean the same thing to the member: nothing has been paid, and the way
  // forward is to start a new payment.
  return (
    <>
      <Result
        title="Your payment was not completed"
        body={
          outcome === "failed"
            ? "Your membership has not been charged. You can try again below."
            : "We did not receive a completed payment — this is what we see if the payment was cancelled at your bank. Nothing has been charged. You can try again below. If you did bank shows that you completed the payment, do not pay twice: contact the ELSA board and we will check it for you."
        }
      />
      <Link
        href={`/checkout?member=${encodeURIComponent(memberId)}`}
        className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-base font-medium text-background transition-colors hover:bg-[#383838]"
      >
        Try again
      </Link>
    </>
  );
}

function Result({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black">
        {title}
      </h1>
      <p className="mx-auto max-w-md text-lg leading-8 text-zinc-600">{body}</p>
    </div>
  );
}
