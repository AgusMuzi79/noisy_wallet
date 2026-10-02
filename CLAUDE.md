# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

| Capa | Tecnología |
|---|---|
| Mobile | Expo SDK 56 + React Native 0.85 + TypeScript |
| Routing | Expo Router v56 (file-based, `app/` directory) |
| Backend | Supabase (PostgreSQL + Realtime subscriptions) |
| Cron job | Supabase Edge Function (`supabase/functions/credit-monthly-income/`) |
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
  _layout.tsx               Root stack — fonts, AppProvider, SheetProvider, AuthGate; renders EntrySheet + UndoToast once
  onboarding.tsx            First-launch name setup (shown when user1Name is empty)
  settings.tsx              Ajustes: reminder, names
  add-category.tsx          New category (preview tile, icon grid, colours); `?from=sheet` returns to the sheet
  edit-category.tsx         Edit/delete an existing category
  (tabs)/
    _layout.tsx             Tab navigator with custom BottomNav
    index.tsx               Home: odometer balance, gauge, today strip, recent movements
    history.tsx             Movimientos: type/author filters, day groups, long-press delete
    income.tsx              Fixed sources + this month's extras (opens the sheet in extra mode)
    categories.tsx          Categories ranked by current-month spend
src/
  theme/index.ts            Tokens (C, F, R, S, M), useReduceMotion, fmtARS, fmtMovDate, localISODate, hexAlpha
  context/AppContext.tsx    Global state — Supabase queries + Realtime, async actions, derived month totals
  context/SheetContext.tsx  Entry sheet mode/draft, undo toast, lastAdded (Home row flash)
  types/index.ts            Shared types (Category, Movement, RecurringSource)
  components/EntrySheet.tsx "Anotar" bottom sheet (expense / extra income) with keypad + projection
  components/UndoToast.tsx  "Deshacer" toast after an entry (deletes it)
  components/Odometer.tsx   Rolling-digit balance
  components/MovementRow.tsx Ledger row with running balance (Home + Movimientos)
  components/CategoryIcon.tsx Category icon renderer + CATEGORY_ICONS / CATEGORY_COLORS
  components/BottomNav.tsx  Floating pill nav with centre "Anotar" FAB
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
- `SpaceMono_400Regular` / `SpaceMono_700Bold` → `F.mono` / `F.monoBold` — labels, amounts, kickers, keypad

All tokens live in `src/theme/index.ts`: `C` colors, `F` fonts, `R` radii, `S` spacing, `M` motion (easings + durations). Never hard-code colors. Dark only — no light theme.
Use RN `Animated` only (no reanimated/gesture libs — OTA-shippable) and respect `useReduceMotion()`.
Use `fmtARS(n)` for ARS amounts and `fmtMovDate(isoDate)` to display dates as 'Hoy'/'Ayer'/'D mmm'.
**Dates are device-local**: build `YYYY-MM-DD` with `localISODate()` and month prefixes with `localMonthPrefix()`. Never `toISOString()` — it is UTC and dates entries as tomorrow after 21:00 ART.

Icons: `Feather` + `MaterialCommunityIcons` from `@expo/vector-icons` (bundled with Expo).
Category icons are stored as strings: plain names are Feather (`'home'`), `mci:` names are MaterialCommunityIcons (`'mci:paw'`). The picker set and palette are `CATEGORY_ICONS` / `CATEGORY_COLORS` in `CategoryIcon.tsx`.
Always render category icons through `<CategoryIcon>` (never `<Feather>` directly); it falls back to an emoji `<Text>` for legacy DB rows.

## Entry sheet + undo

- Expenses and extra incomes are entered in `EntrySheet`, opened from anywhere via `useSheet().openSheet('expense' | 'extra', { catId?, keepDraft? })` (FAB, Home today strip, Ingresos). There is no `add-expense` route.
- The draft lives in `SheetContext`, so the sheet's "Nueva" tile can detour to `/add-category?from=sheet`; that screen reopens the sheet on exit, selecting the new category.
- After saving, `UndoToast` shows "Deshacer" for 5 s (deletes the movement) and Home flashes the new row (`lastAdded`).

## Home semantics

