'use client';
import { useEffect, useRef } from 'react';
import { useRetirementStore } from '@/store/retirementStore';

export function useRetirementCalc() {
  const inputs = useRetirementStore(s => s.inputs);
  const computeResults = useRetirementStore(s => s.computeResults);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      computeResults();
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputs, computeResults]);
}
