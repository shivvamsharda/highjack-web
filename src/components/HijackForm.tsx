
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, AlertCircle, Lock, Unlock, ExternalLink, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
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
  const [updateTransactionSignature, setUpdateTransactionSignature] = useState<string>('');
  const [explorerUrl, setExplorerUrl] = useState<string>('');
  const [updateExplorerUrl, setUpdateExplorerUrl] = useState<string>('');
  const { toast } = useToast();

  const { updateTokenMetadata, isUpdating, progress, feeInfo, isFeeLoading, feeError } = useTokenMetadata();

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

    if (!feeInfo) {
      toast({
        title: "Fee Loading",
        description: "Please wait for the current fee to load.",
        variant: "destructive",
      });
      return;
    }

    const result = await updateTokenMetadata({
      tokenName,
      ticker,
      imageFile,
      userWalletAddress: publicKey.toBase58(),
      currentFee: feeInfo.currentFee
    });

    if (result.success && result.transactionSignature) {
      setTransactionSignature(result.transactionSignature);
      setUpdateTransactionSignature(result.updateTransactionSignature || '');
      setExplorerUrl(result.explorerUrl || '');
      setUpdateExplorerUrl(result.updateExplorerUrl || '');
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
    setUpdateTransactionSignature('');
    setExplorerUrl('');
    setUpdateExplorerUrl('');
  };

  const isFormValid = tokenName && ticker && imageFile && isConnected && feeInfo;
  const LockIcon = isFormValid ? Unlock : Lock;

  // Enhanced progress indicator with finality stages
  const getProgressIcon = () => {
    if (progress.includes('Waiting for transaction confirmation') || 
        progress.includes('Payment confirmed and finalized')) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />;
  };

  // Format countdown timer
  const formatCountdown = (minutes: number | null) => {
    if (minutes === null) return 'No recent hijacks';
    if (minutes === 0) return 'Fee decrease imminent!';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m until fee decrease`;
    }
    return `${mins}m until fee decrease`;
  };

  return (
    <>
      <div className={`transition-all duration-500 ${isConnected ? 'animate-slide-up' : 'opacity-60'}`}>
        {/* Two Column Layout - Preview Left, Form Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Token Preview */}
          <div className="space-y-6">
            <TokenPreview
              tokenName={tokenName}
              ticker={ticker}
              imagePreview={imagePreview}
              isSubmitting={isUpdating}
            />
          </div>

          {/* Right Column - Hijack Form */}
          <div className="space-y-6">
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
                  <div className="grid grid-cols-1 gap-6">
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

                  {/* Dynamic Fee Display */}
                  <div className="bg-secondary/30 p-6 rounded-lg border border-primary/20 neon-red">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-6 h-6 text-primary mt-1 animate-pulse" />
                      <div className="flex-1">
                        <div className="text-primary font-bold text-lg mb-2">
                          ⚡ Dynamic Hijack Pricing
                        </div>
                        
                        {isFeeLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            <span className="text-muted-foreground">Loading current fee...</span>
                          </div>
                        ) : feeError ? (
                          <p className="text-red-400">
                            Error loading fee. Using fallback: <span className="font-bold">0.1 SOL</span>
                          </p>
                        ) : feeInfo ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Current hijack cost:</span>
                              <span className="text-primary font-bold text-xl">{feeInfo.currentFee} SOL</span>
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Next hijack will cost:</span>
                              <span className="text-orange-400 font-bold">{feeInfo.nextFeeAfterHijack} SOL</span>
                            </div>

                            {feeInfo.nextDecreaseIn !== null && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-400" />
                                <span className="text-blue-400 text-sm">
                                  {formatCountdown(feeInfo.nextDecreaseIn)}
                                </span>
                                {feeInfo.nextDecreaseIn > 0 && <TrendingDown className="w-4 h-4 text-blue-400" />}
                              </div>
                            )}
                          </div>
                        ) : null}
                        
                        <div className="text-xs text-muted-foreground mt-2">
                          • Fee increases by 0.1 SOL after each hijack • Decreases by 0.1 SOL every hour without hijacks • Minimum fee: 0.1 SOL
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced progress indicator */}
                  {isUpdating && progress && (
                    <div className="bg-primary/10 p-4 rounded-lg border border-primary/30">
                      <div className="flex items-center gap-3">
                        {getProgressIcon()}
                        <div className="flex-1">
                          <span className="text-primary font-medium">{progress}</span>
                          {progress.includes('confirmation') && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Verifying transaction finality with 32+ confirmations...
                            </div>
                          )}
                        </div>
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
                        🔓 Pay {feeInfo?.currentFee || '...'} SOL to Hijack
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
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccess}
        onClose={handleSuccessClose}
        tokenName={tokenName}
        ticker={ticker}
        imagePreview={imagePreview}
        transactionSignature={transactionSignature}
        updateTransactionSignature={updateTransactionSignature}
        explorerUrl={explorerUrl}
        updateExplorerUrl={updateExplorerUrl}
      />
    </>
  );
};

export default HijackForm;
