
import React, { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolanaWalletProviderProps {
  children: React.ReactNode;
}

const SolanaWalletProvider: React.FC<SolanaWalletProviderProps> = ({ children }) => {
  // Use mainnet for production - this is where real SOL transactions happen
  const network = WalletAdapterNetwork.Mainnet;
  
  // Use a reliable RPC endpoint instead of the public rate-limited one
  // This should match the RPC_URL used in the Supabase edge function
  const endpoint = useMemo(() => {
    // Using Helius free tier as a more reliable option than the public RPC
    // You can replace this with your preferred RPC provider (QuickNode, Alchemy, etc.)
    return 'https://mainnet.helius-rpc.com/?api-key=public';
  }, []);
  
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
