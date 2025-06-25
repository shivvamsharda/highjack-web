
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeeInfo {
  currentFee: number;
  nextFeeAfterHijack: number;
  lastHijackAt?: string;
  nextDecreaseIn?: number;
  timeSinceLastHijack?: number;
}

interface HijackFeeContextType {
  feeInfo: FeeInfo | null;
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

interface HijackFeeProviderProps {
  children: ReactNode;
}

export const HijackFeeProvider: React.FC<HijackFeeProviderProps> = ({ children }) => {
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeeInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching hijack fee through API Gateway...');
      
      // Use API Gateway instead of direct function call
      const { data, error: functionError } = await supabase.functions.invoke('api-gateway/get-hijack-fee');

      if (functionError) {
        console.error('API Gateway error fetching fee:', functionError);
        setError(functionError.message || 'Failed to fetch hijack fee');
        // Set fallback fee
        setFeeInfo({
          currentFee: 0.1,
          nextFeeAfterHijack: 0.2
        });
        return;
      }

      if (!data.success) {
        console.error('Fee fetch failed:', data.error);
        setError(data.error || 'Failed to fetch current fee');
        // Set fallback fee
        setFeeInfo({
          currentFee: data.currentFee || 0.1,
          nextFeeAfterHijack: (data.currentFee || 0.1) + 0.1
        });
        return;
      }

      console.log('Fee info fetched successfully:', data);
      
      setFeeInfo({
        currentFee: data.currentFee,
        nextFeeAfterHijack: data.nextFeeAfterHijack,
        lastHijackAt: data.lastHijackAt,
        nextDecreaseIn: data.nextDecreaseIn,
        timeSinceLastHijack: data.timeSinceLastHijack
      });

    } catch (err) {
      console.error('Error fetching fee info:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Set fallback fee
      setFeeInfo({
        currentFee: 0.1,
        nextFeeAfterHijack: 0.2
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeInfo();
    
    // Refresh fee info every 30 seconds
    const interval = setInterval(fetchFeeInfo, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshFee = async () => {
    await fetchFeeInfo();
  };

  return (
    <HijackFeeContext.Provider value={{ feeInfo, isLoading, error, refreshFee }}>
      {children}
    </HijackFeeContext.Provider>
  );
};
