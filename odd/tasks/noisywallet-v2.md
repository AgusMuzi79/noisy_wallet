# NoisyWallet v2 redesign

## Objective
Port the Claude Design file `NoisyWallet v2.dc.html` (project `0d10390e-d4df-4a0a-9312-951064aef8f5`) into the RN app: new visuals for every screen plus the functional changes below, shipping OTA (no new native deps).

## Why
The user redesigned the app in Claude Design; v2 also reworks flows (entry sheet, undo, history grouping, month-scoped categories).

## Decisions (user, 2026-10-01)
- Hero balance stays **all-time** (`initial_balance` + all movements); running balance per row uses the same base. Gauge keeps the credited-this-month denominator.
- History **keeps long-press delete**; the undo toast is added on top.
- Category rows stay **tappable → edit-category**.
- **No light theme** (out of scope, not planned).
- Recurring credits shown as **one grouped "Ingresos fijos" row** (client-side grouping; Edge Function unchanged).
- Author filter matches the **current names** (`user1Name`/`user2Name`); no schema change.
- Defaults taken from the design (not asked): today strip always visible; category spend and "extras" list scoped to the current month.
- Kept constraints: new source amount defaults to `1` (DB check `amount > 0`); source edits persist on `onEndEditing`.

## Technical constraints
- No new native modules (OTA-shippable): no `react-native-svg`, reanimated, gesture-handler or bottom-sheet libs. Use RN `Animated`, `Modal`/absolute views, Feather + MaterialCommunityIcons.
- `SpaceMono_700Bold` comes from the already-installed `@expo-google-fonts/space-mono` (JS asset).
- Ignore the design frame bg `#0E0C13`.

## Tasks
- [x] T1 — Theme tokens + fonts: radii `R`, spacing, motion, `F.monoBold`, hover colours in `src/theme/index.ts`; load `SpaceMono_700Bold` in `app/_layout.tsx`. (route: delegated writer; tsc no new errors)
- [x] T2 — Icons: 18-icon set via `CategoryIcon` (Feather + `mci:` MaterialCommunityIcons), palette order; `add-category.tsx`, `edit-category.tsx`. (route: delegated writer; tsc no new errors)
- [ ] T3 — Context data API: `addMovement`/`addCategory` return id; expose `createdAt`; month selectors; running balance; grouped recurring credits helper.
- [ ] T4 — Pill nav: `BottomNav.tsx`, `(tabs)/_layout.tsx`.
- [ ] T5 — "Anotar" entry sheet (expense + extra income, projection, inline category create "Crear y usar") + undo toast; retire `add-expense.tsx`.
- [ ] T6 — Home: wordmark, odometer, continuous bar + ghost bite, today strip, 5 recent rows with running balance, row flash.
- [ ] T7 — Movimientos: type + author segments, day groups with net, running balance, empty state, keep long-press delete.
- [ ] T8 — Ingresos: fixed sources list, month extras list, open sheet in extra mode.
- [ ] T9 — Categorías (share bar, list by month spend, tap → edit) + Nueva categoría (preview tile, contextual back/save).
- [ ] T10 — Ajustes restyle (order, initials avatars, copy).
- [ ] T11 — Docs: CLAUDE.md (sheet, icons, tokens, v2 semantics).

## Route
Delegated direct: one bounded writer per batch (2+ non-trivial files per task). Parent verifies and reviews.

## Delivery
Forecast ~1,600 authored lines → over the ~400 budget. Strategy: work-unit commits per task on `feat/noisywallet-v2`; review slices via native RDD per ~400 lines. The user historically merges to `main` without PRs; push/PR/merge stay the user's decision.

## Checks
No test runner in the project → no RED/GREEN. Per task: `npx tsc --noEmit` (no new errors vs base; pre-existing errors in BottomNav/AppContext/notifications/supabase functions), `npx expo export --platform android --output-dir <scratch>` bundles. Final: install via OTA/preview and check on device.

## Progress
- Branch `feat/noisywallet-v2` from `feat/gauge-credited-income-ota` (`d13df32`).
- Design map produced (read-only exploration worker).

## Next step
T1–T4 (foundations) with one writer.
