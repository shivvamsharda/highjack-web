import React from 'react';
import WalletConnection from './WalletConnection';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  isWalletConnected: boolean;
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  currentFee?: number | null;
  isFeeLoading?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  isWalletConnected,
  walletAddress,
  onConnect,
  onDisconnect,
  currentFee = null,
  isFeeLoading = false
}) => {
  const scrollToRecentHijacks = () => {
    const recentHijacksElement = document.getElementById('recent-hijacks');
    if (recentHijacksElement) {
      recentHijacksElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const formatFee = () => {
    if (isFeeLoading) return '...';
    if (currentFee === null) return '0.10';
    return currentFee.toFixed(2);
  };

  return (
    <header className="text-center mb-8 md:mb-12 animate-slide-up relative">
      <div className="max-w-7xl mx-auto px-4">
        {/* Wallet Connection - Top Right */}
        <div className="absolute top-0 right-4 z-10">
          <WalletConnection
            isConnected={isWalletConnected}
            walletAddress={walletAddress}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            compact={true}
          />
        </div>

        {/* Main Header Content */}
        <div className="flex flex-col sm:flex-row items-center justify-center mb-8 gap-4 sm:gap-6">
          <div className="relative flex-shrink-0">
            <img 
              src="/lovable-uploads/c3252643-b96a-44ed-aea5-9ff7be12c234.png" 
              alt="Highjack Logo" 
              className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 animate-glow-pulse rounded-full"
            />
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-transparent rounded-full blur-xl animate-pulse"></div>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary text-glow animate-flicker font-space-grotesk tracking-tight">
            HIGHJACK
          </h1>
        </div>
        
        <p className="text-lg md:text-xl lg:text-2xl text-foreground max-w-3xl mx-auto mb-8 font-medium leading-relaxed">
          Hijack a token's soul for{' '}
          <span className="text-primary font-bold">{formatFee()} SOL</span>.{' '}
          Rebrand it. Rename it. Make it yours.
        </p>
        
        <div className="flex items-center justify-center gap-3 md:gap-6 flex-wrap">
          <div className="bg-secondary/50 px-3 md:px-4 py-1 md:py-2 rounded-full border border-primary/20">
            <span className="text-primary font-bold flex items-center gap-2 text-sm md:text-base animate-flicker">
              🔥 Degen Mode: ON
            </span>
          </div>
          <div className="bg-secondary/50 px-3 md:px-4 py-1 md:py-2 rounded-full border border-primary/20">
            <span className="text-xs md:text-sm text-muted-foreground">
              💀 Built for chaos
            </span>
          </div>
          <div className="neon-red px-4 md:px-6 py-2 md:py-3 rounded-full animate-glow-pulse-slow cursor-pointer" onClick={scrollToRecentHijacks}>
            <span className="text-primary font-bold flex items-center gap-2 text-xs md:text-sm">
              🏴‍☠️ Recent Hijacks
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
