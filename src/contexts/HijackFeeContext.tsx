
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HijackFeeInfo {
  currentFee: number;
  nextFeeAfterHijack: number;
  lastHijackAt: string | null;
  nextDecreaseIn: number | null;
  timeSinceLastHijack: number | null;
}

interface HijackFeeContextType {
  feeInfo: HijackFeeInfo | null;
  isLoading: boolean;
  error: string | null;
  refreshFee: () => Promise<void>;
}

const HijackFeeContext = createContext<HijackFeeContextType | undefined>(undefined);

export const useHijackFeeContext = () => {
  const context = useContext(HijackFeeContext);
  if (context === undefined) {
    throw new Error('useHijackFeeContext must be used within a HijackFeeProvider');
  }
  return context;
};

export const HijackFeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [feeInfo, setFeeInfo] = useState<HijackFeeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentFee = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('get-hijack-fee');

      if (fetchError) {
        throw fetchError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch current hijack fee');
      }

      setFeeInfo({
        currentFee: data.currentFee,
        nextFeeAfterHijack: data.nextFeeAfterHijack,
        lastHijackAt: data.lastHijackAt,
        nextDecreaseIn: data.nextDecreaseIn,
        timeSinceLastHijack: data.timeSinceLastHijack
      });

    } catch (err) {
      console.error('Error fetching hijack fee:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch fee');
      // Set fallback fee
      setFeeInfo({
        currentFee: 0.1,
        nextFeeAfterHijack: 0.2,
        lastHijackAt: null,
        nextDecreaseIn: null,
        timeSinceLastHijack: null
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentFee();

    // Set up a single real-time subscription for pricing updates
    const channel = supabase
      .channel('hijack-pricing-global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hijack_pricing'
        },
        (payload) => {
          console.log('Real-time pricing update:', payload);
          fetchCurrentFee();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const value: HijackFeeContextType = {
    feeInfo,
    isLoading,
    error,
    refreshFee: fetchCurrentFee
  };

  return (
    <HijackFeeContext.Provider value={value}>
      {children}
    </HijackFeeContext.Provider>
  );
};
