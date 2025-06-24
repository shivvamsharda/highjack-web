
import { Connection, PublicKey, SystemProgram } from 'https://esm.sh/@solana/web3.js@1.98.2'
import { PaymentVerificationResult } from './types.ts'

async function verifyTransactionFinality(
  connection: Connection,
  signature: string,
  maxAge: number = 300
): Promise<{
  isFinalized: boolean;
  confirmations: number;
  blockTime?: number;
  slot?: number;
  error?: string;
}> {
  console.log(`Verifying transaction finality: ${signature}`);

  try {
    // Get transaction with finalized commitment
    const txDetails = await connection.getTransaction(signature, {
      commitment: 'finalized'
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

export async function verifyPaymentTransaction(
  connection: Connection,
  paymentSignature: string,
  userWalletAddress: string,
  treasuryWallet: PublicKey
): Promise<PaymentVerificationResult> {
  console.log('Verifying payment transaction with enhanced finality check...');

  // First, verify transaction finality
  const finalityResult = await verifyTransactionFinality(connection, paymentSignature, 300);

  if (!finalityResult.isFinalized) {
    console.log('Transaction finality verification failed:', finalityResult.error);
    return { 
      isValid: false, 
      error: finalityResult.error || 'Transaction not finalized',
      blockTime: finalityResult.blockTime
    };
  }

  console.log(`Transaction finalized with ${finalityResult.confirmations} confirmations`);

  // Fetch transaction details for payment verification
  let txDetails
  try {
    txDetails = await connection.getTransaction(paymentSignature, {
      commitment: 'finalized'
    })
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return { isValid: false, error: 'Failed to fetch payment transaction' }
  }

  if (!txDetails) {
    return { isValid: false, error: 'Payment transaction not found' }
  }

  console.log('Transaction details found, verifying transaction sender...')

  // Verify transaction sender matches provided wallet address
  const accountKeys = txDetails.transaction.message.accountKeys
  if (!accountKeys || accountKeys.length === 0) {
    return { isValid: false, error: 'Invalid transaction: no account keys found' }
  }

  const transactionSender = accountKeys[0]
  const providedWallet = new PublicKey(userWalletAddress)

  if (!transactionSender.equals(providedWallet)) {
    console.log('Transaction sender mismatch:')
    console.log('Transaction sender:', transactionSender.toBase58())
    console.log('Provided wallet:', providedWallet.toBase58())
    
    return { 
      isValid: false, 
      error: 'Transaction sender does not match provided wallet address' 
    }
  }

  console.log('Transaction sender verified successfully')
  console.log('Verifying payment to treasury...')

  // Verify payment to treasury
  const instructions = txDetails.transaction.message.instructions
  let paymentToTreasury = false

  try {
    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i]
      
      let instructionProgramId: PublicKey | null = null
      
      if (instruction && typeof instruction === 'object') {
        if ('programId' in instruction && instruction.programId) {
          instructionProgramId = instruction.programId
        } else if ('programIdIndex' in instruction && typeof instruction.programIdIndex === 'number') {
          const accountKeys = txDetails.transaction.message.accountKeys
          if (accountKeys && accountKeys[instruction.programIdIndex]) {
            instructionProgramId = accountKeys[instruction.programIdIndex]
          }
        }
      }

      console.log(`Instruction ${i}: programId =`, instructionProgramId?.toBase58() || 'undefined')

      if (instructionProgramId && instructionProgramId.equals(SystemProgram.programId)) {
        console.log('Found system program instruction, checking accounts...')
        
        const accounts = instruction.accounts || []
        console.log('Instruction accounts:', accounts)
        
        if (accounts.length >= 2) {
          const accountKeys = txDetails.transaction.message.accountKeys
          if (accountKeys && accountKeys[accounts[1]]) {
            const recipientKey = accountKeys[accounts[1]]
            console.log('Recipient key:', recipientKey.toBase58())
            console.log('Treasury key:', treasuryWallet.toBase58())
            
            if (recipientKey.equals(treasuryWallet)) {
              paymentToTreasury = true
              console.log('Payment verified: sent to treasury wallet')
              break
            }
          }
        }
      }
    }
  } catch (verificationError) {
    console.error('Error during payment verification:', verificationError)
    return { 
      isValid: false, 
      error: `Payment verification failed: ${verificationError.message}` 
    }
  }

  if (!paymentToTreasury) {
    return { isValid: false, error: 'Payment was not sent to the correct treasury wallet' }
  }

  console.log('Enhanced payment verification completed successfully')
  
  return { 
    isValid: true, 
    blockTime: finalityResult.blockTime
  };
}
