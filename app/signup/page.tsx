"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import { submitMembership } from "./actions";
import { MEMBERSHIP_LABELS, STUDY_PROGRAMS, YES_NO } from "./constants";
import { initialSignUpState } from "./types";

/**
 * White page column with the cover banner flush across the top.
 *
 * Shared by the form and the confirmation screen so the banner does not
 * disappear the moment someone submits.
 */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans">
      <div className="flex w-full max-w-3xl flex-1 flex-col bg-white">
        <Image
          src="/elsa_maastricht_cover.jpg"
          alt="ELSA Maastricht"
          width={1128}
          height={191}
          priority
          className="h-auto w-full"
        />
        <main className="flex flex-1 flex-col items-center gap-10 px-16 pt-14 pb-32">
          {children}
        </main>
      </div>
    </div>
  );
}

const labelClass = "text-base font-medium text-zinc-950";

const fieldClass =
  "h-12 w-full rounded-lg border border-solid border-black/[.08] bg-white px-4 text-base text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-black/[.24]";

const errorClass = "text-sm leading-6 text-red-600";

function fieldClassFor(hasError: boolean) {
  return hasError ? `${fieldClass} border-red-500/60` : fieldClass;
}

export default function SignUp() {
  const [state, formAction, isPending] = useActionState(
    submitMembership,
    initialSignUpState,
  );

  const values = state.values;

  // Tracked so the consent warning and the disabled submit button react
  // immediately, before the form is ever sent. The server re-checks this.
  const [dataConsent, setDataConsent] = useState(values?.dataConsent ?? "");
  const consentRefused = dataConsent === "No";

  if (state.status === "success") {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black">
            Thank you.
          </h1>
          <p className="mx-auto max-w-md text-lg leading-8 text-zinc-600">
            Your sign-up has been processed. Your membership will be fully
            activated once you finalise the payment.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Square source (447x447), so equal width/height keeps it undistorted. */}
        <Image
          src="/elsa-logo.jpg"
          alt="ELSA Maastricht logo"
          width={447}
          height={447}
          priority
          className="h-24 w-24 rounded-lg"
        />
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black">
          ELSA Maastricht 2026/2027
        </h1>
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black">
          Membership Sign Up/Renewal Form
        </h1>
        <p className="mx-auto mt-2 w-full text-lg leading-8 text-zinc-600">
          To Become a New Member or Renew Your Membership, please fill in and
          submit this form.
        </p>
        <p className="mx-auto w-full text-base leading-7 text-zinc-600">
          With over 40 years of accrued experience in building young legal
          careers, ELSA is the world&rsquo;s largest independent law
          students&rsquo; association. The unique global network of ELSA Alumni
          brings together law students and legal professionals in the
          Netherlands and across Europe from all walks of life and from
          different career levels. Our members include CEOs, government
          officials, business leaders, bankers, NGO leaders, officials working
          for international institutions, diplomats, lawyers, judges, academics,
          entrepreneurs, executives and business angels. On a Maastricht level,
          we focus on building further our legal professional network of ELSA
          Alumni and Active Members and we ensure you know &ldquo;How To
          ELS&rdquo; Successfully to eventually achieve your career ambitions.
        </p>
      </div>

      <form action={formAction} className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={values?.email}
            aria-invalid={Boolean(state.errors.email)}
            aria-describedby={state.errors.email ? "email-error" : undefined}
            className={fieldClassFor(Boolean(state.errors.email))}
          />
          {state.errors.email && (
            <p id="email-error" className={errorClass}>
              {state.errors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="firstName" className={labelClass}>
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            defaultValue={values?.firstName}
            aria-invalid={Boolean(state.errors.firstName)}
            aria-describedby={
              state.errors.firstName ? "firstName-error" : undefined
            }
            className={fieldClassFor(Boolean(state.errors.firstName))}
          />
          {state.errors.firstName && (
            <p id="firstName-error" className={errorClass}>
              {state.errors.firstName}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="lastName" className={labelClass}>
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            defaultValue={values?.lastName}
            aria-invalid={Boolean(state.errors.lastName)}
            aria-describedby={
              state.errors.lastName ? "lastName-error" : undefined
            }
            className={fieldClassFor(Boolean(state.errors.lastName))}
          />
          {state.errors.lastName && (
            <p id="lastName-error" className={errorClass}>
              {state.errors.lastName}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="studyProgram" className={labelClass}>
            Study program
          </label>
          <select
            id="studyProgram"
            name="studyProgram"
            required
            defaultValue={values?.studyProgram ?? ""}
            aria-invalid={Boolean(state.errors.studyProgram)}
            aria-describedby={
              state.errors.studyProgram ? "studyProgram-error" : undefined
            }
            className={`${fieldClassFor(Boolean(state.errors.studyProgram))} appearance-none`}
          >
            <option value="" disabled>
              Select an option
            </option>
            {STUDY_PROGRAMS.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
          {state.errors.studyProgram && (
            <p id="studyProgram-error" className={errorClass}>
              {state.errors.studyProgram}
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className={labelClass}>
            Do you consent to processing your data by ELSA Maastricht for the
            purposes of the association in accordance with the General Data
            Protection Regulation?
          </legend>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            {YES_NO.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 text-base text-zinc-600"
              >
                <input
                  type="radio"
                  name="dataConsent"
                  value={option}
                  required
                  checked={dataConsent === option}
                  onChange={(event) => setDataConsent(event.target.value)}
                  className="h-4 w-4 accent-zinc-950"
                />
                {option}
              </label>
            ))}
          </div>
          {consentRefused && !state.errors.dataConsent && (
            <p className={errorClass}>
              We cannot process your membership without your consent to
              process your data.
            </p>
          )}
          {state.errors.dataConsent && (
            <p className={errorClass}>{state.errors.dataConsent}</p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className={labelClass}>
            Do you wish to receive ELSA Newsletters informing you of upcoming
            events and offers (new professional opportunities, discounts,
            academic events, etc.)?
          </legend>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            {YES_NO.map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 text-base text-zinc-600"
              >
                <input
                  type="radio"
                  name="newsletter"
                  value={option}
                  required
                  defaultChecked={values?.newsletter === option}
                  className="h-4 w-4 accent-zinc-950"
                />
                {option}
              </label>
            ))}
          </div>
          {state.errors.newsletter && (
            <p className={errorClass}>{state.errors.newsletter}</p>
          )}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="membership" className={labelClass}>
            Membership
          </label>
          <select
            id="membership"
            name="membership"
            required
            defaultValue={values?.membership ?? ""}
            aria-invalid={Boolean(state.errors.membership)}
            aria-describedby={
              state.errors.membership ? "membership-error" : undefined
            }
            className={`${fieldClassFor(Boolean(state.errors.membership))} appearance-none`}
          >
            <option value="" disabled>
              Select an option
            </option>
            {MEMBERSHIP_LABELS.map((membership) => (
              <option key={membership} value={membership}>
                {membership}
              </option>
            ))}
          </select>
          {state.errors.membership && (
            <p id="membership-error" className={errorClass}>
              {state.errors.membership}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-solid border-black/[.08] bg-zinc-50 p-6">
          <p className="text-base font-medium text-zinc-950">
            Choose a payment method now.
          </p>
          <ol className="flex flex-col gap-2 text-base leading-7 text-zinc-600">
            <li>
              1. Choose online payment and receive now your membership
              confirmation and e-member card directly in your Apple/Google
              Wallet.
            </li>
            <li>
              2. Choose &ldquo;In-person payment&rdquo; otherwise and finalise
              your payment using card/cash during INKOM or during ELSA&rsquo;s
              office hours.
            </li>
          </ol>
          <p className="text-base leading-7 text-zinc-600">
            Your membership will only be activated when payment is confirmed.
          </p>
        </div>

        {state.formError && (
          <p role="alert" className={errorClass}>
            {state.formError}
          </p>
        )}
        {state.errors.paymentMethod && (
          <p role="alert" className={errorClass}>
            {state.errors.paymentMethod}
          </p>
        )}

        {/* Two submit buttons in one form: whichever is pressed contributes
            its own paymentMethod value, so the server knows which path to
            take. Both save the sign-up first. */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            type="submit"
            name="paymentMethod"
            value="online"
            disabled={isPending || consentRefused}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Submitting..." : "Send and continue to checkout"}
          </button>
          <button
            type="submit"
            name="paymentMethod"
            value="in_person"
            disabled={isPending || consentRefused}
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 text-base font-medium transition-colors hover:border-transparent hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            In-person payment
          </button>
        </div>
      </form>
    </PageShell>
  );
}
