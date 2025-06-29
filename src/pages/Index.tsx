
import React, { useState } from 'react';
import Header from '@/components/Header';
import HijackForm from '@/components/HijackForm';
import HijackHistory from '@/components/HijackHistory';
import { useHijackFeeContext } from '@/contexts/HijackFeeContext';

const Index = () => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { feeInfo, isLoading: isFeeLoading } = useHijackFeeContext();

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
          <Header 
            isWalletConnected={isWalletConnected}
            walletAddress={walletAddress}
            onConnect={handleWalletConnect}
            onDisconnect={handleWalletDisconnect}
            currentFee={feeInfo?.currentFee || null}
            isFeeLoading={isFeeLoading}
          />

          {/* Top Section - Preview and Form side by side */}
          <div className="max-w-7xl mx-auto mt-8 mb-12">
            <HijackForm isConnected={isWalletConnected} />
            
            {/* Social Media Links */}
            <div className="flex justify-center items-center gap-6 mt-8">
              <a 
                href="https://t.me/highjackme" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-300"
              >
                <span className="text-lg">📱</span>
                <span className="font-medium">Telegram</span>
              </a>
              <span className="text-muted-foreground">•</span>
              <a 
                href="https://x.com/highjack_me" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-300"
              >
                <span className="text-lg">🐦</span>
                <span className="font-medium">Twitter</span>
              </a>
            </div>
          </div>

          {/* Bottom Section - Recent Hijacks Table */}
          <div className="max-w-7xl mx-auto">
            <HijackHistory />
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
