
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
  const [rpcEndpoint, setRpcEndpoint] = useState<string>('https://api.mainnet-beta.solana.com');

  useEffect(() => {
    const fetchRpcEndpoint = async () => {
      try {
        // Fetch the same RPC_URL that the backend edge functions use
        const { data, error } = await supabase.functions.invoke('get-rpc-endpoint');
        if (data && data.rpcUrl) {
          setRpcEndpoint(data.rpcUrl);
          console.log('Using RPC endpoint:', data.rpcUrl);
        } else {
          console.warn('Could not fetch RPC endpoint, using default:', error);
        }
      } catch (error) {
        console.warn('Failed to fetch RPC endpoint, using default:', error);
      }
    };

    fetchRpcEndpoint();
  }, []);

  // Use mainnet for production - this is where real SOL transactions happen
  const network = WalletAdapterNetwork.Mainnet;
  
  // Use the same RPC endpoint as the backend for consistency
  const endpoint = useMemo(() => rpcEndpoint, [rpcEndpoint]);
  
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

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
