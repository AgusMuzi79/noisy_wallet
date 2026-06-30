# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Capa | Tecnología |
|---|---|
| Mobile | Expo SDK 56 + React Native 0.85 + TypeScript |
| Routing | Expo Router v56 (file-based, `app/` directory) |
| Backend | Supabase (PostgreSQL + Realtime subscriptions) |
| Cron job | Supabase Edge Function (`supabase/functions/credit-monthly-income/`) |
| Biometric + PIN | `expo-local-authentication` + `expo-secure-store` |
| Push notifications | `expo-notifications` — daily reminder scheduled via `src/lib/notifications.ts` |
| Builds | Expo EAS (`eas.json`) — dev/preview/production profiles |

## Commands

```bash
npm start                    # Start Metro (dev client — NOT Expo Go)
npx expo start --clear       # Start with fresh Metro cache (use when routes/modules misbehave)
npm run android              # Launch on Android emulator
```

> The app uses a **dev client** APK installed via EAS. Changes to JS are hot-reloaded; changes to native modules require a new EAS build.

## Environment setup

Copy `.env.example` to `.env.local` and fill in Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://hctxfomzedtpdpjqvfna.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

`.npmrc` has `legacy-peer-deps=true` — required to resolve `@expo/metro-runtime` conflict between `expo` and `expo-router`.

## Project structure

```
app/
  _layout.tsx               Root stack — fonts, AppProvider, SplashScreen, AuthGate
  onboarding.tsx            First-launch name setup (shown when user1Name is empty)
  set-pin.tsx               PIN creation modal (modal, slide_from_bottom)
  settings.tsx              Ajustes: names, notification time, PIN/biometric toggles
  add-expense.tsx           Keypad modal for logging an expense
  add-category.tsx          Name + icon + color picker for new category
  (tabs)/
    _layout.tsx             Tab navigator with custom BottomNav
    index.tsx               Home: balance hero (Lab mode) + recent movements
    history.tsx             Full transaction history with filters
    income.tsx              Recurring sources + extra income form
    categories.tsx          Category grid + add new category
src/
  theme/index.ts            Design tokens (C = colors, F = fonts, fmtARS, fmtMovDate, hexAlpha)
  context/AppContext.tsx    Global state — Supabase queries + Realtime, async action functions
  components/BottomNav.tsx  Custom tab bar with elevated centre FAB
  components/LockScreen.tsx PIN keypad + biometric unlock screen
  lib/supabase.ts           Supabase client (anon key, AsyncStorage session)
  lib/notifications.ts      expo-notifications helpers (request, schedule, cancel daily reminder)
supabase/
  schema.sql                Full DB schema, RLS policies, default seed
  functions/
    credit-monthly-income/  Edge Function: idempotent monthly auto-credit
eas.json                    EAS build profiles (development/preview/production)
```

## Design system (NoisyDev)

Dark-first EVA-01 palette: violet primary `#9B7CF0`, green accent `#9FE870`, near-black bg `#16131D`.

Fonts (loaded via `@expo-google-fonts`):
- `DMSerifDisplay_400Regular` → `F.display` — display headings
- `SpaceGrotesk_*` → `F.sans*` — UI body text
- `SpaceMono_400Regular` → `F.mono` — labels, amounts, kickers, keypad

All tokens live in `src/theme/index.ts`. Use `C.*` for colors and `F.*` for font families throughout.
Use `fmtARS(n)` for ARS amounts and `fmtMovDate(isoDate)` to display dates as 'Hoy'/'Ayer'/'D mmm'.

Icons: `Feather` from `@expo/vector-icons` — already bundled with Expo SDK, no extra install.
`LockScreen.tsx` uses `MaterialCommunityIcons` (also from `@expo/vector-icons`).
Category icons are stored as Feather icon name strings (e.g. `'shopping-cart'`), not emojis.

## Home screen — Lab mode (permanent)

The balance hero is permanently in **Lab** style: monospace number + blinking cursor + 24-segment gauge.
- Gauge color: green >50%, violet 22–50%, danger <22%.
- There is no Calm mode toggle — Lab is the only visual.
- Balance counter animates with `Animated.timing` + cubic easing when balance changes.
- Flash (amount floating up and fading) uses `Animated.parallel` on opacity + translateY.