- Hero balance is **all-time** (`initial_balance` + every movement), shown with `Odometer`.
- Gauge ratio = balance / `monthIncome` (credited fixed income this month, or active sources until credited, + this month's extras). Colors: green >50%, violet 22–50%, danger <22%. A red ghost holds the previous ratio briefly when it drops.
- Rows show the all-time running balance after each movement (`runningBalance`); recurring credits of the same date collapse into one "Ingresos fijos" row (`groupRecurringCredits`, client-side only).
- Category spend (Categorías) and the extras list (Ingresos) are scoped to the current month.

## Auth / onboarding gate

`AuthGate` in `_layout.tsx` renders before the Stack:
1. `loading` → null (splash screen still visible)
2. `!state.user1Name` → `<OnboardingScreen />` (first launch only, intercepts full screen)
3. Otherwise → `{children}` (normal app)

There is no PIN/biometric lock: it was removed in October 2026 (unnecessary for an expense app). The `settings.lock_enabled` DB column still exists but is no longer read or written.

## State management

`AppContext` (`src/context/AppContext.tsx`) is the single source of truth, backed by Supabase. All screens consume it via `useApp()`.

On mount, the provider fetches all tables in parallel and sets up a Realtime channel (`billetera-sync`) that refreshes the relevant slice of state on any `postgres_changes` event.

**Context API — async functions (not dispatch):**
- `addMovement(mv)` — inserts into `transactions`, refetches, resolves to the new id (throws on error)
- `deleteMovement(id)` — deletes from `transactions`, refetches (throws on error)
- Derived: `monthIncome`, `monthExtraIncome`, `monthSpent`, `runningBalance`, `displayMovements`
- `addSource(s)` / `updateSource(id, patch)` / `removeSource(id)` — recurring sources CRUD
- `addCategory(c)` / `updateCategory(id, patch)` / `deleteCategory(id)` — categories CRUD (`addCategory` resolves to the new id). `edit-category.tsx` navigates back via a `useEffect` when the category disappears, so `deleteCategory` must not call `router.back()` itself
- `triggerMonthlyCredit()` — internal; calls the Edge Function on day 1 of the month (on mount and on foreground) as a fallback to the cron
- `setStyle(style)` — device-local visual style preference
- `saveSettings(patch)` — optimistic local update + writes to `settings` table; reschedules notification if `notifEnabled`/`notifHour` changed
- `setUserNames(user1, user2)` — persists both names to AsyncStorage (device-local)

Device-local (AsyncStorage): `user1Name`, `user2Name`, `style`.
Supabase-synced: everything else (`notifEnabled`, `notifHour`, transactions, categories, etc.).

## Domain model & types

```typescript
Category        { id: string (UUID), name, icon, color }
Movement        { id: string (UUID), type, catId?: string (UUID), amount, author, date (local YYYY-MM-DD), note, createdAt }
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
- `recurring_sources.amount` has a DB check `amount > 0` — new sources default to `1`, never `0`
- The cron runs at 03:05 UTC (00:05 ART), schedule `5 3 1 * *`
- `income.tsx` SourceRow uses local state for name/amount fields and persists on `onEndEditing` to avoid a DB write on every keystroke (an empty/zero amount reverts)
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
5. Create the Vault secrets `supabase_url` and `service_role_key` (legacy service_role JWT), then uncomment and run the `cron.schedule(...)` block at the bottom of `schema.sql`. The job reads both values from `vault.decrypted_secrets` — `current_setting('app.*')` does not work on Supabase.
6. Grant the Edge Function's `service_role` access:
   ```sql
   GRANT SELECT ON recurring_sources TO service_role;
   GRANT SELECT, INSERT ON monthly_credits TO service_role;
   GRANT INSERT ON transactions TO service_role;
   ```

### Operations notes

- **Free tier pauses the project after inactivity.** While paused the app can't reach the DB and **pg_cron does not run**, so monthly credits are skipped. After restoring, check `monthly_credits` and credit any missed months manually.
- **Cron failed with `unrecognized configuration parameter "app.supabase_url"`** (found 2026-10-01): the original job used `current_setting('app.*')`, which was never set. It was rescheduled to read from Vault. Missed Aug/Sep 2026 credits were likely caused by this, not only by the pause.
- Verify the cron with `SELECT jobname, schedule, active FROM cron.job;` and check runs in `cron.job_run_details` (`status`, `return_message`). The HTTP result of a call lands in `net._http_response`.
- The Edge Function credits the **current** month regardless of the day and is idempotent, so a missed run can be recovered by running the job's `net.http_post(...)` manually within the same month.
- The anon key cannot `DELETE` from `monthly_credits` (permission denied) — clean it from the Supabase SQL editor. `transactions` can be cleared through the anon key.
- Data was reset for a fresh start in October 2026; categories, settings and recurring sources were kept.

## EAS builds

```bash
eas build --profile development --platform android   # Dev client APK
eas build --profile preview --platform android        # Preview APK
eas build --profile production --platform android     # Production AAB
```

The app is only for two people, so the **preview APK is the distribution channel** — a production build is intentionally not planned. App icon changes are embedded in the APK and need a new preview build.

### OTA updates (EAS Update)

`expo-updates` is configured: each build profile maps to a channel of the same name (`eas.json`), and `runtimeVersion` uses the `appVersion` policy (runtime = `expo.version` in `app.json`).

```bash
eas update --channel preview --environment preview --message "describe the change"   # ship JS/asset changes to installed preview APKs
```

- JS and asset changes ship via OTA; the app downloads the update on launch and applies it on the **next** launch.
- Native changes (new native module, plugin, permission, icon, `app.json` native config) need a new preview build **and** a bump of `expo.version` — otherwise an OTA could reach a binary that lacks the native code.
- Only APKs built after `expo-updates` was added (Oct 2026) receive OTA updates.
- `expo-local-authentication` and `expo-secure-store` remain installed but unused since the PIN/biometric lock was removed (shipped OTA). On the next native rebuild, uninstall both together with their `app.json` plugin entries and biometric permissions, and bump `expo.version`.

## Gotchas

- **Duplicate route files**: The initial scaffold created placeholder stubs in `app/(tabs)/` (e.g. `settings.tsx`, `add-income.tsx`). These were deleted. If a screen appears blank or shows wrong content, run `Get-ChildItem app -Recurse` to check for accidental duplicate route files before touching any component code.
- **Metro cache**: If routes misbehave after adding/deleting files, run `npx expo start --clear`.
- **Dev client rebuild**: Native module changes (new Expo plugins, `app.json` plugin array) require a new EAS dev build — JS-only changes just need a bundle reload.
