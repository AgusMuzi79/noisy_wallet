# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Capa | Tecnología |
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

Copy `.env.example` to `.env.local` and fill in Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://hctxfomzedtpdpjqvfna.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## Project structure

```
app/
  _layout.tsx               Root stack — font loading, AppProvider, SplashScreen
  (tabs)/
    _layout.tsx             Tab navigator with custom BottomNav
    index.tsx               Home: balance hero + recent movements
    history.tsx             Full transaction history with filters
    income.tsx              Recurring sources + extra income form
    categories.tsx          Category grid + add new category
  add-expense.tsx           Keypad modal for logging an expense
  add-category.tsx          Name + icon + color picker for new category
  settings.tsx              Notification time + PIN/biometric toggles
src/
  theme/index.ts            Design tokens (C = colors, F = fonts, helpers)
  context/AppContext.tsx    Global state — useReducer, all actions, mock seed data
  components/BottomNav.tsx  Custom tab bar with elevated centre FAB
supabase/
  schema.sql                Full DB schema, RLS policies, default seed
  functions/
    credit-monthly-income/  Edge Function: idempotent monthly auto-credit
```

## Design system (NoisyDev)

Dark-first EVA-01 palette: violet primary `#9B7CF0`, green accent `#9FE870`, near-black bg `#16131D`.

Fonts (loaded via `@expo-google-fonts`):
- `DMSerifDisplay_400Regular` → `F.display` — display headings (Calm mode balance)
- `SpaceGrotesk_*` → `F.sans*` — UI body text
- `SpaceMono_400Regular` → `F.mono` — labels, amounts, kickers, keypad

All tokens live in `src/theme/index.ts`. Use `C.*` for colors and `F.*` for font families throughout.

Icons: `Feather` from `@expo/vector-icons` — already bundled with Expo SDK, no extra install.

## Home screen — two visual modes

The balance hero has two styles toggled by `state.style`:
- **Lab** — monospace number + blinking cursor + 24-segment gauge. Gauge color: green >50%, violet 22–50%, danger <22%.
- **Calm** — DM Serif Display number + smooth progress bar.

Balance counter animates with `Animated.timing` + cubic easing when the balance changes. Flash (amount floating up and fading) uses `Animated.parallel` on opacity + translateY.

## State management

`AppContext` (`src/context/AppContext.tsx`) is the single source of truth. All screens consume it via `useApp()`.

Balance is derived from the action history — every `ADD_MOVEMENT` adds or subtracts based on `type`. Deleting a movement recalculates accordingly. No separate balance field in production (Supabase will compute it via the `current_balance` view).

**Actions:**
- `ADD_MOVEMENT` — adds a transaction and updates balance
- `DELETE_MOVEMENT` — removes a transaction and recalculates balance
- `ADD_SOURCE` / `UPDATE_SOURCE` / `REMOVE_SOURCE` — recurring income management
- `ADD_CATEGORY` — append a custom category
- `SET_STYLE` — toggle Lab/Calm
- `SET_SETTINGS` — update notif/lock settings

## Domain model

- Balance = `settings.initial_balance` + Σ(income + recurring_credit) − Σ(expense)
- Balance can go negative — no validation blocks it
- The Edge Function credits one transaction per active `recurring_source` on the 1st of each month (idempotent — guarded by `monthly_credits` table)
- Real-time sync via Supabase Realtime on `transactions`, `recurring_sources`, `categories`, `settings`
- Authors: `'Agus'` | `'Juli'` — hardcoded strings, no auth system

## Key constraints

- Currency: ARS only, nominal amounts, no conversion logic
- `settings` table is a singleton (always `id = 1`)
- The cron runs at 03:05 UTC (00:05 ART). Edge Function is also called defensively from the app on first open each day

## Supabase setup (one-time)

1. Run `supabase/schema.sql` in the SQL editor (creates tables, RLS, seed data).
2. Enable **pg_cron** and **pg_net** extensions in the dashboard.
3. Deploy the Edge Function: `npx supabase functions deploy credit-monthly-income`.
4. Uncomment and run the `cron.schedule(...)` block at the bottom of `schema.sql`.

## Pending work

- Wire all screens to Supabase (replace `AppContext` mock state with real queries + Realtime subscriptions)
- Implement `expo-local-authentication` PIN/biometric gate on app open
- Set up `expo-notifications` scheduled reminder
- Configure EAS for production builds
