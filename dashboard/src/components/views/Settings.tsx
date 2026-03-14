import React from 'react';
import { CopyIcon, ExternalLinkIcon } from '../icons';
import { CONTRACT_ID } from '../../config/constants';
import { VaultConfig } from '../../types';
import { truncateAddress } from '../../lib/stellar';

interface SettingsProps {
  vaultConfig: VaultConfig | null;
  onCopy: (text: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ vaultConfig, onCopy }) => {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
        <h2 className="text-lg font-semibold mb-6">Vault Configuration</h2>
        <div className="space-y-4">
          <div className="flex justify-between py-3 border-b border-gray-700/50">
            <span className="text-gray-400">Vault Name</span>
            <span className="font-medium">{vaultConfig?.name}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-700/50">
            <span className="text-gray-400">Contract Address</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{truncateAddress(CONTRACT_ID)}</span>
              <button onClick={() => onCopy(CONTRACT_ID)} className="text-gray-400 hover:text-white">
                <CopyIcon />
              </button>
            </div>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-700/50">
            <span className="text-gray-400">Threshold</span>
            <span className="font-medium">{vaultConfig?.threshold} of {vaultConfig?.signer_count}</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-gray-400">Network</span>
            <span className="font-medium">Stellar Testnet</span>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-4">External Links</h3>
        <div className="space-y-3">
          <a
            href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition"
          >
            <span>View on Stellar Expert</span>
            <ExternalLinkIcon />
          </a>
          <a
            href="https://soroban.stellar.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition"
          >
            <span>Soroban Documentation</span>
            <ExternalLinkIcon />
          </a>
        </div>
      </div>
    </div>
  );
};
