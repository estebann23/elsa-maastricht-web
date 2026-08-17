import Image from "next/image";
import Link from "next/link";

import { logout } from "@/app/login/actions";
import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/server";

// Reads the confirmation back on every visit, so it must never be cached.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member confirmed — ELSA Maastricht",
};

/**
 * Where a team member lands after confirming an in-person payment.
 *
 * The name is looked up here rather than passed in the URL. `?member=` carries
 * only the sign-up id, so this page can state that someone was confirmed only
 * when `confirmed_members` actually holds the record — a hand-typed or stale
 * link renders nothing to celebrate instead of a confirmation that never
 * happened.
 *
 * Guarded by the proxy along with the rest of /private.
 */
export default async function MemberConfirmed({
  searchParams,
}: {
  searchParams: Promise<{ member?: string }>;
}) {
  const { member } = await searchParams;

  let confirmedName: string | undefined;

  if (member && isSupabaseConfigured()) {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("confirmed_members")
      .select("first_name, last_name")
      .eq("pending_member_id", member)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Could not load the confirmation:", error);
    } else if (data) {
      confirmedName = `${data.first_name} ${data.last_name}`;
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans">
      <div className="flex w-full max-w-3xl flex-1 flex-col bg-white">
        <main className="flex flex-1 flex-col gap-10 px-16 pt-16 pb-32">
          <form action={logout} className="self-end">
            <button
              type="submit"
              className="text-sm font-medium text-zinc-600 underline underline-offset-4 transition-colors hover:text-zinc-950"
            >
              Sign out
            </button>
          </form>

          {confirmedName ? (
            <p
              role="status"
              className="rounded-lg border border-solid border-black/[.08] bg-zinc-50 p-4 text-base leading-7 text-zinc-950"
            >
              {confirmedName} has been confirmed and added to the confirmed
              members list.
            </p>
          ) : (
            <p
              role="status"
              className="rounded-lg border border-solid border-black/[.08] bg-zinc-50 p-4 text-base leading-7 text-zinc-950"
            >
              We could not find that confirmation. Check the confirmed members
              list before confirming this member again.
            </p>
          )}

          <div className="flex flex-col gap-4">
            <Image
              src="/elsa-logo.jpg"
              alt="ELSA Maastricht logo"
              width={447}
              height={447}
              priority
              className="h-24 w-24 self-center rounded-lg"
            />
            <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black">
              In-Person Payment Confirmation (Only for the use of ELSA team)
            </h1>
          </div>

          <Link
            href="/private/add-member"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] sm:w-auto sm:self-start sm:px-8"
          >
            Confirm another member
          </Link>
        </main>
      </div>
    </div>
  );
}
