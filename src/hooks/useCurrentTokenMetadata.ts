
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { tokenMetadataService } from '@/services/tokenMetadataService';
import { CurrentTokenMetadata, FetchCurrentMetadataResponse } from '@/types/tokenMetadata';

export const useCurrentTokenMetadata = () => {
  const [isFetchingCurrent, setIsFetchingCurrent] = useState(false);
  const [currentMetadata, setCurrentMetadata] = useState<CurrentTokenMetadata | null>(null);
  const { toast } = useToast();

  const fetchCurrentTokenMetadata = async (): Promise<FetchCurrentMetadataResponse> => {
    setIsFetchingCurrent(true);
    
    try {
      const data = await tokenMetadataService.fetchCurrentMetadata();
      setCurrentMetadata(data.metadata!);
      return data;
    } catch (error) {
      console.error('Fetch current metadata error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Failed to Load Current Token",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsFetchingCurrent(false);
    }
  };

  return {
    fetchCurrentTokenMetadata,
    isFetchingCurrent,
    currentMetadata,
    setCurrentMetadata
  };
};
