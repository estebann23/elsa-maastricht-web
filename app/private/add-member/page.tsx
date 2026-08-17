import Image from "next/image";

import { logout } from "@/app/login/actions";
import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ConfirmForm } from "./form";
import type { PendingOption } from "./types";

// The member list must reflect the database on every visit, so this page is
// never prerendered or cached.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "In-Person Payment Confirmation — ELSA Maastricht",
};

async function loadPendingMembers(): Promise<{
  options: PendingOption[];
  loadError?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { options: [], loadError: "Supabase is not configured." };
  }

  const supabase = createServiceRoleClient();
  // Only sign-ups that chose to pay in person. Someone who picked online
  // payment is settled by SumUp, and confirming them here would record a
  // payment nobody took at the desk. Checkout rewrites this column to 'online'
  // when a member switches to paying online, so they drop off the list by
  // themselves. The stored value is 'in_person'; "In-person" is only how the
  // form spells it.
  // Already-paid sign-ups drop off the list. Confirming one is rejected anyway
  // — confirmed_members is unique per sign-up — but leaving them in the picker
  // invites a team member to pick a name and be told off for it, which at a
  // busy desk reads as the tool being broken rather than the job being done.
  const { data, error } = await supabase
    .from("pending_members")
    .select("id, first_name, last_name")
    .eq("payment_method", "in_person")
    .neq("status", "paid")
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Could not load pending members:", error);
    return { options: [], loadError: "Could not load the list of sign-ups." };
  }

  return {
    options: (data ?? []).map((row) => ({
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
    })),
  };
}

export default async function AddMember() {
  const { options, loadError } = await loadPendingMembers();

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
            <p className="text-base leading-7 text-zinc-600">
              This platform is for confirming new members who signed-up via the form but chose &ldquo;In-person payment&rdquo; instead. If the name of the person is not on the list, their sign-up was not confirmed. Ask them to complete the sign-up process again. Confirming a member records the payment and copies the sign-up
              into the confirmed members list.
            </p>
          </div>

          <ConfirmForm options={options} loadError={loadError} />
        </main>
      </div>
    </div>
  );
}
