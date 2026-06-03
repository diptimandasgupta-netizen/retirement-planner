# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # run ESLint
```

No test suite is configured.

## Stack

- **Next.js 16.2.6** (App Router) with React 19 and TypeScript 5
- **Tailwind CSS v4** — uses `@tailwindcss/postcss` plugin; no `tailwind.config` file
- **Zustand v5** for global state
- **Recharts v3** for all charts
- **lucide-react v1** for icons

> Next.js 16 has breaking changes from v14/v15. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`.

## Architecture

The app is a single-page retirement calculator with no backend. All computation runs client-side.

### Data flow

```
InputPanel (user edits)
  → useRetirementStore.setInputs()
  → useRetirementCalc (debounced 300 ms)
  → useRetirementStore.computeResults()
  → lib/retirement/calculations/* (pure functions)
  → results stored in Zustand
  → output components read from store
```

Monte Carlo is opt-in and runs asynchronously via `setTimeout` to avoid blocking the UI. It is triggered separately from `computeResults` via `toggleMonteCarlo`.

### Key files

| Path | Purpose |
|---|---|
| `src/lib/retirement/types.ts` | All shared TypeScript interfaces (`RetirementInputs`, `YearlyDataPoint`, `FIREMetrics`, etc.) |
| `src/lib/retirement/constants.ts` | `DEFAULTS`, multipliers, `USD`/`USDM` formatters |
| `src/lib/retirement/data/locations.ts` | 150+ COLA locations (all 50 US states + international); `getJointRetirementAge()` helper |
| `src/lib/retirement/taxEstimate.ts` | Tax estimation: 401(k) pre-tax, Roth IRA post-tax, FICA, state tax; `CONTRIBUTION_LIMITS` |
| `src/lib/retirement/calculations/portfolioGrowth.ts` | Year-by-year accumulation/withdrawal model; exports `getJointRetirementAge()` |
| `src/lib/retirement/calculations/fireCalculations.ts` | FIRE numbers (lean/regular/fat) with tier expense scaling |
| `src/lib/retirement/calculations/withdrawalRates.ts` | SWR analysis across 3–5% rates |
| `src/lib/retirement/calculations/monteCarlo.ts` | 1 000-simulation Monte Carlo with percentile bands |
| `src/lib/retirement/calculations/suggestedRetirement.ts` | "Retire When?" engine — finds earliest viable retirement age per tier |
| `src/store/retirementStore.ts` | Single Zustand store: inputs → results → Monte Carlo; `importVersion` counter for CSV import remount |
| `src/hooks/useRetirementCalc.ts` | Debounced auto-recompute on input change |
| `src/components/retirement/RetirementPlanner.tsx` | Root layout: sticky `InputPanel` + tabbed output panel |
| `src/components/retirement/ImportExport.tsx` | CSV import/export; bumps `importVersion` after import to force InputPanel remount |
| `src/components/retirement/inputs/InputPanel.tsx` | All input sections; receives `key={importVersion}` to remount on CSV import |
| `src/components/retirement/inputs/IncomeBreakdown.tsx` | Income + 401k/Roth/Other; `IncomeRow` defined outside form to prevent focus loss |
| `src/components/retirement/inputs/SavingsBreakdown.tsx` | Cash / Investments / Other Assets breakdown |
| `src/components/retirement/inputs/ExpensesBreakdown.tsx` | Pre/post-retirement expense categories + mortgages |
| `src/components/retirement/inputs/ChildExpensesSelector.tsx` | 10 child expense categories with checkboxes + sliders |
| `src/components/retirement/inputs/LocationSelector.tsx` | Dual location picker (current vs retirement); COL impact display |
| `src/components/retirement/outputs/SuggestedRetirement.tsx` | "Retire When?" tab with age timeline (You / Spouse / FIRE markers) |
| `src/components/retirement/outputs/SummaryCards.tsx` | Gradient metric cards |

### Calculation conventions

- All monetary inputs are in **today's dollars**; the model inflates them internally.
- `expectedReturnRate` and `inflationRate` are **decimal fractions** (e.g. `0.07`).
- Real return is computed as `(1 + nominal) / (1 + inflation) - 1` (Fisher equation).
- The 4% SWR rule is the baseline for corpus-needed calculations; FIRE panels expose 3–5% alternatives.
- Household expense multipliers: `single = 1.0`, `spouse = 1.6`, `family = 2.0 + 0.15 × numChildren` (capped at 3.5).
- Monte Carlo uses `returnStdDev = 0.12` and `inflationStdDev = 0.01` (see `MONTE_CARLO` constant).
- FIRE tiers: Lean = 0.8× expenses × 20, Regular = 1.0× × 25, Fat = 1.25× × 33.
- **Joint retirement age** (couples): `max(retirementAge, currentAge + (spouseRetirementAge − spouseAge))` — used for all "value at retirement" metrics. Exported as `getJointRetirementAge(inputs)` from `portfolioGrowth.ts`.

### Location / COLA system

- `src/lib/retirement/data/locations.ts` holds all locations with `colIndex` (100 = US average), `stateTaxRate`, `taxesSocialSecurity`, `healthcareMultiplier`.
- `relativeLocationFactor(current, retirement)` = `(retirementCOL / currentCOL) × taxGrossUp` — applied to all retirement expense calculations.
- Groups: **United States** (all 50 states + national average), **India**, **Caribbean** (incl. US Virgin Islands), **Europe** (incl. UK, Iceland), **Asia** (incl. Indonesia), **Pacific** (Australia, New Zealand), **Latin America**.
- Location IDs: US states use 2-letter codes (`fl`, `ny`, `ca`, `al`, etc.); international use country codes (`gb`, `au`, `nz`, `idn`, `pt`, etc.). Note: `al` = Alabama, `alb` = Albania; `pa` = Pennsylvania, `pam` = Panama.

### CSV Import / Export

- Schema defined in `FIELDS` array in `ImportExport.tsx` — single source of truth for template, export, and import.
- Sections numbered 1–16 matching the UI input order exactly.
- Percent fields stored as plain numbers (e.g. `7` for 7%) — divided by 100 on import.
- Properties as dynamic `property_N_label / currentValue / appreciationRate / sellAtRetirement` rows.
- **Import remount fix**: after `setInputs()`, `bumpImportVersion()` is called. `InputPanel` receives `key={importVersion}`, forcing a full remount so all `useState` initializers re-run with fresh store values. Without this, breakdown components (Savings, Income, Expenses, Children) would retain stale local state.

### Known patterns & gotchas

- **Inline component definitions cause focus loss**: never define a React component (function that returns JSX) inside another component's render body — React will remount it on every render, clearing input focus. See `IncomeRow` in `IncomeBreakdown.tsx` as the correct pattern (defined at module level, props passed explicitly).
- **`crypto.randomUUID()` SSR**: use `typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)` for IDs in components that render server-side.
- **Hydration warning**: `suppressHydrationWarning` on `<html>` in `layout.tsx` suppresses browser-extension attribute injection.
- **Passive income sync**: `IncomeBreakdown` uses `useRef` + `useEffect` to sync `postRetirementMonthlyIncome` to the store without causing infinite render loops.
- **Already Retired toggle**: saves previous `retirementAge` in a `useRef` before locking it to `currentAge`; restores on toggle-off.

### Path alias

`@/` maps to `src/` (configured in `tsconfig.json`).
