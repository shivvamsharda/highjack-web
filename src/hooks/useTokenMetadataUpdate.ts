
import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';
import { tokenMetadataService } from '@/services/tokenMetadataService';
import { waitForTransactionFinality } from '@/utils/transactionFinality';
import { UpdateTokenMetadataParams, UpdateTokenMetadataResponse } from '@/types/tokenMetadata';

export const useTokenMetadataUpdate = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const { toast } = useToast();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const updateTokenMetadata = async (params: UpdateTokenMetadataParams & { currentFee: number }): Promise<UpdateTokenMetadataResponse> => {
    setIsUpdating(true);
    setProgress('Preparing to hijack token...');

    try {
      if (!publicKey || !sendTransaction) {
        throw new Error('Wallet not connected');
      }

      // Validate file size (max 10MB)
      if (params.imageFile.size > 10 * 1024 * 1024) {
        throw new Error('Image file too large. Maximum size is 10MB.');
      }

      // Validate file type
      if (!params.imageFile.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please upload an image file.');
      }

      setProgress('Fetching treasury wallet address...');

      // Fetch treasury wallet address from Supabase
      const treasuryData = await tokenMetadataService.fetchTreasuryWallet();

      let treasuryWallet: PublicKey;
      try {
        treasuryWallet = new PublicKey(treasuryData.walletAddress!);
      } catch (error) {
        throw new Error('Invalid treasury wallet address format');
      }

      setProgress('Creating payment transaction...');

      const paymentAmount = params.currentFee * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryWallet,
          lamports: paymentAmount,
        })
      );

      setProgress(`Sending payment transaction (${params.currentFee} SOL)...`);

      // Send the payment transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('Payment transaction sent:', signature);

      setProgress('Waiting for transaction confirmation...');

      // Enhanced finality verification
      const finalityResult = await waitForTransactionFinality(connection, signature, {
        minConfirmations: 32,
        maxWaitTime: 300000, // 5 minutes
        checkInterval: 2000, // 2 seconds
        maxAge: 300 // 5 minutes
      });

      if (!finalityResult.isFinalized) {
        throw new Error(
          finalityResult.error || 
          `Transaction not finalized (confirmations: ${finalityResult.confirmations})`
        );
      }

      console.log(`Payment finalized with ${finalityResult.confirmations} confirmations`);
      setProgress('Payment confirmed and finalized. Processing hijack...');

      setProgress('Uploading files and updating metadata on-chain...');

      // Call the edge function with payment proof
      const data = await tokenMetadataService.updateMetadata({
        ...params,
        paymentSignature: signature
      });

      setProgress('Hijack completed successfully!');

      toast({
        title: "Token Hijacked Successfully! 🎉",
        description: data.message || `${params.tokenName} metadata updated on-chain`,
      });

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

  return {
    updateTokenMetadata,
    isUpdating,
    progress
  };
};
