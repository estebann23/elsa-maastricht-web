"use server";

import { revalidatePath } from "next/cache";

import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { isAuthoriser } from "./constants";
import type { ConfirmState } from "./types";

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function confirmMember(
  _prevState: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const pendingMemberId = readField(formData, "pendingMemberId");
  const authorisedBy = readField(formData, "authorisedBy");
  // An unchecked box is simply absent from the form data.
  const attested = formData.get("paymentAttested") === "on";

  const errors: Record<string, string> = {};

  if (!pendingMemberId) {
    errors.pendingMemberId = "Please select a member.";
  }

  if (!isAuthoriser(authorisedBy)) {
    errors.authorisedBy = "Please select who is authorising this confirmation.";
  }

  if (!attested) {
    errors.paymentAttested = "Please confirm the payment has been completed.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  if (!isSupabaseConfigured()) {
    console.error("Confirmation submitted but Supabase env vars are missing.");
    return {
      status: "error",
      errors: {},
      formError: "The service is not available right now. Please try again later.",
    };
  }

  const supabase = createServiceRoleClient();

  // Read the sign-up server-side rather than trusting anything the form sent:
  // the browser supplies only an id, and every stored value comes from here.
  const { data: pending, error: readError } = await supabase
    .from("pending_members")
    .select(
      "id, email, first_name, last_name, study_program, membership, membership_price_cents, payment_method, academic_year",
    )
    .eq("id", pendingMemberId)
    .single();

  if (readError || !pending) {
    console.error("Could not load pending member:", readError);
    return {
      status: "error",
      errors: {},
      formError:
        "That sign-up could not be found. It may have been removed — reload the page and try again.",
    };
  }

  const { error: writeError } = await supabase.from("confirmed_members").insert({
    pending_member_id: pending.id,
    email: pending.email,
    first_name: pending.first_name,
    last_name: pending.last_name,
    study_program: pending.study_program,
    membership: pending.membership,
    membership_price_cents: pending.membership_price_cents,
    payment_method: pending.payment_method,
    academic_year: pending.academic_year,
    authorised_by: authorisedBy,
    payment_attested: true,
  });

  if (writeError && writeError.code !== "23505") {
    console.error("Failed to store confirmed member:", writeError);
    return {
      status: "error",
      errors: {},
      formError:
        "We could not confirm this member. Please try again, and contact the tech team if the problem continues.",
    };
  }

  // Mark the sign-up paid, exactly as the online payment path does.
  //
  // This is what stops a member who has already paid in cash from being charged
  // a second time: /checkout refuses to open a payment for a row whose status is
  // 'paid', and without this it stayed 'pending' forever, so a confirmed member
  // following their old checkout link would be handed a fresh, payable SumUp
  // checkout for the full membership price.
  //
  // Run for an already-confirmed member too (23505), which heals any row
  // confirmed before this was fixed. The pending row itself is deliberately
  // left in place.
  const { error: statusError } = await supabase
    .from("pending_members")
    .update({ status: "paid" })
    .eq("id", pending.id);

  if (statusError) {
    console.error("Could not mark sign-up as paid:", statusError);
  }

  if (writeError) {
    // 23505 = unique violation, i.e. this sign-up was already confirmed.
    return {
      status: "error",
      errors: {},
      formError: `${pending.first_name} ${pending.last_name} has already been confirmed.`,
    };
  }

  revalidatePath("/private/add-member");

  return {
    status: "success",
    errors: {},
    confirmedName: `${pending.first_name} ${pending.last_name}`,
  };
}
