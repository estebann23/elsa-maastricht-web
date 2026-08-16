-- One row per SumUp checkout created for an online membership payment.
--
-- RUN THIS ON THE LIVE DATABASE (Supabase Dashboard -> SQL Editor).
-- Safe to run more than once.
--
-- Why a separate table rather than columns on pending_members: SumUp requires a
-- NEW, unique checkout_reference for every payment attempt. A member whose card
-- is declined and who tries again needs a second checkout, so attempts are
-- inherently one-to-many. Keeping them here also leaves a reconciliation trail
-- we can match against the SumUp dashboard.

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Nullable and set to null on delete, same reasoning as confirmed_members:
  -- clearing out old sign-ups must never destroy the payment record.
  pending_member_id uuid references public.pending_members(id) on delete set null,

  -- Our reference, sent to SumUp. Must be unique per attempt: reusing one that
  -- has already been processed makes SumUp reject the checkout.
  checkout_reference text not null,

  -- SumUp's id for the checkout. Null only in the brief window between our
  -- insert and SumUp's response, and on attempts where creation failed.
  checkout_id text,

  -- What we asked SumUp to charge, copied from the member's stored tier price.
  -- Kept here so the amount can be reconciled without trusting the browser.
  amount_cents integer not null,
  currency text not null default 'EUR',

  -- Which SumUp account processed this. Sandbox and live rows will sit side by
  -- side in this table once we go live, and they must be distinguishable.
  environment text not null default 'sandbox',
  merchant_code text,

  -- Mirrors SumUp's checkout status. 'PENDING' until the server has verified
  -- otherwise; the browser never sets this.
  status text not null default 'PENDING',

  -- When the server last called GET /v0.1/checkouts/{id}. Payment status is
  -- only ever written from the result of that call.
  last_verified_at timestamptz,

  -- Verbatim failure reason from SumUp, for support questions. Never contains
  -- card data — we only ever see the last four digits and the scheme.
  failure_reason text,

  constraint payment_attempts_status_check
    check (status in ('PENDING', 'PAID', 'FAILED', 'EXPIRED')),

  constraint payment_attempts_environment_check
    check (environment in ('sandbox', 'live')),

  constraint payment_attempts_amount_check
    check (amount_cents > 0)
);

-- The uniqueness SumUp expects of us, enforced on our side too.
create unique index if not exists payment_attempts_reference_idx
  on public.payment_attempts (checkout_reference);

-- Lookup path for the verification action and the webhook, which both arrive
-- knowing only SumUp's checkout id.
create unique index if not exists payment_attempts_checkout_id_idx
  on public.payment_attempts (checkout_id);

-- "Show me this member's attempts, newest first."
create index if not exists payment_attempts_member_idx
  on public.payment_attempts (pending_member_id, created_at desc);

-- Reuses the trigger function defined in 0001.
drop trigger if exists payment_attempts_set_updated_at on public.payment_attempts;
create trigger payment_attempts_set_updated_at
  before update on public.payment_attempts
  for each row execute function public.set_updated_at();

-- Same posture as the other tables: RLS on with no public policies, so this is
-- reachable only through the service-role key on the server.
alter table public.payment_attempts enable row level security;
