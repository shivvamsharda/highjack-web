
import { supabase } from '@/integrations/supabase/client';
import { UpdateTokenMetadataParams, UpdateTokenMetadataResponse, FetchCurrentMetadataResponse } from '@/types/tokenMetadata';

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

    // Add optional fields
    if (params.xLink) formData.append('xLink', params.xLink);
    if (params.telegramLink) formData.append('telegramLink', params.telegramLink);
    if (params.websiteLink) formData.append('websiteLink', params.websiteLink);
    if (params.description) formData.append('description', params.description);

    try {
      const { data, error } = await supabase.functions.invoke('update-token-metadata', {
        body: formData
      });

      if (error) {
        throw new Error(error.message || 'Failed to update token metadata');
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
