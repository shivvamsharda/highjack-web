
import React, { useState } from 'react';
import Header from '@/components/Header';
import WalletConnection from '@/components/WalletConnection';
import HijackForm from '@/components/HijackForm';

const Index = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const handleWalletConnect = () => {
    // Simulate wallet connection
    const mockAddress = "7BgEGAq4p2bNfD9BKe3mJqFMmgL3xQwR5YhZx1kT9qE2";
    setWalletAddress(mockAddress);
    setIsWalletConnected(true);
    console.log("Wallet connected:", mockAddress);
  };

  const handleWalletDisconnect = () => {
    setWalletAddress(null);
    setIsWalletConnected(false);
    console.log("Wallet disconnected");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Header />
        
        <div className="max-w-2xl mx-auto space-y-8">
          <WalletConnection
            isConnected={isWalletConnected}
            walletAddress={walletAddress}
            onConnect={handleWalletConnect}
            onDisconnect={handleWalletDisconnect}
          />
          
          <HijackForm isConnected={isWalletConnected} />
        </div>

        <footer className="text-center mt-16 text-muted-foreground">
          <p className="text-sm">
            Built for degens, by degens. Use responsibly. 🏴‍☠️
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
