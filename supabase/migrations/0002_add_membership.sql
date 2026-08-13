-- Adds the Membership field (form question 7) and enforces GDPR consent.
--
-- RUN THIS ONE on the live database — 0001 has already been applied there, so
-- editing 0001 alone changes nothing for you. 0001 was updated in parallel so
-- that a brand-new project still gets the full schema in a single run.
--
-- Safe to run more than once.

-- 1. Membership columns -----------------------------------------------------
-- Added with a default so any rows already in the table stay valid, since the
-- columns are NOT NULL. The default is dropped again below: every new sign-up
-- must state its tier explicitly rather than silently inheriting one.
alter table public.pending_members
  add column if not exists membership text not null
    default 'Full-year Membership (Regular price) - 15€',
  add column if not exists membership_price_cents integer not null
    default 1500;

alter table public.pending_members
  alter column membership drop default,
  alter column membership_price_cents drop default;

-- 2. Allowed tiers ----------------------------------------------------------
alter table public.pending_members
  drop constraint if exists pending_members_membership_check;

alter table public.pending_members
  add constraint pending_members_membership_check
  check (membership in (
    'Full-year Membership (Regular price) - 15€',
    'Full-year Membership (INKOM price) - 13.50€',
    '1-semester membership - 9€'
  ));

-- 3. GDPR consent is mandatory ----------------------------------------------
-- The form blocks submission when consent is No; this is the matching
-- guarantee at the storage layer.
--
-- If this fails, the table already holds rows with data_consent = false. Deal
-- with them first, then re-run:
--   select id, email, created_at from public.pending_members
--   where data_consent = false;
alter table public.pending_members
  drop constraint if exists pending_members_data_consent_check;

alter table public.pending_members
  add constraint pending_members_data_consent_check
  check (data_consent = true);
