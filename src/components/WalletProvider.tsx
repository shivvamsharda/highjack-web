
import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { supabase } from '@/integrations/supabase/client';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

const SolanaWalletProvider: React.FC<SolanaWalletProviderProps> = ({ children }) => {
  const [rpcEndpoint, setRpcEndpoint] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const networkSetting = import.meta.env.VITE_SOLANA_NETWORK?.toLowerCase();

  useEffect(() => {
    const fetchRpcEndpoint = async () => {
      try {
        console.log('Fetching RPC endpoint from Supabase...');
        const { data, error } = await supabase.functions.invoke('get-rpc-endpoint');
        
        if (error) {
          console.error('Supabase function error:', error);
          setRpcError(`Failed to fetch RPC endpoint: ${error.message}`);
          return;
        }

        if (data && data.success && data.rpcUrl) {
          console.log('Successfully fetched RPC endpoint:', data.rpcUrl);
          setRpcEndpoint(data.rpcUrl);
          setRpcError(null);
        } else {
          console.error('RPC endpoint not configured:', data);
          setRpcError(data?.error || 'RPC_URL not configured in Supabase secrets');
        }
      } catch (error) {
        console.error('Failed to fetch RPC endpoint:', error);
        setRpcError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRpcEndpoint();
  }, []);

  const network =
    networkSetting === 'devnet' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;
  
  // Use the same RPC endpoint as the backend for consistency
  const endpoint = useMemo(() => rpcEndpoint, [rpcEndpoint]);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  // Show loading state while fetching RPC endpoint
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to Solana network...</p>
        </div>
      </div>
    );
  }

  // Show error state if RPC endpoint is not available
  if (rpcError || !endpoint) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-xl mb-4">⚠️ Network Configuration Error</div>
          <p className="text-muted-foreground mb-4">
            {rpcError || 'No RPC endpoint available'}
          </p>
          <p className="text-sm text-muted-foreground">
            Please ensure the RPC_URL is configured in Supabase secrets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaWalletProvider;
