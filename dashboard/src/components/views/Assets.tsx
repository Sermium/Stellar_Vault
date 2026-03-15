import React, { useState, useEffect } from 'react';
import { TokenBalance, TokenInfo } from '../../types';
import { formatAmount, formatUSD, truncateAddress } from '../../lib/stellar';
import { NATIVE_TOKEN } from '../../config';

// Known tokens on Stellar testnet
const KNOWN_TOKENS: TokenInfo[] = [
  {
    address: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    symbol: 'XLM',
    name: 'Stellar Lumens',
    decimals: 7,
    icon: '⭐',
  },
  // Add more known tokens here
];

interface AssetsProps {
  vaultAddress: string | null;
  vaultBalance: TokenBalance[];
  remainingSpend: bigint | null;
  isSigner: boolean;
  userRole?: 'Admin' | 'Executor' | 'Viewer';
  onDeposit: () => void;
  onRefresh?: () => void;
}

export const Assets: React.FC<AssetsProps> = ({
  vaultAddress,
  vaultBalance,
  remainingSpend,
  isSigner,
  userRole,
  onDeposit,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<'tokens' | 'nfts'>('tokens');
  const [searchQuery, setSearchQuery] = useState('');

  const canDeposit = userRole === 'Admin' || userRole === 'Executor' || isSigner;

  // Enrich token data with known token info
  const enrichedBalances = vaultBalance.map(token => {
    const knownToken = KNOWN_TOKENS.find(t => t.address === token.address);
    return {
      ...token,
      name: knownToken?.name || token.name || 'Unknown Token',
      icon: knownToken?.icon || token.icon,
      symbol: knownToken?.symbol || token.symbol,
    };
  });

  // Filter tokens by search
  const filteredBalances = enrichedBalances.filter(token => 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total value (simplified - you'd want real price data)
  const totalValue = vaultBalance.reduce((sum, token) => {
    if (token.address === NATIVE_TOKEN) {
      // Rough XLM price estimate for display
      return sum + Number(token.balance) / 10000000 * 0.12;
    }
    return sum;
  }, 0);

  const getTokenIcon = (token: TokenBalance & { icon?: string; name?: string }) => {
    if (token.icon) {
      return <span className="text-2xl">{token.icon}</span>;
    }
    return (
      <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-lg">
        {token.symbol.slice(0, 2)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm">Total Portfolio Value</p>
            <p className="text-3xl font-bold mt-1">${totalValue.toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-3 rounded-xl bg-gray-700/50 hover:bg-gray-700 transition"
                title="Refresh balances"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            {canDeposit && (
              <button
                onClick={onDeposit}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Deposit
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700/50">
          <div>
            <p className="text-gray-400 text-sm">Assets</p>
            <p className="text-xl font-semibold">{vaultBalance.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Tokens</p>
            <p className="text-xl font-semibold">{vaultBalance.filter(t => t.balance > 0n).length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">NFTs</p>
            <p className="text-xl font-semibold">0</p>
          </div>
        </div>
      </div>

      {/* View Toggle & Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex rounded-xl bg-gray-800/50 p-1">
          <button
            onClick={() => setViewMode('tokens')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'tokens' 
                ? 'bg-purple-500/20 text-purple-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tokens
          </button>
          <button
            onClick={() => setViewMode('nfts')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'nfts' 
                ? 'bg-purple-500/20 text-purple-400' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            NFTs
          </button>
        </div>

        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-gray-800/50 border border-gray-700 focus:border-purple-500 focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Assets List */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
        <div className="p-6 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold">
            {viewMode === 'tokens' ? 'Token Balances' : 'NFT Collection'}
          </h2>
        </div>

        <div className="p-6">
          {viewMode === 'tokens' ? (
            filteredBalances.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-400 mb-4">
                  {searchQuery ? 'No tokens match your search' : 'No assets in vault'}
                </p>
                {canDeposit && !searchQuery && (
                  <button
                    onClick={onDeposit}
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    Deposit your first asset →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBalances.map((token) => (
                  <div
                    key={token.address}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-700">
                        {getTokenIcon(token)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{token.symbol}</p>
                          {token.address === NATIVE_TOKEN && (
                            <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Native</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{token.name}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xl font-bold">{formatAmount(token.balance, token.decimals)}</p>
                      <p className="text-sm text-gray-400">{formatUSD(token.balance)}</p>
                    </div>

                    {/* Hover Actions */}
                    <div className="hidden group-hover:flex items-center gap-2 ml-4">
                      <button
                        className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                        title="View on explorer"
                        onClick={() => window.open(`https://stellar.expert/explorer/testnet/asset/${token.address}`, '_blank')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* NFTs View */
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-400 mb-2">NFT Support Coming Soon</p>
              <p className="text-sm text-gray-500">
                Store and manage Stellar NFTs in your vault
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Spend Limit */}
      {remainingSpend !== null && (
        <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Daily Spend Limit</h3>
              <p className="text-gray-400 text-sm mt-1">Remaining amount you can spend today without additional approvals</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatAmount(remainingSpend)} XLM</p>
              <p className="text-sm text-gray-400">Available</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              style={{ width: '70%' }} // You'd calculate this from actual spend data
            />
          </div>
        </div>
      )}

      {/* Vault Address */}
      {vaultAddress && (
        <div className="text-center text-sm text-gray-500">
          Vault: <span className="font-mono">{vaultAddress}</span>
        </div>
      )}
    </div>
  );
};
