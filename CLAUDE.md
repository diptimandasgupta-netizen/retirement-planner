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
| `src/lib/retirement/types.ts` | All shared TypeScript interfaces |
| `src/lib/retirement/constants.ts` | `DEFAULTS`, multipliers, `USD`/`USDM` formatters |
| `src/lib/retirement/calculations/portfolioGrowth.ts` | Year-by-year accumulation/withdrawal model |
| `src/lib/retirement/calculations/fireCalculations.ts` | FIRE numbers (lean/regular/fat) |
| `src/lib/retirement/calculations/withdrawalRates.ts` | SWR analysis across 3–5% rates |
| `src/lib/retirement/calculations/monteCarlo.ts` | 1 000-simulation Monte Carlo with percentile bands |
| `src/store/retirementStore.ts` | Single Zustand store wiring inputs → results → Monte Carlo |
| `src/hooks/useRetirementCalc.ts` | Debounced auto-recompute on input change |
| `src/components/retirement/RetirementPlanner.tsx` | Root layout: sticky `InputPanel` + tabbed output panel |

### Calculation conventions

- All monetary inputs are in **today's dollars**; the model inflates them internally.
- `expectedReturnRate` and `inflationRate` are **decimal fractions** (e.g. `0.07`).
- Real return is computed as `(1 + nominal) / (1 + inflation) - 1` (Fisher equation).
- The 4% SWR rule is the baseline for corpus-needed calculations; FIRE panels expose 3–5% alternatives.
- Household expense multipliers: `single = 1.0`, `spouse = 1.6`, `family = 2.0 + 0.15 × numChildren` (capped at 3.5).
- Monte Carlo uses `returnStdDev = 0.12` and `inflationStdDev = 0.01` (see `MONTE_CARLO` constant).

### Path alias

`@/` maps to `src/` (configured in `tsconfig.json`).
