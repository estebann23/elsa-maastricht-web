"use server";

import { createServiceRoleClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  ACADEMIC_YEAR,
  STUDY_PROGRAMS,
  YES_NO,
  findMembership,
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

  // The `!selectedMembership` arm is redundant at runtime — an unknown tier
  // has already set errors.membership — but it lets the compiler treat
  // selectedMembership as defined for the rest of the function.
  if (Object.keys(errors).length > 0 || !selectedMembership) {
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
        academic_year: ACADEMIC_YEAR,
        status: "pending",
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

  // Next step (not built yet): redirect("/checkout?member=" + data.id) so the
  // member pays. The id is returned here so checkout can pick this row up.
  return { status: "success", errors: {}, pendingMemberId: data.id };
}
