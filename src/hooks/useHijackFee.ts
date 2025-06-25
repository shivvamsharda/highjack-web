
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HijackFeeInfo {
  currentFee: number;
  nextFeeAfterHijack: number;
  lastHijackAt: string | null;
  nextDecreaseIn: number | null;
  timeSinceLastHijack: number | null;
}

export const useHijackFee = () => {
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

    // Set up real-time subscription for pricing updates
    const channel = supabase
      .channel('hijack-pricing-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hijack_pricing'
        },
        (payload) => {
          console.log('Real-time pricing update:', payload);
          // Refresh fee info when pricing changes
          fetchCurrentFee();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    feeInfo,
    isLoading,
    error,
    refreshFee: fetchCurrentFee
  };
};
