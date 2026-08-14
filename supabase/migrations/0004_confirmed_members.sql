-- Members whose in-person payment an ELSA team member has confirmed manually.
--
-- RUN THIS ON THE LIVE DATABASE (Supabase Dashboard -> SQL Editor).
-- Safe to run more than once.
--
-- Rows here are a full snapshot of the sign-up, not just a pointer to it. That
-- way the confirmation record stays complete and auditable even after the
-- pending_members row is eventually cleared out.

create table if not exists public.confirmed_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz not null default now(),

  -- Nullable, and set to null rather than cascading, so that deleting the
  -- pending row later never destroys the confirmation record.
  pending_member_id uuid references public.pending_members(id) on delete set null,

  -- Snapshot of the sign-up at the moment of confirmation.
  email text not null,
  first_name text not null,
  last_name text not null,
  study_program text not null,
  membership text not null,
  membership_price_cents integer not null,
  payment_method text not null,
  academic_year text not null,

  -- Which team member authorised this confirmation, and their attestation.
  authorised_by text not null,
  payment_attested boolean not null,

  constraint confirmed_members_payment_attested_check
    check (payment_attested = true)
);

-- One confirmation per sign-up. Postgres allows repeated NULLs in a unique
-- index, so rows whose pending member was later deleted never collide.
create unique index if not exists confirmed_members_pending_member_idx
  on public.confirmed_members (pending_member_id);

-- Handy for the committee's roster views.
create index if not exists confirmed_members_year_idx
  on public.confirmed_members (academic_year);

-- Same posture as pending_members: RLS on, no public policies, so the table is
-- reachable only through the service-role key inside a Server Action.
alter table public.confirmed_members enable row level security;
