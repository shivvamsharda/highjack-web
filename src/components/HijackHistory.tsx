
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RefreshCw, ExternalLink, Globe, Send, X } from 'lucide-react';
import { useHijackHistory } from '@/hooks/useHijackHistory';
import { formatDistanceToNow } from 'date-fns';

const HijackHistory: React.FC = () => {
  const { hijacks, isLoading, error, refreshHijacks } = useHijackHistory();

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'failed': return '❌';
      default: return '🔄';
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const getTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  if (error) {
    return (
      <Card id="recent-hijacks" className="bg-card/80 backdrop-blur-sm border-primary/30 glow-red animate-slide-up h-fit">
        <CardHeader>
          <CardTitle className="text-2xl font-space-grotesk text-glow">
            🏴‍☠️ Recent Hijacks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Failed to load recent hijacks</p>
            <Button onClick={refreshHijacks} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="recent-hijacks" className="bg-card/80 backdrop-blur-sm border-primary/30 glow-red animate-slide-up h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-space-grotesk text-glow">
            🏴‍☠️ Recent Hijacks
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshHijacks}
              disabled={isLoading}
              className="w-8 h-8 p-0 hover:bg-primary/10"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="text-xs text-muted-foreground animate-pulse">
              🕘 Live Feed
            </div>
          </div>
        </div>
        <p className="text-muted-foreground">
          Live feed of token takeovers
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && hijacks.length === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg animate-pulse">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-secondary/50 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-secondary/50 rounded w-24" />
                    <div className="h-3 bg-secondary/30 rounded w-16" />
                  </div>
                </div>
                <div className="h-3 bg-secondary/30 rounded w-20" />
              </div>
            ))}
          </div>
        ) : hijacks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🏴‍☠️</div>
            <p className="text-muted-foreground mb-2">No hijacks yet</p>
            <p className="text-sm text-muted-foreground">Be the first to hijack a token!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
            {hijacks.map((hijack, index) => (
              <div
                key={hijack.id}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:glow-red group animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="w-10 h-10 border border-primary/20">
                    {hijack.image_uri ? (
                      <AvatarImage src={hijack.image_uri} alt={hijack.token_name} />
                    ) : (
                      <AvatarFallback className="bg-primary/10 text-lg">
                        🪙
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-foreground truncate">
                        {hijack.token_name}
                      </div>
                      <span className="text-sm">{getStatusEmoji(hijack.status)}</span>
                    </div>
                    <div className="text-primary font-medium text-sm">
                      ${hijack.ticker_symbol}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Social Links - only show if user provided them */}
                  {hijack.x_link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 hover:bg-primary/10 hover:glow-red transition-all duration-300"
                      onClick={() => window.open(hijack.x_link!, '_blank')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  {hijack.telegram_link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 hover:bg-primary/10 hover:glow-red transition-all duration-300"
                      onClick={() => window.open(hijack.telegram_link!, '_blank')}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                  {hijack.website_link && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 hover:bg-primary/10 hover:glow-red transition-all duration-300"
                      onClick={() => window.open(hijack.website_link!, '_blank')}
                    >
                      <Globe className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {/* Explorer link - only show if transaction signature exists */}
                  {hijack.transaction_signature && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 hover:bg-primary/10 hover:glow-red transition-all duration-300"
                      onClick={() => window.open(hijack.explorer_url || `https://explorer.solana.com/tx/${hijack.transaction_signature}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                
                <div className="text-right ml-3">
                  <div className="text-xs text-muted-foreground font-mono">
                    {truncateAddress(hijack.wallet_address)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getTimeAgo(hijack.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HijackHistory;
