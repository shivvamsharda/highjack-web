
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, AlertCircle, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FloatingLabelInput from './FloatingLabelInput';
import DragDropZone from './DragDropZone';
import MetadataPreview from './MetadataPreview';
import SuccessModal from './SuccessModal';

interface HijackFormProps {
  isConnected: boolean;
}

const HijackForm: React.FC<HijackFormProps> = ({ isConnected }) => {
  const [tokenName, setTokenName] = useState('');
  const [ticker, setTicker] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenName || !ticker || !imageFile) {
      toast({
        title: "Missing Information",
        description: "Fill all fields to complete the hijack.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate payment and metadata update
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const success = Math.random() > 0.2; // 80% success rate
      
      if (success) {
        setShowSuccess(true);
        toast({
          title: "Hijack Complete! 🎯",
          description: "Token metadata updated successfully.",
        });
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error) {
      toast({
        title: "Hijack Failed",
        description: "Transaction failed. Your SOL is safe.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    // Reset form
    setTokenName('');
    setTicker('');
    setImageFile(null);
    setImagePreview(null);
  };

  const isFormValid = tokenName && ticker && imageFile && isConnected;
  const LockIcon = isFormValid ? Unlock : Lock;

  return (
    <>
      <div className={`space-y-6 transition-all duration-500 ${isConnected ? 'animate-slide-up' : 'opacity-60'}`}>
        <Card className={`bg-card/80 backdrop-blur-sm border-border transition-all duration-300 ${isConnected ? 'border-primary/30 glow-red' : ''}`}>
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-3 text-glow font-space-grotesk">
              <Zap className="w-8 h-8 text-primary animate-pulse" />
              Hijack Token Metadata
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Steal the billboard. Make it yours. Leave your mark on-chain.
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingLabelInput
                  id="tokenName"
                  label="New Token Name"
                  value={tokenName}
                  onChange={setTokenName}
                  placeholder="Enter the new identity..."
                  disabled={!isConnected}
                />

                <FloatingLabelInput
                  id="ticker"
                  label="New Ticker Symbol"
                  value={ticker}
                  onChange={setTicker}
                  placeholder="SYMBOL"
                  maxLength={10}
                  disabled={!isConnected}
                  transform={(value) => value.toUpperCase()}
                />
              </div>

              <div>
                <label className="block text-foreground font-medium text-lg mb-3">
                  New Profile Picture
                </label>
                <DragDropZone
                  onFileUpload={handleImageUpload}
                  imagePreview={imagePreview}
                  disabled={!isConnected}
                />
              </div>

              <MetadataPreview
                tokenName={tokenName}
                ticker={ticker}
                imagePreview={imagePreview}
              />

              <div className="bg-secondary/30 p-6 rounded-lg border border-primary/20 neon-red">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-primary mt-1 animate-pulse" />
                  <div>
                    <div className="text-primary font-bold text-lg mb-2">
                      ⚡ Payment Required
                    </div>
                    <p className="text-muted-foreground">
                      This hijack costs <span className="text-primary font-bold text-lg">0.1 SOL</span> to 
                      overwrite the token metadata permanently on-chain.
                    </p>
                    <div className="text-xs text-muted-foreground mt-2">
                      • Non-refundable • Instant execution • Degen approved
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={`w-full h-16 text-xl font-bold transition-all duration-300 button-unlock ${
                  isFormValid 
                    ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 glow-red hover:glow-red-intense animate-glow-pulse' 
                    : 'bg-secondary border border-border'
                } ${isSubmitting ? 'animate-unlock' : ''}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processing Payment...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <LockIcon className="w-6 h-6" />
                    🔓 Pay 0.1 SOL to Hijack
                  </div>
                )}
              </Button>

              {!isConnected && (
                <p className="text-center text-muted-foreground">
                  Connect your wallet above to start the hijack
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <SuccessModal
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        tokenName={tokenName}
        ticker={ticker}
        imagePreview={imagePreview}
      />
    </>
  );
};

export default HijackForm;
