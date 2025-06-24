
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HijackFormProps {
  isConnected: boolean;
}

const HijackForm: React.FC<HijackFormProps> = ({ isConnected }) => {
  const [tokenName, setTokenName] = useState('');
  const [ticker, setTicker] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenName || !ticker || !imageFile) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and upload an image.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate payment process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate random success/failure for demo
      const success = Math.random() > 0.3;
      
      if (success) {
        setPaymentSuccess(true);
        toast({
          title: "Hijack Successful! 🎯",
          description: "Token metadata has been updated successfully.",
        });
        
        // Reset form after success
        setTimeout(() => {
          setTokenName('');
          setTicker('');
          setImageFile(null);
          setImagePreview(null);
          setPaymentSuccess(false);
        }, 3000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      toast({
        title: "Hijack Failed",
        description: "Transaction failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = tokenName && ticker && imageFile && isConnected;

  return (
    <Card className={`bg-card border-border transition-all duration-300 ${isConnected ? 'border-primary/30 glow-red' : 'opacity-60'}`}>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2 text-glow">
          <Zap className="w-6 h-6 text-primary" />
          Hijack Token Metadata
        </CardTitle>
        <p className="text-muted-foreground">
          Pay 0.1 SOL to take control of the token's identity
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="tokenName" className="text-foreground font-medium">
              New Token Name
            </Label>
            <Input
              id="tokenName"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder="Enter new token name..."
              disabled={!isConnected}
              className="mt-2 bg-input border-border focus:border-primary focus:ring-primary"
            />
          </div>

          <div>
            <Label htmlFor="ticker" className="text-foreground font-medium">
              New Ticker Symbol
            </Label>
            <Input
              id="ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="TICK"
              maxLength={10}
              disabled={!isConnected}
              className="mt-2 bg-input border-border focus:border-primary focus:ring-primary"
            />
          </div>

          <div>
            <Label htmlFor="image" className="text-foreground font-medium">
              New Profile Picture
            </Label>
            <div className="mt-2">
              <label
                htmlFor="image"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isConnected 
                    ? 'border-primary/50 hover:border-primary bg-input hover:bg-input/80' 
                    : 'border-border bg-muted cursor-not-allowed'
                }`}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span>
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG or GIF</p>
                  </div>
                )}
                <input
                  id="image"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={!isConnected}
                />
              </label>
            </div>
          </div>

          <div className="bg-secondary/50 p-4 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Payment Required</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This action requires a payment of <span className="text-primary font-semibold">0.1 SOL</span> to update the token metadata.
            </p>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 text-lg transition-all duration-300 glow-red hover:glow-red-intense disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Processing Payment...
              </div>
            ) : paymentSuccess ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Hijack Complete!
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Hijack This Token (0.1 SOL)
              </div>
            )}
          </Button>

          {!isConnected && (
            <p className="text-center text-sm text-muted-foreground">
              Connect your wallet to start hijacking
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default HijackForm;
