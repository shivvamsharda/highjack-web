
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
      <div className="main-content">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Header />
          
          <div className="max-w-4xl mx-auto space-y-8">
            <WalletConnection
              isConnected={isWalletConnected}
              walletAddress={walletAddress}
              onConnect={handleWalletConnect}
              onDisconnect={handleWalletDisconnect}
            />
            
            <HijackForm isConnected={isWalletConnected} />
          </div>

          <footer className="text-center mt-20 text-muted-foreground animate-slide-up">
            <div className="space-y-2">
              <p className="text-sm">
                Built for degens, by degens. Use responsibly. 🏴‍☠️
              </p>
              <div className="flex items-center justify-center gap-4 text-xs">
                <span>⚡ Powered by Solana</span>
                <span>•</span>
                <span>🔥 Zero compromises</span>
                <span>•</span>
                <span>💀 Maximum chaos</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Index;
