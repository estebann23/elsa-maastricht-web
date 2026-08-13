-- ELSA Maastricht — pending membership sign-ups.
--
-- Run this once against your Supabase project:
--   Supabase Dashboard -> SQL Editor -> paste -> Run
-- or, with the Supabase CLI linked to the project:
--   supabase db push

create table if not exists public.pending_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  email text not null,
  first_name text not null,
  last_name text not null,
  study_program text not null,

  -- Stored as booleans; the form collects them as Yes/No.
  -- data_consent is always true in practice: the form blocks submission when
  -- the member answers No, since consent is the basis for storing this row.
  data_consent boolean not null,
  newsletter boolean not null,

  -- Chosen tier, plus its price in euro cents captured at sign-up time so a
  -- later price change never rewrites what an existing member owes.
  membership text not null,
  membership_price_cents integer not null,

  academic_year text not null default '2026/2027',

  -- 'pending'  : form submitted, not yet paid
  -- 'paid'     : checkout completed
  -- 'cancelled': withdrawn or expired
  status text not null default 'pending',

  constraint pending_members_status_check
    check (status in ('pending', 'paid', 'cancelled')),

  constraint pending_members_study_program_check
    check (study_program in (
      'Student at Faculty of Law',
      'Alumni at Faculty of Law',
      'Exchange student',
      'Student at UM, other faculties',
      'Other'
    )),

  constraint pending_members_membership_check
    check (membership in (
      'Full-year Membership (Regular price) - 15€',
      'Full-year Membership (INKOM price) - 13.50€',
      '1-semester membership - 9€'
    )),

  -- Consent is required to hold the row at all; enforced in the form and here.
  constraint pending_members_data_consent_check
    check (data_consent = true)
);

-- One sign-up per person per membership year. This is also the conflict target
-- for the upsert in app/signup/actions.ts, so re-submitting the form updates
-- the existing row instead of failing.
create unique index if not exists pending_members_email_year_idx
  on public.pending_members (email, academic_year);

-- Useful for the committee's "who still hasn't paid" view.
create index if not exists pending_members_status_idx
  on public.pending_members (status);

-- Keep updated_at honest on upserts.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pending_members_set_updated_at on public.pending_members;
create trigger pending_members_set_updated_at
  before update on public.pending_members
  for each row execute function public.set_updated_at();

-- Row Level Security: ON, with no policies granted to anon/authenticated.
-- That means the public API keys can neither read nor write this table. The
-- only writer is the Server Action, which uses the service-role key and
-- bypasses RLS. This is what keeps members' personal data out of the browser.
alter table public.pending_members enable row level security;
