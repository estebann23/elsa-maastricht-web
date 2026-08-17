import "server-only";

import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createMembershipPass, isWalletConfigured } from "@/lib/wallet/server";

/** What the success page needs to render the two Add-to-Wallet buttons. */
export type MemberPass = {
  serialNumber: string;
  googleSaveUrl: string;
};

/**
 * Renders an academic year the way the card shows it: "2026/2027" → "2026/27".
 *
 * The card has one narrow field for this, and the short form is what the
 * design calls for. Anything not in the stored four-digit shape is passed
 * through untouched rather than mangled.
 */
function academicYearLabel(year: string): string {
  const match = year.match(/^(\d{4})\/(\d{2})(\d{2})$/);
  return match ? `${match[1]}/${match[3]}` : year;
}

/**
 * Returns the member's wallet card, creating it on first use.
 *
 * Only issued to a member whose sign-up is recorded as paid — the card is proof
 * of membership, so it must never exist before the payment does.
 *
 * Every failure returns null rather than throwing. This runs while rendering a
 * "payment received" screen, and a WalletWallet outage must never turn a
 * successful payment into an error page: the member simply sees the
 * confirmation without the buttons.
 */
export async function getOrCreateMemberPass(
  memberId: string,
): Promise<MemberPass | null> {
  if (!isSupabaseConfigured() || !isWalletConfigured()) return null;

  const supabase = createServiceRoleClient();

  try {
    const existing = await readPass(memberId);
    if (existing) return existing;

    const { data: member, error } = await supabase
      .from("pending_members")
      .select("id, email, first_name, last_name, academic_year, status")
      .eq("id", memberId)
      .maybeSingle();

    if (error || !member) {
      console.error("Could not load member for wallet pass:", error);
      return null;
    }

    // The card is issued against the paid status, not against whoever asked.
    if (member.status !== "paid") {
      console.warn(`Refusing a wallet pass for unpaid member ${memberId}.`);
      return null;
    }

    const created = await createMembershipPass({
      memberName: `${member.first_name} ${member.last_name}`,
      academicYear: academicYearLabel(member.academic_year),
      memberId: member.id,
    });

    const { error: insertError } = await supabase.from("member_passes").insert({
      pending_member_id: member.id,
      email: member.email,
      serial_number: created.serialNumber,
      google_save_url: created.googleSaveUrl,
      apple_pass_base64: created.applePass,
      share_url: created.shareUrl ?? null,
    });

    if (insertError) {
      // 23505 = another request won the race and already stored a card for this
      // member. Theirs is the one of record; ours is an orphan at WalletWallet,
      // which is harmless — it was never handed to anyone.
      if (insertError.code === "23505") {
        return await readPass(memberId);
      }

      console.error("Could not store member pass:", insertError);
      return null;
    }

    return {
      serialNumber: created.serialNumber,
      googleSaveUrl: created.googleSaveUrl,
    };
  } catch (cause) {
    console.error("Could not issue a wallet pass:", cause);
    return null;
  }
}

async function readPass(memberId: string): Promise<MemberPass | null> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("member_passes")
    .select("serial_number, google_save_url")
    .eq("pending_member_id", memberId)
    .maybeSingle();

  if (!data) return null;

  return {
    serialNumber: data.serial_number,
    googleSaveUrl: data.google_save_url,
  };
}
