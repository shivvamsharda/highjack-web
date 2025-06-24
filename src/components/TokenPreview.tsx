
import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Twitter, MessageCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';

interface TokenPreviewProps {
  tokenName: string;
  ticker: string;
  imagePreview: string | null;
  isSubmitting?: boolean;
}

const TokenPreview: React.FC<TokenPreviewProps> = ({
  tokenName,
  ticker,
  imagePreview,
  isSubmitting = false
}) => {
  const { fetchCurrentTokenMetadata, isFetchingCurrent, currentMetadata } = useTokenMetadata();
  const hasUserData = tokenName || ticker || imagePreview;

  useEffect(() => {
    // Fetch current metadata when component mounts
    fetchCurrentTokenMetadata();
  }, []);

  const handleRefreshCurrent = () => {
    fetchCurrentTokenMetadata();
  };

  return (
    <Card className={`bg-card/90 backdrop-blur-sm border-primary/30 transition-all duration-500 glow-red ${
      hasUserData ? 'animate-slide-up opacity-100' : 'opacity-90'
    } ${isSubmitting ? 'animate-unlock' : ''}`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Current Token Section */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
              <span>🔍 Current Token On-Chain</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshCurrent}
                disabled={isFetchingCurrent}
                className="h-6 w-6 p-0 hover:bg-primary/20"
              >
                <RefreshCw className={`w-3 h-3 ${isFetchingCurrent ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            {isFetchingCurrent ? (
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Loading current token...</span>
              </div>
            ) : currentMetadata ? (
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-16 h-16 border-2 border-secondary/50">
                  {currentMetadata.image ? (
                    <AvatarImage src={currentMetadata.image} alt="Current token" className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-secondary/80 text-lg">
                      🪙
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="space-y-1">
                  <div className="font-bold text-lg text-foreground">
                    {currentMetadata.name}
                  </div>
                  <div className="text-muted-foreground font-medium">
                    ${currentMetadata.symbol}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 text-muted-foreground">
                <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center">
                  ❌
                </div>
                <span className="text-sm">Failed to load current token</span>
              </div>
            )}
          </div>

          {/* Arrow separator when user has input */}
          {hasUserData && (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3 text-primary">
                <div className="h-px bg-primary/30 flex-1" />
                <ArrowRight className="w-6 h-6 animate-pulse" />
                <div className="h-px bg-primary/30 flex-1" />
              </div>
            </div>
          )}

          {/* Your Hijack Preview Section */}
          {hasUserData && (
            <div className="text-center space-y-4">
              <div className="text-sm text-primary font-medium mb-3">
                🏴‍☠️ Your Planned Hijack
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-20 h-20 border-2 border-primary/50 transition-all duration-300 glow-red">
                  {imagePreview ? (
                    <AvatarImage src={imagePreview} alt="Token preview" className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-secondary/80 text-2xl">
                      🪙
                    </AvatarFallback>
                  )}
                </Avatar>
                
                <div className="space-y-2">
                  <div className="font-bold text-xl text-foreground">
                    {tokenName || 'Token Name'}
                  </div>
                  <div className="text-primary font-medium text-lg">
                    ${ticker || 'TICK'}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-10 h-10 p-0 border border-primary/30 hover:bg-primary/20 hover:glow-red transition-all duration-300 bg-secondary/60"
                    disabled={!hasUserData}
                  >
                    <Twitter className="w-4 h-4 text-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-10 h-10 p-0 border border-primary/30 hover:bg-primary/20 hover:glow-red transition-all duration-300 bg-secondary/60"
                    disabled={!hasUserData}
                  >
                    <MessageCircle className="w-4 h-4 text-foreground" />
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Your hijacked metadata
                </div>
              </div>
            </div>
          )}

          {/* Empty state when no user input */}
          {!hasUserData && (
            <div className="text-center space-y-4 opacity-60">
              <div className="text-sm text-muted-foreground mb-3">
                👀 Preview Your Hijack
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-20 h-20 border-2 border-secondary/50">
                  <AvatarFallback className="bg-secondary/80 text-2xl">
                    🪙
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-2">
                  <div className="font-bold text-xl text-muted-foreground">
                    Enter details to preview
                  </div>
                  <div className="text-muted-foreground font-medium text-lg">
                    $SYMBOL
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Fill the form to see your hijack
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenPreview;
