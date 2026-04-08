import React, { useState } from 'react';
import { TokenBalance } from '../../types';
import { SUPPORTED_TOKENS } from '../../config';
import { TokenIcon } from '../common/TokenIcon';

interface AssetsProps {
  vaultAddress: string | null;
  vaultBalance: TokenBalance[];
  remainingSpend: bigint;
  isSigner: boolean;
  userRole?: string;
  onDeposit: () => void;
  onRefresh: () => void;
  onManageTokens: () => void;
  onAddToken?: () => void;
  onSend?: (tokenAddress: string) => void;
  onLock?: (tokenAddress: string) => void;
  onVesting?: (tokenAddress: string) => void;
}

interface AssetActionModalProps {
  isOpen: boolean;
  asset: TokenBalance | null;
  onClose: () => void;
  onDeposit: (asset: TokenBalance) => void;
  onSend: (asset: TokenBalance) => void;
  onLock: (asset: TokenBalance) => void;
  onVesting: (asset: TokenBalance) => void;
  userRole?: string;
}

const formatAmount = (amount: bigint, decimals: number = 7): string => {
  const num = Number(amount) / Math.pow(10, decimals);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });
};

const truncateAddress = (addr: string): string => {
  if (!addr) return '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

const AssetActionModal: React.FC<AssetActionModalProps> = ({
  isOpen,
  asset,
  onClose,
  onDeposit,
  onSend,
  onLock,
  onVesting,
  userRole,
}) => {
  if (!isOpen || !asset) return null;

  const isAdmin = userRole === 'Admin' || userRole === 'SuperAdmin';
  const canExecute = userRole === 'Admin' || userRole === 'Executor' || userRole === 'SuperAdmin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TokenIcon symbol={asset.symbol} address={asset.address} size="w-12 h-12" />
            <div>
              <h2 className="text-xl font-bold text-white">{asset.symbol}</h2>
              <p className="text-sm text-gray-400">{truncateAddress(asset.address)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
          <div className="text-sm text-gray-400 mb-1">Available Balance</div>
          <div className="text-2xl font-bold text-white">
            {formatAmount(asset.balance, asset.decimals)} {asset.symbol}
          </div>
        </div>

        <div className="space-y-3">
          {/* Deposit */}
          <button onClick={() => onDeposit(asset)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50 transition-all group">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div className="text-left">
              <div className="font-semibold text-white">Deposit</div>
              <div className="text-sm text-gray-400">Add more {asset.symbol} to the vault</div>
            </div>
          </button>

          {/* Send */}
          {canExecute && (
            <button onClick={() => onSend(asset)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all group">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Send</div>
                <div className="text-sm text-gray-400">Propose a transfer of {asset.symbol}</div>
              </div>
            </button>
          )}

          {/* Time Lock */}
          {isAdmin && (
            <button onClick={() => onLock(asset)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all group">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Time Lock</div>
                <div className="text-sm text-gray-400">Lock until a specific date</div>
              </div>
            </button>
          )}

          {/* Vesting */}
          {isAdmin && (
            <button onClick={() => onVesting(asset)} className="w-full flex items-center gap-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all group">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-white">Vesting</div>
                <div className="text-sm text-gray-400">Create a vesting schedule with cliff</div>
              </div>
            </button>
          )}
        </div>

        <button onClick={onClose} className="w-full mt-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
};

export const Assets: React.FC<AssetsProps> = ({
  vaultAddress,
  vaultBalance,
  remainingSpend,
  isSigner,
  userRole,
  onDeposit,
  onRefresh,
  onManageTokens,
  onAddToken,
  onSend,
  onLock,
  onVesting,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<TokenBalance | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  const totalBalance = vaultBalance.reduce((sum, token) => {
    const bal = Number(token.balance) / Math.pow(10, token.decimals);
    return sum + bal;
  }, 0);

  const handleAssetClick = (asset: TokenBalance) => {
    setSelectedAsset(asset);
    setShowActionModal(true);
  };

  const handleDeposit = () => {
    setShowActionModal(false);
    onDeposit();
  };

  const handleSend = () => {
    if (selectedAsset && onSend) {
      onSend(selectedAsset.address);
    }
    setShowActionModal(false);
  };

  const handleLock = () => {
    if (selectedAsset && onLock) {
      onLock(selectedAsset.address);
    }
    setShowActionModal(false);
  };

  const handleVesting = () => {
    if (selectedAsset && onVesting) {
      onVesting(selectedAsset.address);
    }
    setShowActionModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assets</h1>
          <p className="text-gray-400 mt-1">Manage your vault assets</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onRefresh} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          {onAddToken && (
            <button onClick={onAddToken} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Token
            </button>
          )}
          <button onClick={onManageTokens} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Authorize
          </button>
          <button onClick={onDeposit} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Deposit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="text-gray-400 text-sm mb-1">Total Balance</div>
          <div className="text-2xl font-bold">{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="text-gray-400 text-sm mb-1">Assets</div>
          <div className="text-2xl font-bold">{vaultBalance.length}</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div className="text-gray-400 text-sm mb-1">Remaining Daily Spend</div>
          <div className="text-2xl font-bold text-green-400">{formatAmount(remainingSpend)} XLM</div>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold">Your Assets</h2>
          <span className="text-sm text-gray-400">Click on an asset to manage it</span>
        </div>

        {vaultBalance.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300">No assets yet</h3>
            <p className="text-gray-500 mt-1 mb-4">Deposit some tokens to get started</p>
            <button onClick={onDeposit} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:opacity-90 transition-opacity">
              Make First Deposit
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {vaultBalance.map((token, index) => (
              <div key={token.address || index} onClick={() => handleAssetClick(token)} className="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <TokenIcon symbol={token.symbol} address={token.address} size="w-12 h-12" className="border border-slate-600 group-hover:border-purple-500/50 transition-colors" />
                    <div>
                      <div className="font-semibold text-white group-hover:text-purple-400 transition-colors">{token.symbol}</div>
                      <div className="text-sm text-gray-400">{truncateAddress(token.address)}</div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div className="font-semibold text-white">{formatAmount(token.balance, token.decimals)} {token.symbol}</div>
                    <svg className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AssetActionModal 
        isOpen={showActionModal} 
        asset={selectedAsset} 
        onClose={() => setShowActionModal(false)} 
        onDeposit={handleDeposit} 
        onSend={handleSend} 
        onLock={handleLock} 
        onVesting={handleVesting}
        userRole={userRole} 
      />
    </div>
  );
};
