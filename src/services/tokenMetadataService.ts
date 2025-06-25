
import { supabase } from '@/integrations/supabase/client';
import { UpdateTokenMetadataParams, UpdateTokenMetadataResponse, FetchCurrentMetadataResponse } from '@/types/tokenMetadata';
import { generateHMACSignature } from '@/utils/hmacUtils';

export const tokenMetadataService = {
  async fetchCurrentMetadata(): Promise<FetchCurrentMetadataResponse> {
    console.log('Fetching current token metadata through API Gateway...');
    
    try {
      const { data, error } = await supabase.functions.invoke('api-gateway/get-token-metadata');

      if (error) {
        console.error('API Gateway error:', error);
        
        // Fallback to direct function call if gateway fails
        console.log('Trying direct function call as fallback...');
        const fallbackResult = await supabase.functions.invoke('get-token-metadata');
        
        if (fallbackResult.error) {
          throw new Error(fallbackResult.error.message || 'Failed to fetch current token metadata');
        }
        
        if (!fallbackResult.data.success) {
          throw new Error(fallbackResult.data.error || 'Failed to fetch token metadata');
        }
        
        console.log('Current metadata fetched successfully via fallback:', fallbackResult.data.metadata);
        return fallbackResult.data;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch token metadata');
      }

      console.log('Current metadata fetched successfully:', data.metadata);
      return data;
    } catch (error) {
      console.error('All attempts failed:', error);
      throw error;
    }
  },

  async fetchTreasuryWallet(): Promise<{ success: boolean; walletAddress?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('api-gateway/get-treasury-wallet');

      if (error) {
        console.error('API Gateway error for treasury wallet:', error);
        
        // Fallback to direct function call
        const fallbackResult = await supabase.functions.invoke('get-treasury-wallet');
        
        if (fallbackResult.error) {
          throw new Error(`Failed to fetch treasury wallet: ${fallbackResult.error.message}`);
        }
        
        return fallbackResult.data;
      }

      if (!data.success || !data.walletAddress) {
        throw new Error(data.error || 'Treasury wallet not configured');
      }

      return data;
    } catch (error) {
      console.error('Treasury wallet fetch failed:', error);
      throw error;
    }
  },

  async updateMetadata(params: UpdateTokenMetadataParams & { paymentSignature: string }): Promise<UpdateTokenMetadataResponse> {
    const formData = new FormData();
    formData.append('tokenName', params.tokenName);
    formData.append('ticker', params.ticker.toUpperCase());
    formData.append('imageFile', params.imageFile);
    formData.append('userWalletAddress', params.userWalletAddress);
    formData.append('paymentSignature', params.paymentSignature);

    try {
      // Generate HMAC signature for this sensitive operation
      const bodyString = JSON.stringify({
        tokenName: params.tokenName,
        ticker: params.ticker,
        userWalletAddress: params.userWalletAddress,
        paymentSignature: params.paymentSignature
      });
      
      const { signature, timestamp } = await generateHMACSignature(bodyString);

      const { data, error } = await supabase.functions.invoke('api-gateway/update-token-metadata', {
        body: formData,
        headers: {
          'x-signature': signature,
          'x-timestamp': timestamp
        }
      });

      if (error) {
        console.error('API Gateway error for update:', error);
        
        // Fallback to direct function call
        const fallbackResult = await supabase.functions.invoke('update-token-metadata', {
          body: formData
        });
        
        if (fallbackResult.error) {
          throw new Error(fallbackResult.error.message || 'Failed to update token metadata');
        }
        
        return fallbackResult.data;
      }

      if (!data.success) {
        throw new Error(data.error || 'Token metadata update failed');
      }

      return data;
    } catch (error) {
      console.error('Update metadata failed:', error);
      throw error;
    }
  }
};
