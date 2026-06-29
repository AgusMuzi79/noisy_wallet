# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Layer | Technology |
|---|---|
| Mobile | Expo SDK 56 + React Native 0.85 + TypeScript |
| Routing | Expo Router v4 (file-based, `app/` directory) |
| Backend | Supabase (PostgreSQL + Realtime subscriptions) |
| Cron job | Supabase Edge Function (`supabase/functions/credit-monthly-income/`) |
| Biometric + PIN | `expo-local-authentication` + `expo-secure-store` |
| Push notifications | `expo-notifications` (via EAS) |
| Builds | Expo EAS |

## Commands

```bash
npm start           # Start Expo dev server (scan QR with Expo Go)
npm run android     # Launch on Android emulator
npm run ios         # Launch on iOS simulator (macOS only)
```

## Environment setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Project structure

```
app/                        Expo Router screens
  _layout.tsx               Root stack (auth gate goes here)
  (tabs)/
    _layout.tsx             Bottom tab navigator
    index.tsx               Main screen: balance + transaction history
    settings.tsx            Settings: categories, notifications, PIN, recurring sources
  add-expense.tsx           Modal: new expense
  add-income.tsx            Modal: new income
src/
  lib/supabase.ts           Supabase client (singleton)
  types/index.ts            Shared TypeScript types
supabase/
  schema.sql                Full DB schema + default seed data
  functions/
    credit-monthly-income/  Edge Function: auto-credit recurring income on the 1st
```

## Domain model

Single running wallet balance for 2 people (no user accounts — just `author` labels on transactions).

- Balance = `settings.initial_balance` + SUM(income + recurring_credit transactions) − SUM(expense transactions)
- On the 1st of each month, the Edge Function credits one transaction per active `recurring_source` (idempotent — guarded by `monthly_credits` table).
- Balance can go negative; no validation blocks it.
- Real-time sync via Supabase Realtime channels on `transactions`, `recurring_sources`, `categories`, `settings` tables.

## Key constraints

- Currency: ARS only, nominal amounts, no conversion logic.
- `settings` table is a singleton (always `id = 1`).
- The cron runs at 03:05 UTC (00:05 ART). The Edge Function is also called defensively from the mobile app on first open each day to handle missed runs.
- Authors: `'agus'` | `'novia'` — hardcoded strings, no auth system.

## Supabase setup

1. Create a new Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Enable **pg_cron** and **pg_net** extensions in the Supabase dashboard.
4. Deploy the Edge Function: `npx supabase functions deploy credit-monthly-income`.
5. Uncomment and run the `cron.schedule(...)` block at the bottom of `schema.sql`.
