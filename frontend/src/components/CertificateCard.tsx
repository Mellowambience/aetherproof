import React from 'react';
import { Certificate } from '../App';

interface CertificateCardProps {
  certificate: Certificate;
}

export default function CertificateCard({ certificate }: CertificateCardProps) {
  return (
    <div className="certificate-card">
      <div className="certificate-header">
        <span className="cert-icon">⬡</span>
        <h2>Human Touch Certificate</h2>
        <span className="cert-verified">VERIFIED</span>
      </div>

      <div className="certificate-body">
        <div className="cert-field">
          <label>Certificate ID</label>
          <span className="cert-value mono">{certificate.certificateId}</span>
        </div>

        <div className="cert-field">
          <label>Network</label>
          <span className="cert-value">{certificate.network}</span>
        </div>

        <div className="cert-field">
          <label>Issued At</label>
          <span className="cert-value">{new Date(certificate.issuedAt).toLocaleString()}</span>
        </div>

        <div className="cert-field">
          <label>Transaction</label>
          <span className="cert-value mono">
            {certificate.transactionSignature.slice(0, 20)}...
          </span>
        </div>
      </div>

      <div className="certificate-footer">
        <a
          href={certificate.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="explorer-link"
        >
          View on Solana Explorer →
        </a>
        <p className="cert-disclaimer">
          This certificate verifies that the artwork was created by a human artist,
          as determined by AetherProof's real-time AI verification system.
        </p>
      </div>
    </div>
  );
}
