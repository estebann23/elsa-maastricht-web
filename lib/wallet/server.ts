// Holds the WalletWallet API key. `server-only` makes the build fail loudly if
// this is ever pulled into a Client Component.
import "server-only";

import { ELSA_ICON_DATA_URI, ELSA_LOGO_DATA_URI, ELSA_STRIP_DATA_URI} from "./brand-assets";

const API_BASE = "https://api.walletwallet.dev";

function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.length > 0) return value;
  }
  return undefined;
}

/** Secret API key, `ww_live_<32 hex>`. Sent as `Authorization: Bearer`. */
export function getWalletApiKey(): string | undefined {
  return readEnv("WALLET_WALLET_API_KEY");
}

export function isWalletConfigured(): boolean {
  return Boolean(getWalletApiKey());
}

/** What `POST /api/passes` returns. */
export type CreatedPass = {
  serialNumber: string;
  googleSaveUrl: string;
  /** The signed .pkpass, base64. */
  applePass: string;
  /** WalletWallet's own device-aware install page. */
  shareUrl?: string;
};

export class WalletError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WalletError";
    this.status = status;
  }
}

/**
 * Creates a membership card in both wallets in one call.
 *
 * The payload is the card design in `wallet-card-sample.md`, with the two
 * per-member values substituted in. One call produces both an Apple `.pkpass`
 * and a Google save link from the same definition, so the two wallets cannot
 * drift apart.
 *
 * `color`, `logoURL` and `iconURL` are Pro-plan fields. They are used here
 * deliberately: the card is branded, and the plan is expected to cover it.
 */
export async function createMembershipPass(params: {
  memberName: string;
  academicYear: string;
  memberId: string;
}): Promise<CreatedPass> {
  const apiKey = getWalletApiKey();

  if (!apiKey) {
    throw new Error(
      "WalletWallet is not configured. Set WALLET_WALLET_API_KEY in .env.local.",
    );
  }

  const body = {
    // The QR carries the member id: opaque, works with no network, and is what
    // a committee member looks up in the team area.
    barcodeValue: params.memberId,
    barcodeFormat: "QR",
    logoText: "ELSA Maastricht",
    organizationName: "European Law Students' Association Maastricht",
    colorPreset: "blue",
    color: "#3b5dce",
    logoURL: ELSA_LOGO_DATA_URI,
    iconURL: ELSA_ICON_DATA_URI,
    stripURL: ELSA_STRIP_DATA_URI,
    secondaryFields: [{ label: "NAME", value: params.memberName }],
    headerFields: [{ label: "VALID", value: params.academicYear }],
    // An empty field carrying `changeMessage` is how a pass declares that it
    // can push notifications: Apple shows the message when the value changes,
    // and "%@" is the placeholder for the new value.
    backFields: [{ label: "Notifications", value: " ", changeMessage: "%@" }],
  };

  const response = await fetch(`${API_BASE}/api/passes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    // A non-JSON body from a 5xx is still worth reporting.
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string } | undefined)?.error ??
      `WalletWallet returned ${response.status}`;
    throw new WalletError(message, response.status);
  }

  const pass = payload as Partial<CreatedPass>;

  if (!pass?.serialNumber || !pass.googleSaveUrl || !pass.applePass) {
    throw new WalletError("WalletWallet returned an incomplete pass.", 500);
  }

  return pass as CreatedPass;
}
