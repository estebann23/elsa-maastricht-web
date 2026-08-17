-- Wallet membership cards issued through WalletWallet.
--
-- RUN THIS ON THE LIVE DATABASE (Supabase Dashboard -> SQL Editor).
-- Safe to run more than once.
--
-- One row per member, created the first time a paid member opens the success
-- page. Without it every reload would mint a brand-new card: it would burn
-- WalletWallet quota and, worse, leave the member holding several different
-- cards with different serials, only the newest of which we could ever update.

create table if not exists public.member_passes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Nullable and set to null on delete, matching confirmed_members and
  -- payment_attempts: clearing out old sign-ups must not destroy the record of
  -- a card we issued, since the serial is the only handle for updating or
  -- revoking it later.
  pending_member_id uuid references public.pending_members(id) on delete set null,

  -- Kept alongside the reference so an issued card stays traceable to a person
  -- even after the pending row is cleared.
  email text not null,

  -- WalletWallet's id for the pass. The handle for PUT (update) and DELETE
  -- (revoke), and the capability in our own Apple download URL — it is an
  -- unguessable UUID, which is the same model WalletWallet uses for its own
  -- hosted /p/<serial> page.
  serial_number text not null,

  -- Long-lived Google Wallet save link (a signed JWT URL, ~3KB).
  google_save_url text not null,

  -- The signed Apple .pkpass, base64. Stored because WalletWallet exposes no
  -- endpoint to fetch the binary back by serial, and we need to serve it
  -- ourselves to offer a real "Add to Apple Wallet" button.
  apple_pass_base64 text not null,

  -- WalletWallet's own device-aware install page, kept as a fallback.
  share_url text
);

-- One card per member. Also the conflict target that makes card creation safe
-- under concurrent success-page loads: the loser of the race re-reads the
-- winner's row instead of issuing a second card.
create unique index if not exists member_passes_member_idx
  on public.member_passes (pending_member_id);

-- The Apple download route looks a card up by serial, so this must be fast and
-- unique.
create unique index if not exists member_passes_serial_idx
  on public.member_passes (serial_number);

-- Keep updated_at honest.
drop trigger if exists member_passes_set_updated_at on public.member_passes;
create trigger member_passes_set_updated_at
  before update on public.member_passes
  for each row execute function public.set_updated_at();

-- Same posture as every other table here: RLS on, no policies, so the public
-- API keys can neither read nor write. Only the service-role key inside a
-- Server Action or route handler can reach it.
alter table public.member_passes enable row level security;
