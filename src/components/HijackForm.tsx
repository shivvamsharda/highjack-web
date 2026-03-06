import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { CheckCircle, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTokenMetadata } from '@/hooks/useTokenMetadata';
import { useHijackFeeContext } from '@/contexts/HijackFeeContext';
import { useHijackTimer } from '@/hooks/useHijackTimer';
import FloatingLabelInput from './FloatingLabelInput';
import DragDropZone from './DragDropZone';
import SuccessModal from './SuccessModal';
import HijackTimer from './HijackTimer';

interface HijackFormProps {
  isConnected: boolean;
}

const HijackForm: React.FC<HijackFormProps> = ({ isConnected }) => {
  const { publicKey } = useWallet();
  const { toast } = useToast();
  const { updateTokenMetadata, isUpdating, progress } = useTokenMetadata();
  const { feeInfo, isLoading: isFeeLoading, error: feeError } = useHijackFeeContext();
  const { isHijackingAllowed, formattedTimeRemaining } = useHijackTimer();

  const [tokenName, setTokenName] = useState('');
  const [ticker, setTicker] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionSignature, setTransactionSignature] = useState('');
  const [updateTransactionSignature, setUpdateTransactionSignature] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');
  const [updateExplorerUrl, setUpdateExplorerUrl] = useState('');

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

    if (!isHijackingAllowed) {
      toast({
        title: 'Forge Locked',
        description: 'Wait for the launch countdown before forging a new takeover.',
        variant: 'destructive',
      });
      return;
    }

    if (!tokenName || !ticker || !imageFile) {
      toast({
        title: 'Missing Information',
        description: 'Name, symbol, and image are required.',
        variant: 'destructive',
      });
      return;
    }

    if (!publicKey) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Connect your wallet first.',
        variant: 'destructive',
      });
      return;
    }

    if (!feeInfo) {
      toast({
        title: 'Fee Loading',
        description: 'Current forge fee is still loading. Try again in a moment.',
        variant: 'destructive',
      });
      return;
    }

    const result = await updateTokenMetadata({
      tokenName,
      ticker,
      imageFile,
      userWalletAddress: publicKey.toBase58(),
      currentFee: feeInfo.currentFee,
      description: description.trim() || undefined,
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
    setTokenName('');
    setTicker('');
    setDescription('');
    setImageFile(null);
    setImagePreview(null);
    setTransactionSignature('');
    setUpdateTransactionSignature('');
    setExplorerUrl('');
    setUpdateExplorerUrl('');
  };

  const isFormValid = !!tokenName && !!ticker && !!imageFile && isConnected && !!feeInfo && isHijackingAllowed;
  const LockIcon = isFormValid ? Unlock : Lock;

  const getProgressIcon = () => {
    if (
      progress?.includes('Waiting for transaction confirmation') ||
      progress?.includes('Payment confirmed and finalized')
    ) {
      return <CheckCircle className="h-5 w-5 text-emerald-400" />;
    }
    return <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />;
  };

  return (
    <>
      <div className={`mx-auto w-full max-w-[44rem] transition-all duration-500 ${isConnected ? 'opacity-100' : 'opacity-90'}`}>
        {!isHijackingAllowed && formattedTimeRemaining && (
          <div className="mb-4 rounded-md border border-[#6a3146] bg-[rgba(18,6,13,0.82)] p-3">
            <HijackTimer formattedTimeRemaining={formattedTimeRemaining} />
          </div>
        )}

        <div className={`forge-form-shell forge-form-shell-compact ${!isHijackingAllowed ? 'opacity-80' : ''}`}>
          <div className="forge-panel-head">
            <div className="forge-panel-title">Forge Metadata</div>
            <p className="forge-panel-subtitle">Rename, re-symbol, and rebrand in one on-chain update.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5 md:space-y-3">
            <FloatingLabelInput
              id="tokenName"
              label="Name"
              value={tokenName}
              onChange={setTokenName}
              placeholder="Enter Name"
              disabled={!isConnected || !isHijackingAllowed || isUpdating}
            />

            <FloatingLabelInput
              id="ticker"
              label="Symbol"
              value={ticker}
              onChange={setTicker}
              placeholder="Enter Symbol"
              maxLength={10}
              disabled={!isConnected || !isHijackingAllowed || isUpdating}
              transform={(value) => value.toUpperCase()}
            />

            <div className="forge-input-row">
              <label htmlFor="description" className="forge-input-label">
                Description
              </label>
              <span className="forge-colon">:</span>
              <div className="relative flex-1">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe token intent"
                  disabled={!isConnected || !isHijackingAllowed || isUpdating}
                  maxLength={250}
                  rows={2}
                  className="forge-input min-h-[44px] resize-none pr-16 pt-2.5 text-sm placeholder:text-[#7a5a66]"
                />
                <div className="forge-counter">{description.length}/250</div>
              </div>
            </div>

            <DragDropZone
              onFileUpload={handleImageUpload}
              imagePreview={imagePreview}
              disabled={!isConnected || !isHijackingAllowed || isUpdating}
            />

            {isUpdating && progress && (
              <div className="rounded-md border border-primary/40 bg-primary/10 p-3">
                <div className="flex items-center gap-3">
                  {getProgressIcon()}
                  <span className="text-sm font-medium text-[#f6d5df]">{progress}</span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={!isFormValid || isUpdating}
              className={`forge-submit-btn forge-submit-btn-compact mx-auto mt-3 h-14 w-full max-w-[300px] text-[2rem] font-black uppercase tracking-[0.08em] ${
                isUpdating ? 'opacity-90' : ''
              }`}
            >
              {isUpdating ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                  Processing
                </span>
              ) : !isHijackingAllowed ? (
                <span className="flex items-center gap-2 text-lg">
                  <Lock className="h-5 w-5" />
                  Locked
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LockIcon className="h-5 w-5" />
                  Forge
                </span>
              )}
            </Button>

            <div className="forge-meta-bar">
              <div className="forge-chip">
                Fee {isFeeLoading ? '...' : feeError ? '0.10' : feeInfo?.currentFee.toFixed(2)} SOL
              </div>
              <div className="forge-chip">
                {isConnected ? 'Wallet Connected' : 'Wallet Needed'}
              </div>
              <div className="forge-chip">
                {isHijackingAllowed ? 'Forge Open' : 'Forge Locked'}
              </div>
            </div>
          </form>
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
