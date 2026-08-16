// This module holds the SumUp secret API key, which grants broad access to the
// merchant account. The `server-only` import makes the build fail loudly if it
// is ever pulled into a Client Component.
import "server-only";

const API_BASE = "https://api.sumup.com/v0.1";

/** Reads the first environment variable that is actually set. */
function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Secret API key (`sup_sk_...`). Sent as `Authorization: Bearer`.

 */
export function getSumUpApiKey(): string | undefined {
  return readEnv("SUMUP_API_KEY");
}

/** The merchant account that receives the payment, e.g. `MEU26HSP`. */
export function getSumUpMerchantCode(): string | undefined {
  return readEnv("SUMUP_MERCHANT_CODE");
}

/**
 * Which account this deployment is *meant* to be using, from SUMUP_ENVIRONMENT.
 *
 * Optional, and only ever used to catch a mismatch: SumUp tells us what the
 * account actually is on every checkout, so this is the expectation we hold that
 * answer up against. Unset means no check.
 */
export function getExpectedEnvironment(): "sandbox" | "live" | undefined {
  const value = readEnv("SUMUP_ENVIRONMENT")?.toLowerCase();
  return value === "sandbox" || value === "live" ? value : undefined;
}

/**
 * Guards against the two ways a credential mix-up costs real money.
 *
 * Believing we are live while running on sandbox is the expensive one: sandbox
 * approves test cards, so every "payment" would confirm a membership nobody
 * paid for. The reverse — believing we are testing while pointed at the live
 * account — charges real cards during a test run. Both are silent without this.
 */
export function environmentMismatch(checkout: SumUpCheckout): string | undefined {
  const expected = getExpectedEnvironment();
  if (!expected) return undefined;

  const actual = environmentOf(checkout);
  if (actual === expected) return undefined;

  return (
    `SUMUP_ENVIRONMENT is "${expected}" but SumUp processed checkout ` +
    `${checkout.id} on a ${actual} account (merchant ${checkout.merchant_code}).`
  );
}

/**
 * Which SumUp account a checkout was created against.
 *
 * SumUp reports this itself as `merchant_sandbox` on the checkout, so we record
 * what actually happened rather than what we believed was configured. When the
 * field is absent we assume "live", since only sandbox responses carry it.
 */
export function environmentOf(checkout: SumUpCheckout): "sandbox" | "live" {
  return checkout.merchant_sandbox ? "sandbox" : "live";
}

/** True when the server has everything it needs to talk to SumUp. */
export function isSumUpConfigured(): boolean {
  return Boolean(getSumUpApiKey() && getSumUpMerchantCode());
}

/** The four states a checkout can be in. */
export type CheckoutStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

export type SumUpCheckout = {
  id: string;
  checkout_reference: string;
  status: CheckoutStatus;
  amount: number;
  currency: string;
  merchant_code?: string;
  /** Present and true only on sandbox merchant accounts. */
  merchant_sandbox?: boolean;
  date?: string;
  valid_until?: string | null;
  transactions?: Array<{
    id: string;
    status?: string;
    /** Present on declines, e.g. "INSUFFICIENT_FUNDS". Never card data. */
    payment_type?: string;
  }>;
};

/** An error response from the SumUp API: `{message, error_code, param}`. */
export class SumUpError extends Error {
  readonly status: number;
  readonly errorCode?: string;
  readonly param?: string;

  constructor(
    message: string,
    status: number,
    errorCode?: string,
    param?: string,
  ) {
    super(message);
    this.name = "SumUpError";
    this.status = status;
    this.errorCode = errorCode;
    this.param = param;
  }
}

async function request<T>(
  path: string,
  init: { method: string; body?: unknown },
): Promise<T> {
  const apiKey = getSumUpApiKey();

  if (!apiKey) {
    throw new Error(
      "SumUp is not configured. Set SUMUP_API_KEY and " +
        "SUMUP_MERCHANT_CODE in .env.local (see .env.example).",
    );
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    // Payment state is never cacheable, and Next caches fetches by default.
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = undefined;
  if (text.length > 0) {
    try {
      payload = JSON.parse(text);
    } catch {
      // Fall through: a non-JSON body from a 5xx is still worth reporting.
    }
  }

  if (!response.ok) {
    const body = (payload ?? {}) as {
      message?: string;
      error_message?: string;
      error_code?: string;
      param?: string;
    };
    throw new SumUpError(
      body.message ?? body.error_message ?? `SumUp returned ${response.status}`,
      response.status,
      body.error_code,
      body.param,
    );
  }

  return payload as T;
}

/**
 * Creates a checkout and returns it, including the `id` the Payment Widget
 * needs.
 *
 * `amountCents` comes from the member's stored tier price. SumUp's amount is in
 * major units — 1500 cents is sent as 15.00, not 1500.
 *
 * `checkoutReference` must be unique for every attempt. Reusing one that SumUp
 * has already processed makes it reject the request, so a retry after a decline
 * needs a fresh reference.
 */
export async function createCheckout(params: {
  checkoutReference: string;
  amountCents: number;
  currency?: string;
  description: string;
  /** Where the browser lands after an off-site 3D Secure challenge. */
  redirectUrl?: string;
  /** Server-to-server webhook for checkout status changes. */
  returnUrl?: string;
}): Promise<SumUpCheckout> {
  const merchantCode = getSumUpMerchantCode();

  if (!merchantCode) {
    throw new Error(
      "SumUp merchant code is missing. Set SUMUP_MERCHANT_CODE in .env.local.",
    );
  }

  return request<SumUpCheckout>("/checkouts", {
    method: "POST",
    body: {
      checkout_reference: params.checkoutReference,
      amount: toMajorUnits(params.amountCents),
      currency: params.currency ?? "EUR",
      merchant_code: merchantCode,
      description: params.description,
      ...(params.redirectUrl ? { redirect_url: params.redirectUrl } : {}),
      ...(params.returnUrl ? { return_url: params.returnUrl } : {}),
      // Note: `pay_to_email` is the account RECEIVING the money, not the payer.
      // SumUp fills it from the merchant account, so we never send it. The
      // member's own email goes to the widget's `email` config instead.
    },
  });
}

/**
 * Retrieves a checkout. This is the only trustworthy source of payment status.
 *
 * The widget's `success` callback and a visit to the redirect URL both mean
 * only that the browser got that far — SumUp's own docs are explicit that
 * neither proves the payment went through. Fulfil on `status === "PAID"` from
 * this call and nothing else.
 */
export async function getCheckout(checkoutId: string): Promise<SumUpCheckout> {
  return request<SumUpCheckout>(`/checkouts/${encodeURIComponent(checkoutId)}`, {
    method: "GET",
  });
}

/** 1500 -> 15, 1350 -> 13.5. Rounded to avoid binary-float noise. */
function toMajorUnits(cents: number): number {
  return Math.round(cents) / 100;
}
