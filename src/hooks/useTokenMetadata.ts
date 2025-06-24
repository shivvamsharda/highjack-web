
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpdateTokenMetadataParams {
  tokenName: string;
  ticker: string;
  imageFile: File;
  userWalletAddress: string;
}

interface UpdateTokenMetadataResponse {
  success: boolean;
  transactionSignature?: string;
  explorerUrl?: string;
  imageUri?: string;
  metadataUri?: string;
  newMetadata?: any;
  blockTime?: number;
  error?: string;
  details?: string;
}

interface CurrentTokenMetadata {
  name: string;
  symbol: string;
  image: string | null;
  description: string | null;
  metadataUri: string;
  updateAuthority: string;
  mintAddress: string;
  creators?: any[];
  collection?: any;
}

interface FetchCurrentMetadataResponse {
  success: boolean;
  metadata?: CurrentTokenMetadata;
  error?: string;
  details?: string;
}

export const useTokenMetadata = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFetchingCurrent, setIsFetchingCurrent] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [currentMetadata, setCurrentMetadata] = useState<CurrentTokenMetadata | null>(null);
  const { toast } = useToast();

  const fetchCurrentTokenMetadata = async (): Promise<FetchCurrentMetadataResponse> => {
    setIsFetchingCurrent(true);
    
    try {
      console.log('Fetching current token metadata...');
      
      const { data, error } = await supabase.functions.invoke('get-token-metadata');

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to fetch current token metadata');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch token metadata');
      }

      setCurrentMetadata(data.metadata);
      console.log('Current metadata fetched successfully:', data.metadata);
      
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

  const updateTokenMetadata = async ({
    tokenName,
    ticker,
    imageFile,
    userWalletAddress
  }: UpdateTokenMetadataParams): Promise<UpdateTokenMetadataResponse> => {
    setIsUpdating(true);
    setProgress('Preparing to hijack token...');

    try {
      // Validate file size (max 10MB)
      if (imageFile.size > 10 * 1024 * 1024) {
        throw new Error('Image file too large. Maximum size is 10MB.');
      }

      // Validate file type
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please upload an image file.');
      }

      setProgress('Uploading image to IPFS...');

      // Create form data
      const formData = new FormData();
      formData.append('tokenName', tokenName);
      formData.append('ticker', ticker.toUpperCase());
      formData.append('imageFile', imageFile);
      formData.append('userWalletAddress', userWalletAddress);

      setProgress('Processing payment and updating metadata...');

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('update-token-metadata', {
        body: formData,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to update token metadata');
      }

      if (!data.success) {
        throw new Error(data.error || 'Token metadata update failed');
      }

      setProgress('Confirming transaction on blockchain...');

      toast({
        title: "Token Hijacked Successfully! 🎉",
        description: `${tokenName} metadata updated on-chain`,
      });

      // Refresh current metadata after successful update
      await fetchCurrentTokenMetadata();

      return data;

    } catch (error) {
      console.error('Token metadata update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        title: "Hijack Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsUpdating(false);
      setProgress('');
    }
  };

  const calculateActualFee = async (): Promise<number> => {
    // For now, return the fixed fee
    // In the future, this could calculate actual transaction costs
    return 0.1;
  };

  return {
    updateTokenMetadata,
    fetchCurrentTokenMetadata,
    calculateActualFee,
    isUpdating,
    isFetchingCurrent,
    progress,
    currentMetadata
  };
};
