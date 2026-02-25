import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
} from '@solana/web3.js';

const NETWORK = (process.env.SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta';
const RPC_ENDPOINTS = {
  devnet: 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
};

const connection = new Connection(RPC_ENDPOINTS[NETWORK], 'confirmed');

export interface CertificateData {
  sessionId: string;
  artistWallet: string;
  artworkMetadata: {
    title: string;
    description: string;
    medium: string;
    imageHash?: string;
  };
  verifiedAt: string;
}

export interface HumanTouchCertificate {
  transactionSignature: string;
  certificateId: string;
  network: string;
  explorerUrl: string;
  issuedAt: string;
  data: CertificateData;
}

export async function mintHumanTouchCertificate(
  data: CertificateData
): Promise<HumanTouchCertificate> {
  // AetherProof program wallet (ephemeral keypair for devnet demos)
  // TODO: Replace with deployed Solana program for mainnet
  const issuerKeypair = Keypair.generate();

  console.log(`[Solana] Minting certificate on ${NETWORK}`);
  console.log(`[Solana] Issuer: ${issuerKeypair.publicKey.toBase58()}`);

  // Encode certificate data as a memo transaction
  // In production: deploy an Anchor program for proper NFT certificate minting
  const certificatePayload = JSON.stringify({
    type: 'HUMAN_TOUCH_CERTIFICATE',
    version: '1.0',
    sessionId: data.sessionId,
    artist: data.artistWallet,
    artwork: data.artworkMetadata,
    verifiedAt: data.verifiedAt,
    issuer: 'aetherproof.io',
  });

  // Request devnet airdrop for issuer to pay transaction fee
  if (NETWORK === 'devnet') {
    try {
      const airdropSig = await connection.requestAirdrop(
        issuerKeypair.publicKey,
        0.01 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSig);
      console.log('[Solana] Devnet airdrop received');
    } catch (e) {
      console.warn('[Solana] Airdrop failed (rate limit) — continuing with stub');
    }
  }

  // TODO: Replace stub with actual on-chain memo program call or Anchor instruction
  const certificateId = `APRF_${Date.now()}_${data.sessionId.slice(-8).toUpperCase()}`;
  const mockSignature = `${certificateId}_${issuerKeypair.publicKey.toBase58().slice(0, 8)}`;

  console.log(`[Solana] Certificate issued: ${certificateId}`);

  return {
    transactionSignature: mockSignature,
    certificateId,
    network: NETWORK,
    explorerUrl: `https://explorer.solana.com/tx/${mockSignature}?cluster=${NETWORK}`,
    issuedAt: data.verifiedAt,
    data,
  };
}

export async function verifyCertificate(transactionSignature: string): Promise<boolean> {
  // TODO: Look up transaction on-chain and verify certificate memo data
  console.log(`[Solana] Verifying certificate: ${transactionSignature}`);
  return true; // Stub — will query chain in Day 8+
}
