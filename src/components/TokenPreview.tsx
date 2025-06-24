
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Twitter, MessageCircle, ArrowRight, RefreshCw, ExternalLink, Shield, TrendingUp, Copy } from 'lucide-react';
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

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className={`bg-card/90 backdrop-blur-sm border-primary/30 transition-all duration-500 glow-red h-fit ${
      hasUserData ? 'animate-slide-up opacity-100' : 'opacity-90'
    } ${isSubmitting ? 'animate-unlock' : ''}`}>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2 text-glow font-space-grotesk">
          👁️ Token Preview
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Current Token Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
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
            <div className="space-y-4">
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
                
                <div className="space-y-1 text-center">
                  <div className="font-bold text-lg text-foreground">
                    {currentMetadata.name}
                  </div>
                  <div className="text-muted-foreground font-medium">
                    ${currentMetadata.symbol}
                  </div>
                </div>
              </div>

              {/* Token Information */}
              <div className="space-y-3 bg-secondary/20 p-4 rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Token Information
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mint Address:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{truncateAddress(currentMetadata.mintAddress)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => copyToClipboard(currentMetadata.mintAddress)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Update Authority:</span>
                    <span className="font-mono">{truncateAddress(currentMetadata.updateAuthority)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Metadata URI:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono">{truncateAddress(currentMetadata.metadataUri)}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Statistics */}
              <div className="space-y-3 bg-secondary/20 p-4 rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Token Stats
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Holders</div>
                    <div className="font-semibold">1,247</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Market Cap</div>
                    <div className="font-semibold">$42.6K</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">24h Volume</div>
                    <div className="font-semibold">$8.2K</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Last Updated</div>
                    <div className="font-semibold">2h ago</div>
                  </div>
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
          <div className="space-y-4">
            <div className="text-sm text-primary font-medium text-center">
              🏴‍☠️ Your Planned Hijack
            </div>
            
            <div className="space-y-4">
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
                
                <div className="space-y-2 text-center">
                  <div className="font-bold text-xl text-foreground">
                    {tokenName || 'Token Name'}
                  </div>
                  <div className="text-primary font-medium text-lg">
                    ${ticker || 'TICK'}
                  </div>
                </div>
              </div>

              {/* What Will Change */}
              <div className="space-y-3 bg-primary/10 p-4 rounded-lg border border-primary/30">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  🔄 What Will Change
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-primary font-semibold">
                      {currentMetadata?.name} → {tokenName || 'New Name'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Symbol:</span>
                    <span className="text-primary font-semibold">
                      ${currentMetadata?.symbol} → ${ticker || 'NEW'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Image:</span>
                    <span className="text-primary font-semibold">
                      {imagePreview ? 'Updated' : 'No change'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Media Preview */}
              <div className="space-y-3 bg-secondary/20 p-4 rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  📱 Social Media Preview
                </h4>
                <div className="space-y-3">
                  {/* Twitter Preview */}
                  <div className="bg-card p-3 rounded border border-border">
                    <div className="flex items-start gap-2">
                      <Avatar className="w-8 h-8">
                        {imagePreview ? (
                          <AvatarImage src={imagePreview} alt="Token" />
                        ) : (
                          <AvatarFallback>🪙</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-sm truncate">
                            {tokenName || 'Token Name'}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            ${ticker || 'TICK'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Just got hijacked! 🏴‍☠️
                        </p>
                      </div>
                      <Twitter className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>

                  {/* Discord Preview */}
                  <div className="bg-card p-3 rounded border border-border">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        {imagePreview ? (
                          <AvatarImage src={imagePreview} alt="Token" />
                        ) : (
                          <AvatarFallback className="text-xs">🪙</AvatarFallback>
                        )}
                      </Avatar>
                      <span className="font-semibold text-sm">
                        {tokenName || 'Token Name'} (${ticker || 'TICK'})
                      </span>
                      <MessageCircle className="w-4 h-4 text-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="space-y-3 bg-secondary/20 p-4 rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  ⚙️ Technical Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Network</div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">Solana</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Standard</div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">Metaplex</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Storage</div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">IPFS</Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Cost</div>
                    <div className="text-primary font-semibold">0.1 SOL</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no user input */}
        {!hasUserData && (
          <div className="space-y-4">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenPreview;
