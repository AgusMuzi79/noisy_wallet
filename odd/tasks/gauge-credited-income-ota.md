# Gauge based on credited income + OTA updates

## Objective
Make the home "saldo restante" gauge measure against income actually received this month, and enable OTA (EAS Update) so JS fixes reach the phones without a new APK.

## Problem / why
- Gauge denominator used the *current* active source amounts. When a source amount changes after the month's credit ran, the gauge drops below 100% with no expenses (Oct 2026: credited $1.003.000 with old amounts, sources updated afterwards → 93%). Adding the difference as extra income counts it twice in the denominator.
- No `expo-updates`: every JS fix needs a new preview APK.

## Scope
- `app/(tabs)/index.tsx` gauge calculation.
- `expo-updates` dependency, `app.json` updates/runtimeVersion config, `eas.json` channels.
- Out of scope: custom app icon.

## Tasks
- [ ] T1 — Gauge denominator = this month's `recurring_credit` + `income` movements; fall back to active sources when no credit landed yet. Route: inline (1 file).
- [ ] T2 — Install `expo-updates`, configure `updates.url`, `runtimeVersion` (appVersion policy) and EAS channels per profile; document OTA workflow in CLAUDE.md. Route: inline (mechanical config).
- [ ] T3 — Launch a new preview build (embeds expo-updates + T1).

## Acceptance criteria
- Oct 2026 data (credit 1.003.000 + extra income diff, no expenses) shows 100%.
- Before the month's credit lands, gauge still uses active sources.
- `npx expo config` resolves `updates.url` and `runtimeVersion`; `tsc --noEmit` passes.

## Checks
- No test runner in the project → no RED/GREEN; checks are `npx tsc --noEmit` and `npx expo config --type public`.

## Progress
- Branch: `feat/gauge-credited-income-ota`
