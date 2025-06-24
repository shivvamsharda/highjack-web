
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-12 animate-slide-up">
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <img 
            src="/lovable-uploads/b77bb4bb-4b61-480a-a92b-23b714b5d6ed.png" 
            alt="Highjack Logo" 
            className="w-24 h-24 mr-6 animate-glow-pulse rounded-full"
          />
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 to-transparent rounded-full blur-xl animate-pulse"></div>
        </div>
        <h1 className="text-7xl md:text-8xl font-bold text-primary text-glow animate-flicker font-space-grotesk tracking-tight">
          HIGHJACK
        </h1>
      </div>
      
      <p className="text-xl md:text-2xl text-foreground max-w-4xl mx-auto mb-6 font-medium">
        The token billboard you can steal for{' '}
        <span className="text-primary font-bold">0.1 SOL</span>.{' '}
        <br className="hidden md:block" />
        Rename it. Rebrand it. Reclaim the chain.
      </p>
      
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="neon-red px-6 py-3 rounded-full animate-glow-pulse">
          <span className="text-primary font-bold flex items-center gap-2">
            🔥 Degen Mode: ON
          </span>
        </div>
        <div className="bg-secondary/50 px-4 py-2 rounded-full border border-primary/20">
          <span className="text-sm text-muted-foreground">
            💀 Built for chaos
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
