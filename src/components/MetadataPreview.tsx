
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetadataPreviewProps {
  tokenName: string;
  ticker: string;
  imagePreview: string | null;
}

const MetadataPreview: React.FC<MetadataPreviewProps> = ({
  tokenName,
  ticker,
  imagePreview
}) => {
  const hasData = tokenName || ticker || imagePreview;

  if (!hasData) return null;

  return (
    <Card className="bg-secondary/30 border-primary/20 animate-slide-up">
      <CardHeader>
        <CardTitle className="text-lg text-primary flex items-center gap-2">
          👀 Preview: Your Token After Hijack
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border border-primary/10">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
            {imagePreview ? (
              <img src={imagePreview} alt="Token preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">🪙</span>
            )}
          </div>
          <div>
            <div className="font-bold text-lg text-foreground">
              {tokenName || 'Token Name'}
            </div>
            <div className="text-primary font-medium">
              ${ticker || 'TICK'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Your hijacked metadata
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MetadataPreview;
