-- Records which of the two submit buttons the member used.
--
-- RUN THIS ON THE LIVE DATABASE (Supabase Dashboard -> SQL Editor).
-- 0001 was updated in parallel so a fresh project gets the column directly.
-- Safe to run more than once.
--
-- Note this is the chosen *method*, not proof of payment: both paths leave
-- status = 'pending'. Only confirmed payment should move a row to 'paid'.

alter table public.pending_members
  add column if not exists payment_method text not null default 'in_person';

-- Existing rows needed a default to satisfy NOT NULL; new sign-ups must state
-- the method explicitly, so drop it again.
alter table public.pending_members
  alter column payment_method drop default;

alter table public.pending_members
  drop constraint if exists pending_members_payment_method_check;

alter table public.pending_members
  add constraint pending_members_payment_method_check
  check (payment_method in ('online', 'in_person'));
