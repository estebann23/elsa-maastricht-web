                  Join / Renew Membership
                             │
                             ▼
                    ┌──────────────────┐
                    │     Next.js      │
                    │     Vercel       │
                    └────────┬─────────┘
                             │
                    create pending member
                             │
                             ▼
                    ┌──────────────────┐
                    │    Supabase      │
                    │ Member + Payment │
                    └────────┬─────────┘
                             │
                     create checkout
                             │
                             ▼
                    ┌──────────────────┐
                    │      SumUp       │
                    │                  │
                    │ iDEAL | Wero     │
                    │ Card             │
                    │ Apple Pay        │
                    │ Google Pay       │
                    └────────┬─────────┘
                             │
                          webhook
                             │
                             ▼
                    ┌──────────────────┐
                    │     Supabase     │
                    │ membership=PAID  │
                    └────────┬─────────┘
                             │
                       async job
                             │
                             ▼
                    ┌──────────────────┐
                    │   WalletWallet   │
                    │                  │
                    │     pkpass       │
                    └────────┬─────────┘
                             │
                             ▼
                    Member gets wallet
                         membership