## Auth / onboarding gate

`AuthGate` in `_layout.tsx` renders before the Stack:
1. `loading` → null (splash screen still visible)
2. `!state.user1Name` → `<OnboardingScreen />` (first launch only, intercepts full screen)
3. `state.lockPin && locked` → `<LockScreen />` (PIN/biometric gate)
4. Otherwise → `{children}` (normal app)

Re-locks when app goes to background if `lockPin` is enabled.

## State management

`AppContext` (`src/context/AppContext.tsx`) is the single source of truth, backed by Supabase. All screens consume it via `useApp()`.

On mount, the provider fetches all tables in parallel and sets up a Realtime channel (`billetera-sync`) that refreshes the relevant slice of state on any `postgres_changes` event.

**Context API — async functions (not dispatch):**
- `addMovement(mv)` — inserts into `transactions`, refetches
- `deleteMovement(id)` — deletes from `transactions`, refetches
- `addSource(s)` / `updateSource(id, patch)` / `removeSource(id)` — recurring sources CRUD
- `addCategory(c)` — inserts into `categories`, refetches
- `saveSettings(patch)` — optimistic local update + writes to `settings` table; reschedules notification if `notifEnabled`/`notifHour` changed
- `setBio(bio)` — persists biometric preference to AsyncStorage (device-local)
- `setUserNames(user1, user2)` — persists both names to AsyncStorage (device-local)

Device-local (AsyncStorage): `user1Name`, `user2Name`, `bio`, `style`.
Supabase-synced: everything else (`notifEnabled`, `notifHour`, `lockPin`, transactions, categories, etc.).

## Domain model & types

```typescript
Category        { id: string (UUID), name, icon, color }
Movement        { id: string (UUID), type, catId?: string (UUID), amount, author, date (ISO YYYY-MM-DD), note }
RecurringSource { id: string (UUID), name, amount, active }
```

- Balance = `settings.initial_balance` + Σ(income + recurring_credit) − Σ(expense), computed client-side
- Balance can go negative — no validation blocks it
- `catId` links to `Category.id` (UUID). Lookup: `categories.find(c => c.id === m.catId)`
- `author` is a free-text field — no DB constraint. Values come from `state.user1Name` / `state.user2Name` (set during onboarding, editable in settings)
- The Edge Function credits one transaction per active `recurring_source` on the 1st of each month (idempotent — guarded by `monthly_credits` table)

## Key constraints

- Currency: ARS only, nominal amounts, no conversion logic
- `settings` table is a singleton (always `id = 1`)
- The cron runs at 03:05 UTC (00:05 ART)
- `income.tsx` SourceCard uses local state for name/amount fields and persists on `onEndEditing` to avoid a DB write on every keystroke
- PIN is stored in `expo-secure-store` under key `billetera_pin`
- User names are stored in AsyncStorage under `@billetera:user1` / `@billetera:user2`

## Supabase setup (one-time)

1. Run `supabase/schema.sql` in the SQL editor (creates tables, RLS, seed data).
2. If the DB existed before the schema update, run:
   ```sql
   ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#8B83A6';
   ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_author_check;
   ```
3. Enable **pg_cron** and **pg_net** extensions in the dashboard.
4. Deploy the Edge Function: `npx supabase functions deploy credit-monthly-income`.
5. Uncomment and run the `cron.schedule(...)` block at the bottom of `schema.sql`.

## EAS builds

```bash
eas build --profile development --platform android   # Dev client APK
eas build --profile preview --platform android        # Preview APK
eas build --profile production --platform android     # Production AAB
```

## Gotchas

- **Duplicate route files**: The initial scaffold created placeholder stubs in `app/(tabs)/` (e.g. `settings.tsx`, `add-income.tsx`). These were deleted. If a screen appears blank or shows wrong content, run `Get-ChildItem app -Recurse` to check for accidental duplicate route files before touching any component code.
- **Metro cache**: If routes misbehave after adding/deleting files, run `npx expo start --clear`.
- **Dev client rebuild**: Native module changes (new Expo plugins, `app.json` plugin array) require a new EAS dev build — JS-only changes just need a bundle reload.
