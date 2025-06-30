
import React from 'react';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HijackTimerProps {
  formattedTimeRemaining: string;
}

const HijackTimer: React.FC<HijackTimerProps> = ({ formattedTimeRemaining }) => {
  return (
    <Card className="bg-card/80 backdrop-blur-sm border-primary/30 glow-red mb-8">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl flex items-center justify-center gap-3 text-primary font-space-grotesk">
          <Clock className="w-8 h-8 animate-pulse" />
          Hijacking Launches Soon
        </CardTitle>
      </CardHeader>
      
      <CardContent className="text-center space-y-4">
        <div className="bg-primary/10 p-6 rounded-lg border border-primary/30">
          <div className="text-3xl md:text-4xl font-bold text-primary mb-2 animate-glow-pulse">
            {formattedTimeRemaining}
          </div>
          <div className="text-muted-foreground text-lg">
            until first hijack unlocks
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-foreground font-medium text-lg">
            🚀 First hijack launches at <span className="text-primary font-bold">8:20 PM UTC today</span>
          </p>
          <p className="text-muted-foreground">
            Get ready for the chaos. Prepare your metadata. The billboard awaits.
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>⚡ System armed</span>
          <span>•</span>
          <span>🔥 Countdown active</span>
          <span>•</span>
          <span>💀 Launch imminent</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default HijackTimer;
