
import { Connection, PublicKey, Keypair } from 'https://esm.sh/@solana/web3.js@1.98.2'
import { createUmi } from 'https://esm.sh/@metaplex-foundation/umi-bundle-defaults@0.9.2'
import { createSignerFromKeypair, signerIdentity } from 'https://esm.sh/@metaplex-foundation/umi@0.9.2'
import { updateV1, fetchMetadataFromSeeds } from 'https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.2.1'
import { publicKey } from 'https://esm.sh/@metaplex-foundation/umi@0.9.2'
import bs58 from 'https://esm.sh/bs58@5.0.0'

export function createKeypairFromPrivateKey(walletKeyStr: string): Keypair {
  let privateKeyBytes: Uint8Array
  if (walletKeyStr.startsWith('[') && walletKeyStr.endsWith(']')) {
    // Array format: [1,2,3,...]
    const keyArray = JSON.parse(walletKeyStr)
    privateKeyBytes = new Uint8Array(keyArray)
  } else {
    // Assume base58 format - use bs58 library
    privateKeyBytes = bs58.decode(walletKeyStr)
  }
  return Keypair.fromSecretKey(privateKeyBytes)
}

export async function updateTokenMetadata(
  rpcUrl: string,
  mintAddress: PublicKey,
  updateAuthorityKeypair: Keypair,
  tokenName: string,
  ticker: string,
  metadataUri: string
): Promise<string> {
  console.log('Initializing Metaplex Umi...')
  const umi = createUmi(rpcUrl)
  
  console.log('Update authority address:', updateAuthorityKeypair.publicKey.toBase58())

  // Create UMI signer from keypair
  const updateAuthoritySigner = createSignerFromKeypair(umi, {
    publicKey: publicKey(updateAuthorityKeypair.publicKey.toBase58()),
    secretKey: updateAuthorityKeypair.secretKey
  })

  // Use the update authority as the identity
  umi.use(signerIdentity(updateAuthoritySigner))

  // Fetch current metadata to verify update authority
  console.log('Fetching current token metadata...')
  const mintPublicKey = publicKey(mintAddress.toBase58())
  const currentMetadata = await fetchMetadataFromSeeds(umi, { mint: mintPublicKey })

  if (!currentMetadata) {
    throw new Error('Token metadata not found on-chain')
  }

  if ('isMutable' in currentMetadata && currentMetadata.isMutable === false) {
    throw new Error('Token metadata is immutable on-chain and cannot be updated')
  }

  console.log('Current update authority:', currentMetadata.updateAuthority)
  console.log('Our update authority:', updateAuthoritySigner.publicKey)

  // Verify we have update authority
  if (currentMetadata.updateAuthority !== updateAuthoritySigner.publicKey) {
    throw new Error(`Update authority mismatch. Expected: ${updateAuthoritySigner.publicKey}, Got: ${currentMetadata.updateAuthority}`)
  }

  console.log('Updating token metadata on-chain...')

  // Update the metadata on-chain
  const updateResult = await updateV1(umi, {
    mint: mintPublicKey,
    authority: updateAuthoritySigner,
    data: {
      name: tokenName,
      symbol: ticker.toUpperCase(),
      uri: metadataUri,
      sellerFeeBasisPoints: currentMetadata.sellerFeeBasisPoints,
      creators: currentMetadata.creators,
      collection: currentMetadata.collection,
      uses: currentMetadata.uses,
    },
  }).sendAndConfirm(umi)

  // Convert the signature to base58 string using bs58
  const updateTransactionSignatureString = bs58.encode(updateResult.signature)
  
  console.log('Metadata update transaction signature:', updateTransactionSignatureString)

  return updateTransactionSignatureString
}
