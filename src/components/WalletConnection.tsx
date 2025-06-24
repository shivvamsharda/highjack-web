
import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { useWalletDatabase } from '@/hooks/useWalletDatabase';

interface WalletConnectionProps {
  isConnected: boolean;
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  isConnected: legacyIsConnected,
  walletAddress: legacyWalletAddress,
  onConnect: legacyOnConnect,
  onDisconnect: legacyOnDisconnect
}) => {
  const { publicKey, wallet, connect, disconnect, connecting } = useWallet();
  const { saveWalletConnection, disconnectWallet, isLoading } = useWalletDatabase();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  
  // Track if we've already processed this connection to prevent infinite loops
  const processedConnectionRef = useRef<string | null>(null);

  const isConnected = !!publicKey;
  const walletAddress = publicKey?.toBase58() || null;

  // Handle wallet connection changes
  useEffect(() => {
    const handleWalletConnected = async () => {
      if (publicKey && wallet && walletAddress) {
        // Check if we've already processed this connection
        if (processedConnectionRef.current === walletAddress) {
          return;
        }

        console.log('Processing new wallet connection:', walletAddress);
        processedConnectionRef.current = walletAddress;
        
        const walletType = wallet.adapter.name.toLowerCase();
        const success = await saveWalletConnection(walletAddress, walletType);
        if (success) {
          legacyOnConnect(); // Update legacy state
          setIsDialogOpen(false);
          setConnectionError(null);
        }
      }
    };

    if (publicKey && wallet && !legacyIsConnected) {
      handleWalletConnected();
    } else if (!publicKey && legacyIsConnected) {
      // Wallet was disconnected
      console.log('Wallet disconnected, clearing processed connection');
      processedConnectionRef.current = null;
      legacyOnDisconnect();
      setIsDisconnecting(false);
    }
  }, [publicKey, wallet, legacyIsConnected, saveWalletConnection, legacyOnConnect, legacyOnDisconnect, walletAddress]);

  const handleConnect = async () => {
    try {
      setConnectionError(null);
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      if (walletAddress) {
        await disconnectWallet(walletAddress);
      }
      await disconnect();
      processedConnectionRef.current = null;
      legacyOnDisconnect();
    } catch (error) {
      console.error('Disconnection failed:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletIcon = (walletName: string) => {
    switch (walletName.toLowerCase()) {
      case 'phantom': return '👻';
      case 'solflare': return '☀️';
      default: return '🪙';
    }
  };

  if (isConnected && walletAddress) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-primary/30 glow-red animate-slide-up">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 animate-pulse" />
              <div>
                <div className="text-sm text-green-400 font-medium flex items-center gap-2">
                  <span>{getWalletIcon(wallet?.adapter.name || '')}</span>
                  ✅ {wallet?.adapter.name} Connected
                </div>
                <div className="text-lg font-bold text-foreground">
                  {truncateAddress(walletAddress)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-primary font-bold text-lg animate-flicker">
                🔥 Ready to Highjack?
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading || isDisconnecting}
                className="border-primary/30 hover:bg-primary/10 transition-all duration-300"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border glow-red animate-slide-up">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl md:text-3xl flex items-center justify-center gap-3 font-space-grotesk">
          <Zap className="w-8 h-8 text-primary animate-pulse" />
          Connect Your Wallet
        </CardTitle>
        <p className="text-muted-foreground text-lg">
          Choose your weapon to start hijacking
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          <WalletMultiButton 
            className="!bg-gradient-to-r !from-primary !to-primary/80 hover:!from-primary/90 hover:!to-primary/70 !text-primary-foreground !font-bold !py-4 !text-lg !px-8 !rounded-md glow-red !transition-all !duration-300 hover:glow-red-intense button-unlock animate-glow-pulse"
          />
          
          {connectionError && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{connectionError}</span>
            </div>
          )}
          
          {connecting && (
            <div className="text-primary text-sm animate-pulse">
              Connecting to wallet...
            </div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Secure connection • No private keys stored
        </p>
      </CardContent>
    </Card>
  );
};

export default WalletConnection;
