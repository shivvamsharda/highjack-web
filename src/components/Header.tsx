
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-8">
      <div className="flex items-center justify-center mb-4">
        <img 
          src="/lovable-uploads/b77bb4bb-4b61-480a-a92b-23b714b5d6ed.png" 
          alt="Highjack Logo" 
          className="w-20 h-20 mr-4"
        />
        <h1 className="text-6xl font-bold text-primary text-glow">
          HIGHJACK
        </h1>
      </div>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        The virtual billboard that anyone can hijack. Pay 0.1 SOL to take control of a token's identity.
      </p>
      <div className="mt-4 text-sm text-muted-foreground">
        <span className="inline-block bg-secondary px-3 py-1 rounded-full">
          💀 Degen Mode Activated
        </span>
      </div>
    </header>
  );
};

export default Header;
