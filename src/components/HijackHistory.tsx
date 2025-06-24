
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Twitter, MessageCircle } from 'lucide-react';

const HijackHistory: React.FC = () => {
  const mockHistory = [
    {
      id: 1,
      name: "DegenCoin",
      ticker: "DEGEN",
      logo: "🦍",
      wallet: "Dx4R...9rTq",
      timestamp: "2 mins ago"
    },
    {
      id: 2,
      name: "MoonRocket",
      ticker: "MOON",
      logo: "🚀",
      wallet: "8K9L...3mPs",
      timestamp: "5 mins ago"
    },
    {
      id: 3,
      name: "DiamondHands",
      ticker: "DMNDS",
      logo: "💎",
      wallet: "9xTp...7nQz",
      timestamp: "12 mins ago"
    },
    {
      id: 4,
      name: "ChainBreaker",
      ticker: "BREAK",
      logo: "⚡",
      wallet: "7vNm...5kLx",
      timestamp: "18 mins ago"
    },
    {
      id: 5,
      name: "NeonCat",
      ticker: "NCAT",
      logo: "🐱",
      wallet: "5uWq...8rYt",
      timestamp: "25 mins ago"
    },
    {
      id: 6,
      name: "CyberPunk",
      ticker: "CYBER",
      logo: "🤖",
      wallet: "3sHj...2pMn",
      timestamp: "32 mins ago"
    },
    {
      id: 7,
      name: "GlitchMode",
      ticker: "GLITCH",
      logo: "👾",
      wallet: "6bVp...9xCv",
      timestamp: "45 mins ago"
    },
    {
      id: 8,
      name: "NightRider",
      ticker: "NIGHT",
      logo: "🌙",
      wallet: "4fKs...7nBm",
      timestamp: "1 hr ago"
    },
    {
      id: 9,
      name: "FireStorm",
      ticker: "FIRE",
      logo: "🔥",
      wallet: "2dGh...5qLp",
      timestamp: "1 hr ago"
    },
    {
      id: 10,
      name: "IceBreaker",
      ticker: "ICE",
      logo: "❄️",
      wallet: "8jMx...3wRz",
      timestamp: "2 hrs ago"
    }
  ];

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/30 glow-red animate-slide-up h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-space-grotesk text-glow">
            🏴‍☠️ Recent Hijacks
          </CardTitle>
          <div className="text-xs text-muted-foreground animate-pulse">
            🕘 Last Updated 2 mins ago
          </div>
        </div>
        <p className="text-muted-foreground">
          Live feed of token takeovers
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
          {mockHistory.map((hijack, index) => (
            <div
              key={hijack.id}
              className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:glow-red group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-10 h-10 border border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-lg">
                    {hijack.logo}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground truncate">
                    {hijack.name}
                  </div>
                  <div className="text-primary font-medium text-sm">
                    ${hijack.ticker}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 hover:bg-primary/10 hover:glow-red transition-all duration-300"
                >
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 hover:bg-primary/10 hover:glow-red transition-all duration-300"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="text-right ml-3">
                <div className="text-xs text-muted-foreground font-mono">
                  {hijack.wallet}
                </div>
                <div className="text-xs text-muted-foreground">
                  {hijack.timestamp}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HijackHistory;
