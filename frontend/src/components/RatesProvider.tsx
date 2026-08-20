'use client';

import React, { createContext, useContext } from 'react';
import useSWR from 'swr';
import { fetchLatestRates } from '@/lib/api';
import { LatestRates } from '@/lib/types';

interface RatesContextValue {
  rates: LatestRates | undefined;
  isLoading: boolean;
  isError: boolean;
}

const RatesContext = createContext<RatesContextValue>({
  rates: undefined,
  isLoading: true,
  isError: false,
});

export function RatesProvider({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading } = useSWR('latest-rates', fetchLatestRates, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000, // 1 hour — matches backend cache window
    keepPreviousData: true,
  });

  return (
    <RatesContext.Provider
      value={{
        rates: data,
        isLoading: isLoading && !data,
        isError: !!error,
      }}
    >
      {children}
    </RatesContext.Provider>
  );
}

export function useRates() {
  return useContext(RatesContext);
}
