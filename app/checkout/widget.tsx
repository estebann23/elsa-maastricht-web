"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { verifyPayment } from "./actions";

const SDK_URL = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js";

type MountedCard = {
  submit: () => void;
  unmount: () => void;
  update: (config: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    SumUpCard?: {
      mount: (config: Record<string, unknown>) => MountedCard;
    };
  }
}

type Phase =
  | "loading"
  | "ready"
  | "authenticating"
  | "verifying"
  | "paid"
  | "failed";

export function PaymentWidget({
  checkoutId,
  email,
  amountCents,
}: {
  checkoutId: string;
  email: string;
  amountCents: number;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string>();
  const cardRef = useRef<MountedCard | null>(null);

  // Mounting twice would render two payment forms, which React's development
  // double-invoke makes easy to do by accident.
  const mountedFor = useRef<string | null>(null);

  function mountCard() {
    if (!window.SumUpCard || mountedFor.current === checkoutId) return;
    mountedFor.current = checkoutId;

    cardRef.current = window.SumUpCard.mount({
      id: "sumup-card",
      checkoutId,
      email,
      locale: "en-GB",
      country: "NL",
      currency: "EUR",
      amount: (amountCents / 100).toFixed(2),
      showFooter: true,
      onLoad: () => setPhase("ready"),
      onResponse: (type: string, body: unknown) => {
        void handleResponse(type, body);
      },
    });
  }

  async function handleResponse(type: string, body: unknown) {
    switch (type) {
      case "invalid":
        // The widget shows its own field-level errors; nothing to add.
        return;

      case "auth-screen":
        setPhase("authenticating");
        setMessage(undefined);
        return;

      case "sent":
        setPhase("verifying");
        return;

      case "success": {
        // Deliberately ignoring `body`: a success callback is not proof of
        // payment. Only the server's answer counts.
        setPhase("verifying");
        const result = await verifyPayment(checkoutId);
        setMessage(result.message);
        setPhase(result.paid ? "paid" : "failed");
        if (result.paid) cardRef.current?.unmount();
        return;
      }

      case "error":
      case "fail": {
        // The payment may still have gone through despite a failure callback,
        // so ask the server rather than assuming.
        setPhase("verifying");
        const result = await verifyPayment(checkoutId);
        setMessage(
          result.message ??
            (typeof body === "object" && body !== null && "message" in body
              ? String((body as { message: unknown }).message)
              : "The payment did not go through. Please try again."),
        );
        setPhase(result.paid ? "paid" : "failed");
        if (result.paid) cardRef.current?.unmount();
        return;
      }

      default:
        // New callback types may appear at any time; ignoring them is safest.
        return;
    }
  }

  useEffect(() => {
    // Covers the case where the SDK was already cached and loaded before this
    // component mounted, so Script's onReady has nothing left to fire.
    if (window.SumUpCard) mountCard();

    return () => {
      cardRef.current?.unmount();
      cardRef.current = null;
      mountedFor.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutId]);

  if (phase === "paid") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-semibold leading-8 tracking-tight text-black">
          Payment received. Welcome to ELSA Maastricht.
        </h2>
        <p className="mx-auto max-w-md text-lg leading-8 text-zinc-600">
          {message ??
            "Your membership is now active. A confirmation is on its way to " +
              "your inbox, and your e-member card will follow shortly."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {/* onReady, not onLoad: it fires on first load *and* on every remount,
          so returning to this page by client navigation re-mounts the card. */}
      <Script
        src={SDK_URL}
        strategy="afterInteractive"
        onReady={mountCard}
        onError={() => {
          setPhase("failed");
          setMessage(
            "The payment form could not be loaded. Check your connection and " +
              "refresh the page.",
          );
        }}
      />

      {phase === "loading" && (
        <p className="text-center text-base leading-7 text-zinc-500">
          Loading the secure payment form…
        </p>
      )}

      {phase === "authenticating" && (
        <p className="text-center text-base leading-7 text-zinc-600">
          Waiting for your bank to confirm the payment…
        </p>
      )}

      {phase === "verifying" && (
        <p className="text-center text-base leading-7 text-zinc-600">
          Confirming your payment with the provider…
        </p>
      )}

      {phase === "failed" && message && (
        <p
          role="alert"
          className="rounded-lg border border-solid border-red-500/30 bg-red-50 px-4 py-3 text-base leading-7 text-red-700"
        >
          {message}
        </p>
      )}

      {/* The Payment Widget renders itself into this element. Card details are
          collected by SumUp and never touch our server. */}
      <div id="sumup-card" />
    </div>
  );
}
