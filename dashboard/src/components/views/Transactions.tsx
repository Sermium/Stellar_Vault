import React from 'react';
import { SendIcon, CheckIcon, ZapIcon, ClockIcon } from '../icons';
import { VaultConfig, Proposal } from '../../types';
import { formatAmount, truncateAddress } from '../../lib/stellar';

interface TransactionsProps {
  proposals: Proposal[];
  vaultConfig: VaultConfig | null;
  publicKey: string | null;
  isSigner: boolean;
  loading: boolean;
  onApprove: (id: number) => void;
  onExecute: (id: number) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({
  proposals,
  vaultConfig,
  publicKey,
  isSigner,
  loading,
  onApprove,
  onExecute,
}) => {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2">
        {['All', 'Pending', 'Approved', 'Executed'].map((filter) => (
          <button
            key={filter}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
        {proposals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <SendIcon />
            </div>
            <p className="text-gray-400">No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      proposal.status === 'Executed' ? 'bg-green-500/20 text-green-400' :
                      proposal.status === 'Approved' ? 'bg-cyan-500/20 text-cyan-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {proposal.status === 'Executed' ? <CheckIcon /> :
                       proposal.status === 'Approved' ? <ZapIcon /> :
                       <ClockIcon />}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">
                        #{proposal.id} • Send {formatAmount(proposal.amount)} XLM
                      </p>
                      <p className="text-gray-400">
                        To: {truncateAddress(proposal.to)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    proposal.status === 'Executed' ? 'bg-green-500/20 text-green-400' :
                    proposal.status === 'Approved' ? 'bg-cyan-500/20 text-cyan-400' :
                    proposal.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {proposal.status}
                  </span>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Approvals</span>
                    <span>{proposal.approvals.length} of {vaultConfig?.threshold}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                      style={{
                        width: `${vaultConfig ? (proposal.approvals.length / vaultConfig.threshold) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Signers */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {proposal.approvals.map((addr, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-sm ${
                        addr === publicKey
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {addr === publicKey ? 'You' : truncateAddress(addr)} ✓
                    </span>
                  ))}
                  {Array.from({ length: (vaultConfig?.threshold || 0) - proposal.approvals.length }).map((_, i) => (
                    <span key={`pending-${i}`} className="px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-400">
                      Pending
                    </span>
                  ))}
                </div>

                {/* Actions */}
                {isSigner && (
                  <div className="flex gap-3">
                    {proposal.status === 'Pending' && publicKey && !proposal.approvals.includes(publicKey) && (
                      <button
                        onClick={() => onApprove(proposal.id)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 rounded-lg transition"
                      >
                        <CheckIcon />
                        Approve
                      </button>
                    )}
                    {proposal.status === 'Approved' && (
                      <button
                        onClick={() => onExecute(proposal.id)}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 rounded-lg transition"
                      >
                        <ZapIcon />
                        Execute
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
