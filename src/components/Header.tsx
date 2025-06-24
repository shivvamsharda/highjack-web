
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-8 md:mb-12 animate-slide-up px-4">
      <div className="flex flex-col md:flex-row items-center justify-center mb-6 gap-4 md:gap-6">
        <div className="relative flex-shrink-0">
          <img 
            src="/lovable-uploads/b77bb4bb-4b61-480a-a92b-23b714b5d6ed.png" 
            alt="Highjack Logo" 
            className="w-16 h-16 md:w-24 md:h-24 animate-glow-pulse rounded-full"
          />
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-transparent rounded-full blur-xl animate-pulse"></div>
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-primary text-glow animate-flicker font-space-grotesk tracking-tight">
          HIGHJACK
        </h1>
      </div>
      
      <p className="text-lg md:text-xl lg:text-2xl text-foreground max-w-4xl mx-auto mb-6 font-medium px-2">
        The token billboard you can steal for{' '}
        <span className="text-primary font-bold">0.1 SOL</span>.{' '}
        <br className="hidden sm:block" />
        Rename it. Rebrand it. Reclaim the chain.
      </p>
      
      <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap px-2">
        <div className="neon-red px-4 md:px-6 py-2 md:py-3 rounded-full animate-glow-pulse">
          <span className="text-primary font-bold flex items-center gap-2 text-sm md:text-base">
            🔥 Degen Mode: ON
          </span>
        </div>
        <div className="bg-secondary/50 px-3 md:px-4 py-1 md:py-2 rounded-full border border-primary/20">
          <span className="text-xs md:text-sm text-muted-foreground">
            💀 Built for chaos
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
