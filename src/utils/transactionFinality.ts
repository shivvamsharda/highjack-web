
import { Connection, TransactionSignature } from '@solana/web3.js';

export interface TransactionFinalityResult {
  isFinalized: boolean;
  confirmations: number;
  blockTime?: number;
  slot?: number;
  error?: string;
}

export interface FinalityOptions {
  minConfirmations?: number;
  maxWaitTime?: number;
  checkInterval?: number;
  maxAge?: number;
}

export async function waitForTransactionFinality(
  connection: Connection,
  signature: TransactionSignature,
  options: FinalityOptions = {}
): Promise<TransactionFinalityResult> {
  const {
    minConfirmations = 32,
    maxWaitTime = 300000, // 5 minutes
    checkInterval = 2000, // 2 seconds
    maxAge = 300 // 5 minutes
  } = options;

  console.log(`Waiting for transaction finality: ${signature}`);
  console.log(`Options:`, { minConfirmations, maxWaitTime, checkInterval, maxAge });

  const startTime = Date.now();

  // First, wait for confirmed status
  try {
    console.log('Waiting for confirmed status...');
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('Transaction confirmed, now checking finality...');
  } catch (error) {
    console.error('Failed to confirm transaction:', error);
    return {
      isFinalized: false,
      confirmations: 0,
      error: 'Transaction failed to confirm'
    };
  }

  // Now check for finality with polling
  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Get transaction with finalized commitment
      const txDetails = await connection.getTransaction(signature, {
        commitment: 'finalized',
        maxSupportedTransactionVersion: 0
      });

      if (txDetails) {
        console.log('Transaction found in finalized state');
        
        // Check transaction age
        const currentTime = Math.floor(Date.now() / 1000);
        const txAge = txDetails.blockTime ? currentTime - txDetails.blockTime : 0;
        
        if (txAge > maxAge) {
          return {
            isFinalized: false,
            confirmations: 0,
            blockTime: txDetails.blockTime,
            slot: txDetails.slot,
            error: `Transaction too old: ${txAge}s (max: ${maxAge}s)`
          };
        }

        // Get current slot to calculate confirmations
        const currentSlot = await connection.getSlot('finalized');
        const confirmations = currentSlot - txDetails.slot;

        console.log(`Transaction confirmations: ${confirmations} (required: ${minConfirmations})`);

        if (confirmations >= minConfirmations) {
          return {
            isFinalized: true,
            confirmations,
            blockTime: txDetails.blockTime,
            slot: txDetails.slot
          };
        }

        console.log(`Waiting for more confirmations: ${confirmations}/${minConfirmations}`);
      } else {
        console.log('Transaction not yet finalized, waiting...');
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));

    } catch (error) {
      console.error('Error checking transaction finality:', error);
      
      // Continue polling unless it's a critical error
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          isFinalized: false,
          confirmations: 0,
          error: 'Transaction not found'
        };
      }
      
      // For other errors, wait and try again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  // Timeout reached
  return {
    isFinalized: false,
    confirmations: 0,
    error: `Timeout waiting for finality (${maxWaitTime}ms)`
  };
}

export async function verifyTransactionFinality(
  connection: Connection,
  signature: TransactionSignature,
  maxAge: number = 300
): Promise<TransactionFinalityResult> {
  console.log(`Verifying transaction finality: ${signature}`);

  try {
    // Get transaction with finalized commitment
    const txDetails = await connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0
    });

    if (!txDetails) {
      console.log('Transaction not found in finalized state');
      return {
        isFinalized: false,
        confirmations: 0,
        error: 'Transaction not found in finalized state'
      };
    }

    // Check transaction age
    const currentTime = Math.floor(Date.now() / 1000);
    const txAge = txDetails.blockTime ? currentTime - txDetails.blockTime : 0;
    
    if (txAge > maxAge) {
      console.log(`Transaction too old: ${txAge}s (max: ${maxAge}s)`);
      return {
        isFinalized: false,
        confirmations: 0,
        blockTime: txDetails.blockTime,
        slot: txDetails.slot,
        error: `Transaction too old: ${txAge}s (max: ${maxAge}s)`
      };
    }

    // Verify transaction wasn't dropped due to errors
    if (txDetails.meta?.err) {
      console.error('Transaction contains errors:', txDetails.meta.err);
      return {
        isFinalized: false,
        confirmations: 0,
        blockTime: txDetails.blockTime,
        slot: txDetails.slot,
        error: `Transaction failed: ${JSON.stringify(txDetails.meta.err)}`
      };
    }

    // Get current slot to calculate confirmations
    const currentSlot = await connection.getSlot('finalized');
    const confirmations = currentSlot - txDetails.slot;

    // Require minimum confirmations for additional security
    const minConfirmations = 32;
    if (confirmations < minConfirmations) {
      console.log(`Insufficient confirmations: ${confirmations}/${minConfirmations}`);
      return {
        isFinalized: false,
        confirmations,
        blockTime: txDetails.blockTime,
        slot: txDetails.slot,
        error: `Insufficient confirmations: ${confirmations}/${minConfirmations}`
      };
    }

    console.log(`Transaction successfully verified as finalized with ${confirmations} confirmations`);
    
    return {
      isFinalized: true,
      confirmations,
      blockTime: txDetails.blockTime,
      slot: txDetails.slot
    };

  } catch (error) {
    console.error('Error verifying transaction finality:', error);
    return {
      isFinalized: false,
      confirmations: 0,
      error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
