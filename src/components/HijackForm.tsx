
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, AlertCircle, Lock, Unlock, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';
import FloatingLabelInput from './FloatingLabelInput';
import DragDropZone from './DragDropZone';
import TokenPreview from './TokenPreview';
import SuccessModal from './SuccessModal';

interface HijackFormProps {
  isConnected: boolean;
}

const HijackForm: React.FC<HijackFormProps> = ({ isConnected }) => {
  const { publicKey } = useWallet();
  const [tokenName, setTokenName] = useState('');
  const [ticker, setTicker] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState<string>('');
  const [explorerUrl, setExplorerUrl] = useState<string>('');
  const { toast } = useToast();

  const { updateTokenMetadata, isUpdating, progress } = useTokenMetadata();

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

    if (!publicKey) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    const result = await updateTokenMetadata({
      tokenName,
      ticker,
      imageFile,
      userWalletAddress: publicKey.toBase58()
    });

    if (result.success && result.transactionSignature) {
      setTransactionSignature(result.transactionSignature);
      setExplorerUrl(result.explorerUrl || '');
      setShowSuccess(true);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    // Reset form
    setTokenName('');
    setTicker('');
    setImageFile(null);
    setImagePreview(null);
    setTransactionSignature('');
    setExplorerUrl('');
  };

  const isFormValid = tokenName && ticker && imageFile && isConnected;
  const LockIcon = isFormValid ? Unlock : Lock;

  return (
    <>
      <div className={`space-y-6 transition-all duration-500 ${isConnected ? 'animate-slide-up' : 'opacity-60'}`}>
        {/* Token Preview */}
        <TokenPreview
          tokenName={tokenName}
          ticker={ticker}
          imagePreview={imagePreview}
          isSubmitting={isUpdating}
        />

        {/* Hijack Form */}
        <Card className={`bg-card/80 backdrop-blur-sm border-border transition-all duration-300 ${isConnected ? 'border-primary/30 glow-red' : ''}`}>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl flex items-center gap-3 text-glow font-space-grotesk">
              <Zap className="w-8 h-8 text-primary animate-pulse" />
              Hijack Token Metadata
            </CardTitle>
            <p className="text-muted-foreground text-lg">
              Steal the billboard. Make it yours. Leave your mark on-chain.
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FloatingLabelInput
                  id="tokenName"
                  label="New Token Name"
                  value={tokenName}
                  onChange={setTokenName}
                  placeholder="Enter the new identity..."
                  disabled={!isConnected || isUpdating}
                />

                <FloatingLabelInput
                  id="ticker"
                  label="New Ticker Symbol"
                  value={ticker}
                  onChange={setTicker}
                  placeholder="SYMBOL"
                  maxLength={10}
                  disabled={!isConnected || isUpdating}
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
                  disabled={!isConnected || isUpdating}
                />
              </div>

              <div className="bg-secondary/30 p-6 rounded-lg border border-primary/20 neon-red">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-primary mt-1 animate-pulse" />
                  <div>
                    <div className="text-primary font-bold text-lg mb-2">
                      ⚡ Real On-Chain Update
                    </div>
                    <p className="text-muted-foreground">
                      This hijack costs <span className="text-primary font-bold text-lg">0.1 SOL</span> to 
                      permanently update the token metadata on Solana mainnet.
                    </p>
                    <div className="text-xs text-muted-foreground mt-2">
                      • Payment required • IPFS storage • Metaplex update • Transaction verified
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress indicator */}
              {isUpdating && progress && (
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-primary font-medium">{progress}</span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={!isFormValid || isUpdating}
                className={`w-full h-16 text-xl font-bold transition-all duration-300 button-unlock hover:shadow-2xl active:scale-95 ${
                  isFormValid 
                    ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 glow-red hover:glow-red-intense animate-glow-pulse' 
                    : 'bg-secondary border border-border'
                } ${isUpdating ? 'animate-unlock' : ''}`}
              >
                {isUpdating ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    {progress || 'Processing...'}
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
        transactionSignature={transactionSignature}
        explorerUrl={explorerUrl}
      />
    </>
  );
};

export default HijackForm;
