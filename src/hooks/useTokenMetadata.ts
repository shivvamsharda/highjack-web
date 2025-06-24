import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface UpdateTokenMetadataParams {
  tokenName: string;
  ticker: string;
  imageFile: File;
  userWalletAddress: string;
}

interface UpdateTokenMetadataResponse {
  success: boolean;
  transactionSignature?: string;
  updateTransactionSignature?: string;
  explorerUrl?: string;
  updateExplorerUrl?: string;
  imageUri?: string;
  metadataUri?: string;
  newMetadata?: any;
  blockTime?: number;
  error?: string;
  details?: string;
  message?: string;
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
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

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
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      // Validate file size (max 10MB)
      if (imageFile.size > 10 * 1024 * 1024) {
        throw new Error('Image file too large. Maximum size is 10MB.');
      }

      // Validate file type
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please upload an image file.');
      }

      setProgress('Fetching treasury wallet address...');

      // Fetch treasury wallet address from Supabase
      const { data: treasuryData, error: treasuryError } = await supabase.functions.invoke('get-treasury-wallet');

      if (treasuryError) {
        console.error('Failed to fetch treasury wallet:', treasuryError);
        throw new Error(`Failed to fetch treasury wallet: ${treasuryError.message}`);
      }

      if (!treasuryData.success || !treasuryData.walletAddress) {
        throw new Error(treasuryData.error || 'Treasury wallet not configured');
      }

      let treasuryWallet: PublicKey;
      try {
        treasuryWallet = new PublicKey(treasuryData.walletAddress);
      } catch (error) {
        throw new Error('Invalid treasury wallet address format');
      }

      setProgress('Creating payment transaction...');

      const paymentAmount = 0.01 * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryWallet,
          lamports: paymentAmount,
        })
      );

      setProgress('Sending payment transaction...');

      // Send and confirm the payment transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('Payment transaction sent:', signature);

      setProgress('Confirming payment...');

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Payment confirmed:', signature);

      setProgress('Uploading files and updating metadata on-chain...');

      // Create form data for the edge function
      const formData = new FormData();
      formData.append('tokenName', tokenName);
      formData.append('ticker', ticker.toUpperCase());
      formData.append('imageFile', imageFile);
      formData.append('userWalletAddress', userWalletAddress);
      formData.append('paymentSignature', signature);

      // Call the edge function with payment proof
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

      setProgress('Hijack completed successfully!');

      toast({
        title: "Token Hijacked Successfully! 🎉",
        description: data.message || `${tokenName} metadata updated on-chain`,
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
    return 0.01;
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
