
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, RefreshCw, ExternalLink, Shield, Globe, Send, X, AlertTriangle, Copy } from 'lucide-react';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';
import LoadingSkeleton from './LoadingSkeleton';

interface TokenPreviewProps {
  tokenName: string;
  ticker: string;
  description?: string;
  imagePreview: string | null;
  xLink?: string;
  telegramLink?: string;
  websiteLink?: string;
  isSubmitting?: boolean;
}

const TokenPreview: React.FC<TokenPreviewProps> = ({
  tokenName,
  ticker,
  description,
  imagePreview,
  xLink,
  telegramLink,
  websiteLink,
  isSubmitting = false
}) => {
  const { fetchCurrentTokenMetadata, isFetchingCurrent, currentMetadata } = useTokenMetadata();
  const hasUserData = tokenName || ticker || imagePreview;
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

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

  const openFullscreen = (imageUrl: string) => {
    setFullscreenImage(imageUrl);
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  const hasSocialLinks = xLink || telegramLink || websiteLink;

  return (
    <>
      <Card className={`bg-card/90 backdrop-blur-sm border-primary/30 transition-all duration-500 glow-red h-full ${
        hasUserData ? 'animate-slide-up opacity-100' : 'opacity-90'
      } ${isSubmitting ? 'animate-unlock' : ''}`}>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-glow font-space-grotesk">
            👁️ Token Preview
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4 h-full flex flex-col">
          {/* Current Token Section */}
          <div className="space-y-3">
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
              <LoadingSkeleton type="token" />
            ) : currentMetadata ? (
              <div className="space-y-3">
                <div className="flex flex-col items-center space-y-3">
                  <Avatar 
                    className="w-14 h-14 border-2 border-secondary/50 cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => currentMetadata.image && openFullscreen(currentMetadata.image)}
                  >
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
                <div className="space-y-2 bg-secondary/20 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Token Information
                  </h4>
                  <div className="space-y-1 text-xs">
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
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 text-muted-foreground">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div className="text-center space-y-1">
                  <span className="text-sm font-medium text-red-400">Connection Issue</span>
                  <span className="text-xs">Unable to load current token data</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshCurrent}
                    className="mt-2 text-xs"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </div>
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
            <div className="space-y-3 flex-1">
              <div className="text-sm text-primary font-medium text-center">
                🏴‍☠️ Your Planned Hijack
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col items-center space-y-3">
                  <Avatar 
                    className="w-16 h-16 border-2 border-primary/50 transition-all duration-300 glow-red cursor-pointer hover:scale-110"
                    onClick={() => imagePreview && openFullscreen(imagePreview)}
                  >
                    {imagePreview ? (
                      <AvatarImage src={imagePreview} alt="Token preview" className="object-cover" />
                    ) : (
                      <AvatarFallback className="bg-secondary/80 text-2xl">
                        🪙
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className="space-y-1 text-center">
                    <div className="font-bold text-xl text-foreground">
                      {tokenName || 'Token Name'}
                    </div>
                    <div className="text-primary font-medium text-lg">
                      ${ticker || 'TICK'}
                    </div>
                    {description && (
                      <div className="text-sm text-muted-foreground max-w-xs">
                        {description}
                      </div>
                    )}
                  </div>
                </div>

                {/* What Will Change */}
                <div className="space-y-2 bg-primary/10 p-3 rounded-lg border border-primary/30">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    🔄 What Will Change
                  </h4>
                  <div className="space-y-1 text-xs">
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Description:</span>
                      <span className="text-primary font-semibold">
                        {description ? 'Updated' : 'No change'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Social Links Preview */}
                <div className="space-y-2 bg-secondary/20 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    🔗 Social Links
                  </h4>
                  {hasSocialLinks ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {xLink && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs hover:bg-primary/10"
                          onClick={() => window.open(xLink, '_blank')}
                        >
                          X (Twitter)
                        </Button>
                      )}
                      {telegramLink && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs hover:bg-primary/10"
                          onClick={() => window.open(telegramLink, '_blank')}
                        >
                          <Send className="w-3 h-3 mr-1" />
                          Telegram
                        </Button>
                      )}
                      {websiteLink && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs hover:bg-primary/10"
                          onClick={() => window.open(websiteLink, '_blank')}
                        >
                          <Globe className="w-3 h-3 mr-1" />
                          Website
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Add social links to display here
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty state when no user input */}
          {!hasUserData && (
            <div className="space-y-4 flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 opacity-60">
                <div className="text-sm text-muted-foreground mb-3">
                  👀 Preview Your Hijack
                </div>
                
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-16 h-16 border-2 border-secondary/50">
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

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center cursor-pointer"
          onClick={closeFullscreen}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={closeFullscreen}
            >
              <X className="w-6 h-6" />
            </Button>
            <img 
              src={fullscreenImage} 
              alt="Fullscreen token image" 
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default TokenPreview;
