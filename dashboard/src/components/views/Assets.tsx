import React, { useState } from 'react';
import { formatAmount, truncateAddress } from '../../lib/stellar';
import { TokenBalance } from '../../types';
import { AddTokenModal } from '../modals/AddTokenModal';
import { removeCustomToken, isCustomToken } from '../../services/tokensService';
import { SUPPORTED_TOKENS } from '../../config';

interface AssetsProps {
  vaultAddress: string | null;
  vaultBalance: TokenBalance[];
  remainingSpend: bigint;
  isSigner: boolean;
  userRole?: 'Admin' | 'Executor' | 'Viewer';
  onDeposit: () => void;
  onRefresh: () => void;
  onManageTokens: () => void;
}

export const Assets: React.FC<AssetsProps> = ({
  vaultAddress,
  vaultBalance,
  remainingSpend,
  isSigner,
  userRole,
  onDeposit,
  onRefresh,
  onManageTokens,
}) => {
  const [showAddToken, setShowAddToken] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRemoveToken = (address: string) => {
    if (window.confirm('Remove this token from your list?')) {
      removeCustomToken(address);
      onRefresh();
    }
  };

  const isBuiltInToken = (address: string) => {
    return SUPPORTED_TOKENS.some(t => t.address === address);
  };

  const filteredBalances = vaultBalance.filter(token =>
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = vaultBalance.reduce((sum, token) => {
    // Simplified - in production, fetch real prices
    return sum + Number(token.balance) / Math.pow(10, token.decimals);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Assets</h1>
          <p className="text-slate-400">Manage vault tokens and balances</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddToken(true)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Token
          </button>
          <button
            onClick={onManageTokens}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Trustlines
          </button>
          {isSigner && (
            <button
              onClick={onDeposit}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Deposit
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tokens..."
          className="w-full px-4 py-3 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Token List */}
      <div className="bg-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">
              {filteredBalances.length} token{filteredBalances.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={onRefresh}
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {filteredBalances.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">No tokens found</p>
            <button
              onClick={() => setShowAddToken(true)}
              className="mt-4 text-purple-400 hover:text-purple-300"
            >
              Add a custom token
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filteredBalances.map((token) => (
              <div
                key={token.address}
                className="p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                    {token.icon ? (
                      <img src={token.icon} alt={token.symbol} className="w-6 h-6" />
                    ) : (
                      <span className="text-white font-medium">
                        {token.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{token.symbol}</span>
                      {isCustomToken(token.address) && !isBuiltInToken(token.address) && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-sm">{token.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white font-medium">
                      {formatAmount(token.balance, token.decimals)}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {truncateAddress(token.address)}
                    </p>
                  </div>
                  {isCustomToken(token.address) && !isBuiltInToken(token.address) && (
                    <button
                      onClick={() => handleRemoveToken(token.address)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      title="Remove token"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spend Limit */}
      {remainingSpend > BigInt(0) && (
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400">Daily Spend Remaining</span>
            <span className="text-white font-medium">
              {formatAmount(remainingSpend, 7)} XLM
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-purple-500 rounded-full h-2"
              style={{ width: '60%' }}
            />
          </div>
        </div>
      )}

      {/* Add Token Modal */}
      <AddTokenModal
        isOpen={showAddToken}
        onClose={() => setShowAddToken(false)}
        onSuccess={() => {
          setShowAddToken(false);
          onRefresh();
        }}
      />
    </div>
  );
};
