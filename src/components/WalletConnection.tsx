
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, Zap, CheckCircle } from 'lucide-react';

interface WalletConnectionProps {
  isConnected: boolean;
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  isConnected,
  walletAddress,
  onConnect,
  onDisconnect
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hoveredWallet, setHoveredWallet] = useState<string | null>(null);

  const wallets = [
    { name: 'Phantom', icon: '👻' },
    { name: 'Backpack', icon: '🎒' },
    { name: 'Solflare', icon: '☀️' }
  ];

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleWalletSelect = (walletName: string) => {
    console.log(`Selected wallet: ${walletName}`);
    onConnect();
    setIsDialogOpen(false);
  };

  if (isConnected && walletAddress) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-primary/30 glow-red animate-slide-up">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 animate-pulse" />
              <div>
                <div className="text-sm text-green-400 font-medium">✅ Connected</div>
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
                onClick={onDisconnect}
                className="border-primary/30 hover:bg-primary/10 transition-all duration-300"
              >
                Disconnect
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold py-4 text-lg glow-red transition-all duration-300 hover:glow-red-intense button-unlock animate-glow-pulse"
            >
              <Wallet className="w-6 h-6 mr-3" />
              Connect Wallet
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card/95 backdrop-blur-sm border-primary/30 glow-red">
            <DialogHeader>
              <DialogTitle className="text-2xl font-space-grotesk text-center mb-4">
                Select Your Wallet
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <Button
                  key={wallet.name}
                  variant="outline"
                  className={`w-full justify-start gap-3 p-4 text-lg transition-all duration-300 ${
                    hoveredWallet === wallet.name
                      ? 'border-primary bg-primary/10 glow-red-intense'
                      : 'border-border bg-secondary/30 hover:border-primary/50'
                  }`}
                  onMouseEnter={() => setHoveredWallet(wallet.name)}
                  onMouseLeave={() => setHoveredWallet(null)}
                  onClick={() => handleWalletSelect(wallet.name)}
                >
                  <span className="text-2xl">{wallet.icon}</span>
                  <span className="font-medium">{wallet.name}</span>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        
        <p className="text-xs text-muted-foreground text-center mt-4">
          Secure connection • No private keys stored
        </p>
      </CardContent>
    </Card>
  );
};

export default WalletConnection;
