import { create } from 'zustand';
import { RetirementInputs, ComputedResults, MonteCarloResult } from '@/lib/retirement/types';
import { DEFAULTS } from '@/lib/retirement/constants';
import { computeYearlyData, computeCorpus, calcRealReturn } from '@/lib/retirement/calculations/portfolioGrowth';
import { computeFIRE } from '@/lib/retirement/calculations/fireCalculations';
import { computeSWRAnalysis } from '@/lib/retirement/calculations/withdrawalRates';
import { runMonteCarlo } from '@/lib/retirement/calculations/monteCarlo';

interface RetirementStore {
  inputs: RetirementInputs;
  setInputs: (partial: Partial<RetirementInputs>) => void;

  // Incremented on every CSV import so InputPanel remounts and re-reads fresh store values
  importVersion: number;
  bumpImportVersion: () => void;

  results: ComputedResults | null;
  computeResults: () => void;

  monteCarloEnabled: boolean;
  monteCarloRunning: boolean;
  monteCarloResult: MonteCarloResult | null;
  toggleMonteCarlo: () => void;

  activeTab: 'chart' | 'fire' | 'gap' | 'swr';
  setActiveTab: (tab: 'chart' | 'fire' | 'gap' | 'swr') => void;
}

export const useRetirementStore = create<RetirementStore>((set, get) => ({
  inputs: DEFAULTS,

  setInputs: (partial) => {
    set(state => ({ inputs: { ...state.inputs, ...partial } }));
  },

  importVersion: 0,
  bumpImportVersion: () => set(state => ({ importVersion: state.importVersion + 1 })),

  results: null,

  computeResults: () => {
    const { inputs } = get();
    const yearlyData = computeYearlyData(inputs);
    const corpus = computeCorpus(inputs, yearlyData);
    const fire = computeFIRE(inputs);
    const swrAnalysis = computeSWRAnalysis(inputs);
    const realReturnRate = calcRealReturn(inputs.expectedReturnRate, inputs.inflationRate);
    const depletionPoint = yearlyData.find(d => d.isDepletionYear);

    set({
      results: {
        yearlyData,
        corpus,
        fire,
        swrAnalysis,
        depletionAge: depletionPoint?.age ?? null,
        realReturnRate,
      },
    });

    // Re-run Monte Carlo if enabled
    if (get().monteCarloEnabled) {
      get().toggleMonteCarlo();
      setTimeout(() => get().toggleMonteCarlo(), 10);
    }
  },

  monteCarloEnabled: false,
  monteCarloRunning: false,
  monteCarloResult: null,

  toggleMonteCarlo: () => {
    const { monteCarloEnabled, inputs } = get();

    if (!monteCarloEnabled) {
      set({ monteCarloEnabled: true, monteCarloRunning: true, monteCarloResult: null });
      // Yield to UI then run simulation
      setTimeout(() => {
        const result = runMonteCarlo(inputs);
        set({ monteCarloRunning: false, monteCarloResult: result });
      }, 50);
    } else {
      set({ monteCarloEnabled: false, monteCarloRunning: false, monteCarloResult: null });
    }
  },

  activeTab: 'chart',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
