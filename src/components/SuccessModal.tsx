import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenName: string;
  ticker: string;
  imagePreview: string | null;
  transactionSignature?: string;
  updateTransactionSignature?: string;
  explorerUrl?: string;
  updateExplorerUrl?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  tokenName,
  ticker,
  imagePreview,
  transactionSignature,
  updateTransactionSignature,
  explorerUrl,
  updateExplorerUrl
}) => {
  const { toast } = useToast();

  if (!isOpen) return null;

  const copyTransactionId = (signature: string, type: string) => {
    navigator.clipboard.writeText(signature);
    toast({
      title: "Copied!",
      description: `${type} transaction ID copied to clipboard`,
    });
  };

  const truncateSignature = (sig: string | Uint8Array | undefined): string => {
    // Safety check: ensure we have a valid signature
    if (!sig) return 'No signature';
    
    // Convert Uint8Array to string if needed (fallback)
    if (sig instanceof Uint8Array) {
      // This should not happen anymore, but keeping as safety fallback
      try {
        // Convert to base58 string
        const encoder = new TextEncoder();
        const base58Chars = '123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let num = sig.reduce((acc, byte, index) => acc + byte * Math.pow(256, sig.length - 1 - index), 0);
        let encoded = '';
        while (num > 0) {
          encoded = base58Chars[num % 58] + encoded;
          num = Math.floor(num / 58);
        }
        sig = encoded || 'Invalid signature';
      } catch (error) {
        console.error('Error converting Uint8Array signature:', error);
        return 'Invalid signature format';
      }
    }
    
    // Ensure it's a string
    if (typeof sig !== 'string') {
      console.error('Signature is not a string:', typeof sig, sig);
      return 'Invalid signature';
    }
    
    // Truncate the string
    if (sig.length < 16) return sig;
    return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-lg bg-card border-primary glow-red-intense animate-scale-in">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 hover:bg-primary/10"
          >
            <X className="w-4 h-4" />
          </Button>
          
          <div className="mb-4">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto animate-pulse" />
          </div>
          
          <CardTitle className="text-3xl font-bold text-primary animate-flicker">
            🎉 HIJACK SUCCESSFUL!
          </CardTitle>
          <p className="text-muted-foreground text-lg mt-2">
            Token metadata permanently updated on Solana mainnet
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-secondary/50 p-6 rounded-lg border border-primary/20">
            <h3 className="text-lg font-bold text-foreground mb-4">New Token Metadata:</h3>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                {imagePreview ? (
                  <img src={imagePreview} alt="New token" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🪙</span>
                )}
              </div>
              
              <div>
                <div className="text-2xl font-bold text-foreground">{tokenName}</div>
                <div className="text-xl text-primary font-medium">${ticker}</div>
                <div className="text-sm text-green-400 mt-1 font-medium">
                  ✅ Confirmed on-chain
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="space-y-4 border-t border-border pt-4">
              {/* Payment Transaction */}
              {transactionSignature && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Payment Transaction:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground">
                        {truncateSignature(transactionSignature)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyTransactionId(transactionSignature, 'Payment')}
                        className="h-6 w-6"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {explorerUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(explorerUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Payment on Explorer
                    </Button>
                  )}
                </div>
              )}

              {/* Update Transaction */}
              {updateTransactionSignature && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Metadata Update:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground">
                        {truncateSignature(updateTransactionSignature)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const sigString = typeof updateTransactionSignature === 'string' 
                            ? updateTransactionSignature 
                            : 'Invalid signature';
                          copyTransactionId(sigString, 'Update');
                        }}
                        className="h-6 w-6"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {updateExplorerUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(updateExplorerUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Update on Explorer
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center space-y-3">
            <div className="text-sm text-muted-foreground">
              Your hijack is now permanent and visible to all Solana users
            </div>
            <div className="text-xs text-primary font-medium">
              🏴‍☠️ Welcome to the hijacker hall of fame
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuccessModal;
