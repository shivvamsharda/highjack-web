
import { supabase } from '@/integrations/supabase/client';
import { UpdateTokenMetadataParams, UpdateTokenMetadataResponse, FetchCurrentMetadataResponse } from '@/types/tokenMetadata';
import { generateHMACSignature } from '@/utils/hmacUtils';

export const tokenMetadataService = {
  async fetchCurrentMetadata(): Promise<FetchCurrentMetadataResponse> {
    console.log('Fetching current token metadata through API Gateway...');
    
    const { data, error } = await supabase.functions.invoke('api-gateway/get-token-metadata');

    if (error) {
      console.error('API Gateway error:', error);
      throw new Error(error.message || 'Failed to fetch current token metadata');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch token metadata');
    }

    console.log('Current metadata fetched successfully:', data.metadata);
    return data;
  },

  async fetchTreasuryWallet(): Promise<{ success: boolean; walletAddress?: string; error?: string }> {
    const { data, error } = await supabase.functions.invoke('api-gateway/get-treasury-wallet');

    if (error) {
      console.error('Failed to fetch treasury wallet through API Gateway:', error);
      throw new Error(`Failed to fetch treasury wallet: ${error.message}`);
    }

    if (!data.success || !data.walletAddress) {
      throw new Error(data.error || 'Treasury wallet not configured');
    }

    return data;
  },

  async updateMetadata(params: UpdateTokenMetadataParams & { paymentSignature: string }): Promise<UpdateTokenMetadataResponse> {
    const formData = new FormData();
    formData.append('tokenName', params.tokenName);
    formData.append('ticker', params.ticker.toUpperCase());
    formData.append('imageFile', params.imageFile);
    formData.append('userWalletAddress', params.userWalletAddress);
    formData.append('paymentSignature', params.paymentSignature);

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
      console.error('API Gateway error:', error);
      throw new Error(error.message || 'Failed to update token metadata');
    }

    if (!data.success) {
      throw new Error(data.error || 'Token metadata update failed');
    }

    return data;
  }
};
