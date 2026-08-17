import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Serves the signed Apple `.pkpass` for a card we issued.
 *
 * WalletWallet returns the binary once, at creation, and exposes no endpoint to
 * fetch it back by serial — so we store it and serve it ourselves. That is what
 * makes a real "Add to Apple Wallet" button possible: iOS installs the pass
 * when it receives this content type.
 *
 * The serial is the capability. It is a server-generated UUID that only the
 * paying member is ever shown, which is the same model WalletWallet uses for
 * its own public /p/<serial> install page. Nothing sensitive is exposed: the
 * pass contains the member's own name and membership.
 */
/** WalletWallet serials are UUIDs. */
const SERIAL_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ serial: string }> },
) {
  const { serial } = await params;

  // Checked before the query, not after. Forwarding arbitrary path text into a
  // PostgREST filter means a SQL-shaped serial trips Supabase's WAF at the
  // edge, and the block comes back as a 503 that looks like our outage rather
  // than the 404 it is. A serial that cannot exist is answered here.
  if (!SERIAL_PATTERN.test(serial)) {
    return new Response("Not found", { status: 404 });
  }

  if (!isSupabaseConfigured()) {
    return new Response("Not available", { status: 503 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("member_passes")
    .select("apple_pass_base64")
    .eq("serial_number", serial)
    .maybeSingle();

  if (error) {
    console.error("Could not load wallet pass:", error);
    return new Response("Not available", { status: 503 });
  }

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const body = Buffer.from(data.apple_pass_base64, "base64");

  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": 'attachment; filename="elsa-maastricht.pkpass"',
      "Content-Length": String(body.length),
      // A membership card is personal and may be revoked; never let a proxy
      // hold a copy.
      "Cache-Control": "no-store, private",
    },
  });
}
