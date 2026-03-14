import React from 'react';
import { CopyIcon, ShieldIcon } from '../icons';
import { VaultConfig } from '../../types';
import { truncateAddress } from '../../lib/stellar';

interface MembersProps {
  signers: string[];
  vaultConfig: VaultConfig | null;
  publicKey: string | null;
  onCopy: (text: string) => void;
}

export const Members: React.FC<MembersProps> = ({
  signers,
  vaultConfig,
  publicKey,
  onCopy,
}) => {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
        <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vault Members</h2>
          <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
            {signers.length} signers
          </span>
        </div>

        <div className="divide-y divide-gray-700/50">
          {signers.map((signer, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                  signer === publicKey
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                    : 'bg-gray-700'
                }`}>
                  {signer.slice(0, 2)}
                </div>
                <div>
                  <p className="font-mono">{truncateAddress(signer)}</p>
                  {signer === publicKey && (
                    <span className="text-xs text-cyan-400">You</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onCopy(signer)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
              >
                <CopyIcon />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Threshold Info */}
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <ShieldIcon />
          </div>
          <div>
            <p className="font-semibold">Approval Threshold</p>
            <p className="text-gray-400">
              {vaultConfig?.threshold} of {vaultConfig?.signer_count} signatures required to execute transactions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
