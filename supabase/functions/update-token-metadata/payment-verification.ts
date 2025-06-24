
import { Connection, PublicKey, SystemProgram } from 'https://esm.sh/@solana/web3.js@1.98.2'
import { PaymentVerificationResult } from './types.ts'

export async function verifyPaymentTransaction(
  connection: Connection,
  paymentSignature: string,
  userWalletAddress: string,
  treasuryWallet: PublicKey
): Promise<PaymentVerificationResult> {
  console.log('Verifying payment transaction...')

  // Fetch transaction details
  let txDetails
  try {
    txDetails = await connection.getTransaction(paymentSignature, {
      commitment: 'confirmed'
    })
  } catch (error) {
    console.error('Error fetching transaction:', error)
    return { isValid: false, error: 'Failed to fetch payment transaction' }
  }

  if (!txDetails) {
    return { isValid: false, error: 'Payment transaction not found or not confirmed' }
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

  return { isValid: true, blockTime: txDetails?.blockTime }
}
