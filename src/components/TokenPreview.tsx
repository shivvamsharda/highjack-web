
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Twitter, MessageCircle } from 'lucide-react';

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
  const hasData = tokenName || ticker || imagePreview;

  return (
    <Card className={`bg-secondary/30 border-primary/20 transition-all duration-500 ${
      hasData ? 'animate-slide-up opacity-100' : 'opacity-50'
    } ${isSubmitting ? 'animate-unlock' : ''}`}>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="text-sm text-primary font-medium mb-3">
            👀 Token Preview
          </div>
          
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20 border-2 border-primary/30 transition-all duration-300">
              {imagePreview ? (
                <AvatarImage src={imagePreview} alt="Token preview" className="object-cover" />
              ) : (
                <AvatarFallback className="bg-secondary text-2xl">
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
                className="w-10 h-10 p-0 border border-primary/20 hover:bg-primary/10 hover:glow-red transition-all duration-300"
                disabled={!hasData}
              >
                <Twitter className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 h-10 p-0 border border-primary/20 hover:bg-primary/10 hover:glow-red transition-all duration-300"
                disabled={!hasData}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Your hijacked metadata
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenPreview;
