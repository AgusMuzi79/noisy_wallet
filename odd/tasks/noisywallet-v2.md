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
- [x] T1 — Theme tokens + fonts: radii `R`, spacing, motion, `F.monoBold`, hover colours in `src/theme/index.ts`; load `SpaceMono_700Bold` in `app/_layout.tsx`. (commit `6ccee35`; route: delegated writer; tsc no new errors)
- [x] T2 — Icons: 18-icon set via `CategoryIcon` (Feather + `mci:` MaterialCommunityIcons), palette order; `add-category.tsx`, `edit-category.tsx`. (commit `1757d89`; route: delegated writer; tsc no new errors)
- [x] T3 — Context data API: `addMovement`/`addCategory` return id; expose `createdAt`; month selectors; running balance; grouped recurring credits helper. (commit `f18af69`; route: delegated writer; tsc no new errors, TS2440 fixed; running-balance/grouping checked with a node script)
- [x] T4 — Pill nav: `BottomNav.tsx`, `(tabs)/_layout.tsx`. (commit `b037fbd`; route: delegated writer; tsc no new errors, bottom-tabs import error removed; expo export android bundles)
- [x] T5 — "Anotar" entry sheet (expense + extra income, projection, inline category create "Crear y usar") + undo toast; retire `add-expense.tsx`. (commit `97bf06f`; route: delegated writer; tsc no new errors (8 base lines), expo export android bundles, `rg add-expense app src` empty)
- [x] T6 — Home: wordmark, odometer, continuous bar + ghost bite, today strip, 5 recent rows with running balance, row flash. (commit `9287f79`; route: delegated writer; tsc no new errors (8 base lines), expo export android bundles)
- [x] F1 — fix(dates): device-local `localISODate`/`localMonthPrefix` replace UTC `toISOString()` in EntrySheet, Home, income, `fmtMovDate`, AppContext month scope. Reason: review advisory. (commit `6c914a4`; route: delegated writer; tsc no new errors (8 base lines), expo export android bundles, `rg toISOString app src` → only the warning comment in theme)
- [x] F2 — fix(sheet): close-animation callback only hides the modal if the sheet is still closed; `deleteMovement` throws on DB error, UndoToast/history show an Alert. Reason: review advisory. (commit `083c434`; route: delegated writer; tsc no new errors (8 base lines))
- [x] T7 — Movimientos: type + author segments, day groups with net, running balance, empty state, keep long-press delete. (commit `9d59dad`; route: delegated writer; tsc no new errors (8 base lines), expo export android bundles)
- [x] T8 — Ingresos: fixed sources list, month extras list, open sheet in extra mode. (commit `78c2798`; route: delegated writer; tsc no new errors (8 base lines))
- [x] T9 — Categorías (share bar, list by month spend, tap → edit) + Nueva categoría (preview tile, contextual back/save). (commit `c37b519`; route: delegated writer; tsc no new errors (8 base lines), expo export android bundles)
- [x] T10 — Ajustes restyle (order, initials avatars, copy). (commit `3d592ae`; route: delegated writer; tsc no new errors (8 base lines))
- [x] T11 — Docs: CLAUDE.md (sheet, icons, tokens, v2 semantics). (commit `adf8137`; route: delegated writer; structural readback; final expo export android bundles)

## Route
Delegated direct: one bounded writer per batch (2+ non-trivial files per task). Parent verifies and reviews.

## Delivery
Forecast ~1,600 authored lines → over the ~400 budget. Strategy: work-unit commits per task on `feat/noisywallet-v2`; review slices via native RDD per ~400 lines. The user historically merges to `main` without PRs; push/PR/merge stay the user's decision.

## Checks
No test runner in the project → no RED/GREEN. Per task: `npx tsc --noEmit` (no new errors vs base; pre-existing errors in BottomNav/AppContext/notifications/supabase functions), `npx expo export --platform android --output-dir <scratch>` bundles. Final: install via OTA/preview and check on device.

## Progress
- Branch `feat/noisywallet-v2` from `feat/gauge-credited-income-ota` (`d13df32`).
- Design map produced (read-only exploration worker).

- T1–T4 done (foundations). Pill nav is absolutely positioned; tab screens keep their 110px bottom padding until restyled in T6–T9.
- `addCategory` now throws on insert error; `add-category.tsx` shows an Alert instead of silently going back.

- T5: sheet state (mode, draft, undo toast, `lastAdded`) lives in `src/context/SheetContext.tsx`; `EntrySheet` + `UndoToast` render once in `app/_layout.tsx`. "Nueva" tile closes the sheet and pushes `/add-category?from=sheet`; add-category reopens the sheet on unmount (save, back or hardware back) keeping the draft and selecting the new category.
- T6: `Odometer` and `MovementRow` extracted for reuse (T7). Ghost bite triggers on any ratio drop (own entry, partner's Realtime entry or undo of an income). `useReduceMotion` hook in theme.

- T7: grouped "Ingresos fijos" rows long-press delete all their member credits (one confirm). Author filter hides credits (no author); segment hidden when `user2Name` is empty.
- T8: a zero/empty source amount reverts instead of writing (DB check `amount > 0`).
- T9: share bar / rows only include active categories; subtitle uses `monthSpent` (all expenses this month). Editor screens duplicate the form (no new shared component file was in scope).
- T10: settings copy "¿Anotaste…" changed in the UI only; the push body in `src/lib/notifications.ts` still says "¿Registraste…" (out of edit scope).

## Next step
Parent review of F1–T11; optionally align the notification body copy; then OTA/preview install and on-device check.
