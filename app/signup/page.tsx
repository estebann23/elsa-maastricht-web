"use client";

import { useState } from "react";

const STUDY_PROGRAMS = [
  "Student at Faculty of Law",
  "Alumni at Faculty of Law",
  "Exchange student",
  "Student at UM, other faculties",
  "Other",
];

const YES_NO = ["Yes", "No"];

const labelClass = "text-base font-medium text-zinc-950";

const fieldClass =
  "h-12 w-full rounded-lg border border-solid border-black/[.08] bg-white px-4 text-base text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-black/[.24]";

export default function SignUp() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans">
        <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-6 py-32 px-16 bg-white sm:items-start">
          <h1 className="max-w-md text-3xl font-semibold leading-10 tracking-tight text-black">
            Thank you for signing up.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600">
            Your membership form has been received. ELSA Maastricht will be in
            touch with you shortly.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 text-base font-medium transition-colors hover:border-transparent hover:bg-black/[.04] md:w-[158px]"
          >
            Back to form
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center gap-10 py-32 px-16 bg-white sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black">
            ELSA Maastricht 2026/2027 Membership Sign Up/Renewal Form
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600">
            To Become a New Member or Renew Your Membership, please fill in and
            submit this form.
          </p>
          <p className="max-w-md text-base leading-7 text-zinc-600">
            With over 40 years of accrued experience in building young legal
            careers, ELSA is the world&rsquo;s largest independent law
            students&rsquo; association. The unique global network of ELSA
            Alumni brings together law students and legal professionals in the
            Netherlands and across Europe from all walks of life and from
            different career levels. Our members include CEOs, government
            officials, business leaders, bankers, NGO leaders, officials working
            for international institutions, diplomats, lawyers, judges,
            academics, entrepreneurs, executives and business angels. On a
            Maastricht level, we focus on building further our legal
            professional network of ELSA Alumni and Active Members and we ensure
            you know How To ELSA Successfully to eventually achieve your career
            ambitions.
          </p>
        </div>

        <form
          className="flex w-full flex-col gap-8"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className={fieldClass}
            />
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
              className={fieldClass}
            />
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
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="studyProgram" className={labelClass}>
              Study program
            </label>
            <select
              id="studyProgram"
              name="studyProgram"
              required
              defaultValue=""
              className={`${fieldClass} appearance-none`}
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
                    className="h-4 w-4 accent-zinc-950"
                  />
                  {option}
                </label>
              ))}
            </div>
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
                    className="h-4 w-4 accent-zinc-950"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] md:w-[158px]"
          >
            Submit
          </button>
        </form>
      </main>
    </div>
  );
}
