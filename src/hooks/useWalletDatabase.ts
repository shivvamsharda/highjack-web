
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WalletConnection {
  id: string;
  wallet_address: string;
  wallet_type: string;
  connected_at: string;
  last_active_at: string;
  is_active: boolean;
}

export const useWalletDatabase = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saveWalletConnection = async (
    walletAddress: string,
    walletType: string
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // First, check if wallet already exists
      const { data: existing } = await supabase
        .from('wallet_connections')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (existing) {
        // Update existing wallet connection
        const { error } = await supabase
          .from('wallet_connections')
          .update({
            last_active_at: new Date().toISOString(),
            is_active: true,
            wallet_type: walletType
          })
          .eq('wallet_address', walletAddress);

        if (error) {
          console.error('Error updating wallet connection:', error);
          toast({
            title: "Connection Error",
            description: "Failed to update wallet connection",
            variant: "destructive",
          });
          return false;
        }
      } else {
        // Insert new wallet connection
        const { error } = await supabase
          .from('wallet_connections')
          .insert({
            wallet_address: walletAddress,
            wallet_type: walletType,
            connected_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
            is_active: true
          });

        if (error) {
          console.error('Error saving wallet connection:', error);
          toast({
            title: "Connection Error",
            description: "Failed to save wallet connection",
            variant: "destructive",
          });
          return false;
        }
      }

      toast({
        title: "Wallet Connected",
        description: `${walletType} wallet connected successfully!`,
      });
      return true;
    } catch (error) {
      console.error('Database error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to database",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async (walletAddress: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('wallet_connections')
        .update({
          is_active: false,
          last_active_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (error) {
        console.error('Error disconnecting wallet:', error);
        return false;
      }

      toast({
        title: "Wallet Disconnected",
        description: "Wallet disconnected successfully",
      });
      return true;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getWalletConnections = async (): Promise<WalletConnection[]> => {
    try {
      const { data, error } = await supabase
        .from('wallet_connections')
        .select('*')
        .eq('is_active', true)
        .order('last_active_at', { ascending: false });

      if (error) {
        console.error('Error fetching wallet connections:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Database error:', error);
      return [];
    }
  };

  return {
    saveWalletConnection,
    disconnectWallet,
    getWalletConnections,
    isLoading
  };
};
