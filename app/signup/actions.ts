"use server";

import { redirect } from "next/navigation";

import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  ACADEMIC_YEAR,
  STUDY_PROGRAMS,
  YES_NO,
  findMembership,
  isPaymentMethod,
} from "./constants";
import type { SignUpState, SignUpValues } from "./types";

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;

// Deliberately permissive: the goal is to catch typos like a missing "@",
// not to adjudicate the RFC. Real verification happens when we email them.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitMembership(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = readField(formData, "email").toLowerCase();
  const firstName = readField(formData, "firstName");
  const lastName = readField(formData, "lastName");
  const studyProgram = readField(formData, "studyProgram");
  const dataConsent = readField(formData, "dataConsent");
  const newsletter = readField(formData, "newsletter");
  const membership = readField(formData, "membership");

  // Both submit buttons share this form; the pressed one contributes its own
  // name/value pair, which is how we tell the two paths apart.
  const paymentMethod = readField(formData, "paymentMethod");

  const values: SignUpValues = {
    email,
    firstName,
    lastName,
    studyProgram,
    dataConsent,
    newsletter,
    membership,
  };

  // The browser enforces `required` too, but that is a convenience, not a
  // guarantee: anything can POST to a Server Action, so re-check everything.
  const errors: Record<string, string> = {};

  if (!email) {
    errors.email = "Please enter your email address.";
  } else if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!firstName) {
    errors.firstName = "Please enter your first name.";
  } else if (firstName.length > MAX_NAME_LENGTH) {
    errors.firstName = `Please keep this under ${MAX_NAME_LENGTH} characters.`;
  }

  if (!lastName) {
    errors.lastName = "Please enter your last name.";
  } else if (lastName.length > MAX_NAME_LENGTH) {
    errors.lastName = `Please keep this under ${MAX_NAME_LENGTH} characters.`;
  }

  if (!STUDY_PROGRAMS.includes(studyProgram as (typeof STUDY_PROGRAMS)[number])) {
    errors.studyProgram = "Please select your study program.";
  }

  if (!YES_NO.includes(dataConsent as (typeof YES_NO)[number])) {
    errors.dataConsent = "Please select an answer.";
  } else if (dataConsent === "No") {
    // GDPR consent is the legal basis for holding this data at all, so "No"
    // is a hard stop rather than just a stored preference.
    errors.dataConsent =
      "We cannot process your membership without your consent to process your data.";
  }

  if (!YES_NO.includes(newsletter as (typeof YES_NO)[number])) {
    errors.newsletter = "Please select an answer.";
  }

  // Also yields the server-side price, so the tier is only looked up once.
  const selectedMembership = findMembership(membership);
  if (!selectedMembership) {
    errors.membership = "Please select a membership.";
  }

  if (!isPaymentMethod(paymentMethod)) {
    errors.paymentMethod = "Please choose a payment method.";
  }

  // The extra arms are redundant at runtime — the checks above already set the
  // matching error — but they let the compiler narrow both values below.
  if (
    Object.keys(errors).length > 0 ||
    !selectedMembership ||
    !isPaymentMethod(paymentMethod)
  ) {
    return { status: "error", errors, values };
  }

  if (!isSupabaseConfigured()) {
    console.error("Sign-up submitted but Supabase environment variables are missing.");
    return {
      status: "error",
      errors: {},
      values,
      formError:
        "The sign-up service is not available right now. Please try again later.",
    };
  }

  const supabase = createServiceRoleClient();

  // An existing member may not sign up again on the same address.
  //
  // Without this the upsert below reuses their row, and the sign-up flow hands
  // a confirmed member a fresh, payable checkout — so someone who pays, gets no
  // confirmation, and re-registers out of doubt is charged a second time. The
  // second payment also records nothing new: confirmed_members already holds
  // their row, so the insert collides on 23505 and is treated as success.
  //
  // Scoped to this membership year, since last year's members must be able to
  // renew on the address they already use.
  const { data: alreadyMember, error: memberLookupError } = await supabase
    .from("confirmed_members")
    .select("id")
    .eq("email", email)
    .eq("academic_year", ACADEMIC_YEAR)
    .limit(1)
    .maybeSingle();

  if (memberLookupError) {
    // Fail closed. Letting the sign-up through when we cannot tell whether they
    // are already a member is exactly the case that ends in a double charge,
    // and the upsert below would almost certainly fail for the same reason.
    console.error("Could not check for an existing membership:", memberLookupError);
    return {
      status: "error",
      errors: {},
      values,
      formError:
        "We could not check your membership status. Please try again, and contact us if the problem continues.",
    };
  }

  if (alreadyMember) {
    // Reported against the email field rather than the form as a whole: that
    // is the one value they have to change, and the form wires this key to the
    // input's own error message and aria-invalid state.
    return {
      status: "error",
      errors: {
        email: `This email address is already an ELSA Maastricht member for ${ACADEMIC_YEAR}. Please use a different email address, or contact the ELSA board if you think this is a mistake.`,
      },
      values,
    };
  }

  // Upsert rather than insert: someone who fills the form twice before paying
  // should update their pending sign-up, not hit a duplicate-key error.
  const { data, error } = await supabase
    .from("pending_members")
    .upsert(
      {
        email,
        first_name: firstName,
        last_name: lastName,
        study_program: studyProgram,
        data_consent: dataConsent === "Yes",
        newsletter: newsletter === "Yes",
        membership: selectedMembership.label,
        membership_price_cents: selectedMembership.priceCents,
        payment_method: paymentMethod,
        academic_year: ACADEMIC_YEAR,
        // `status` is deliberately absent. On conflict Postgres only updates the
        // columns named here, so leaving it out means a re-submission can never
        // move a row backwards out of 'paid' — the guard above is the first line
        // of defence, this is the one that holds even if it is ever bypassed. A
        // new row still starts at 'pending' from the column default, which is
        // correct: neither button takes money.
      },
      { onConflict: "email,academic_year" },
    )
    .select("id")
    .single();

  if (error) {
    // Log server-side for debugging; show the user something actionable.
    console.error("Failed to store pending member:", error);
    return {
      status: "error",
      errors: {},
      values,
      formError:
        "We could not save your sign-up. Please try again, and contact us if the problem continues.",
    };
  }

  // The sign-up is stored either way. Only the next step differs.
  if (paymentMethod === "online") {
    // Must be called outside try/catch: redirect() signals by throwing, and a
    // catch block would swallow it. Checkout looks the row up by this id.
    redirect(`/checkout?member=${data.id}`);
  }

  return {
    status: "success",
    errors: {},
    pendingMemberId: data.id,
    paymentMethod,
  };
}
