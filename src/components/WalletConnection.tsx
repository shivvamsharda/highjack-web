
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Zap } from 'lucide-react';

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
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (isConnected && walletAddress) {
    return (
      <Card className="bg-card border-primary/20 glow-red">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">
                {truncateAddress(walletAddress)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnect}
              className="border-primary/30 hover:bg-primary/10"
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-xl flex items-center justify-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Connect Your Wallet
        </CardTitle>
        <p className="text-muted-foreground">
          Connect your Solana wallet to start hijacking tokens
        </p>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onConnect}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 glow-red transition-all duration-300 hover:glow-red-intense"
        >
          <Wallet className="w-5 h-5 mr-2" />
          Connect Wallet
        </Button>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Supports Phantom, Solflare, Backpack & more
        </p>
      </CardContent>
    </Card>
  );
};

export default WalletConnection;
