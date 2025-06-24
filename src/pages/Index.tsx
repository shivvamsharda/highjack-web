
import React, { useState } from 'react';
import Header from '@/components/Header';
import WalletConnection from '@/components/WalletConnection';
import HijackForm from '@/components/HijackForm';
import HijackHistory from '@/components/HijackHistory';

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
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Header />
          
          <div className="max-w-5xl mx-auto mb-8">
            <WalletConnection
              isConnected={isWalletConnected}
              walletAddress={walletAddress}
              onConnect={handleWalletConnect}
              onDisconnect={handleWalletDisconnect}
            />
          </div>

          {/* Two Column Layout */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column - Hijack Form */}
            <div className="space-y-6">
              <HijackForm isConnected={isWalletConnected} />
            </div>
            
            {/* Right Column - Hijack History */}
            <div className="space-y-6">
              <HijackHistory />
            </div>
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
