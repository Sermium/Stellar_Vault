import React, { useState, useEffect } from 'react';
import * as stellar from '../../lib/stellar';

interface Lock {
  id: number;
  creator: string;
  beneficiary: string;
  token: string;
  total_amount: bigint | string | number;
  released_amount: bigint | string | number;
  start_time: bigint | number;
  end_time: bigint | number;
  cliff_time: bigint | number;
  release_intervals: bigint | number;
  revocable: boolean;
  status: string;
  lock_type: string;
  description: string;
}

interface TokenBalance {
  address: string;
  symbol: string;
  balance: bigint | string | number;
  decimals: number;
  name?: string;
}

interface VaultConfig {
  name: string;
  threshold: number;
  signers_count: number;
}

interface PublicVaultViewProps {
  vaultAddress: string;
  onClose: () => void;
}

// Safe BigInt conversion helper
const safeBigInt = (value: any): bigint => {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(Math.floor(value));
    if (typeof value === 'string') return BigInt(value);
    return BigInt(0);
  } catch {
    return BigInt(0);
  }
};

// Safe Number conversion helper
const safeNumber = (value: any): number => {
  try {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') return Number(value);
    return 0;
  } catch {
    return 0;
  }
};

const PublicVaultView: React.FC<PublicVaultViewProps> = ({ vaultAddress, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [signers, setSigners] = useState<string[]>([]);
  const [locks, setLocks] = useState<Lock[]>([]);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'locks' | 'assets'>('overview');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadVaultData();
  }, [vaultAddress]);

  const loadVaultData = async () => {
    setLoading(true);
    setError('');
    try {
      const [configData, signersData, locksData, balancesData] = await Promise.all([
        stellar.loadVaultConfig(vaultAddress).catch(() => null),
        stellar.loadSigners(vaultAddress).catch(() => []),
        stellar.getLocks(vaultAddress).catch(() => []),
        stellar.loadAllTokenBalances(vaultAddress).catch(() => []),
      ]);

      setConfig(configData);
      setSigners(signersData);
      setLocks(locksData || []);
      setBalances(balancesData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load vault data');
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAmount = (amount: any, decimals: number = 7): string => {
    try {
      const bigAmount = safeBigInt(amount);
      const divisor = BigInt(10 ** decimals);
      const whole = bigAmount / divisor;
      const fraction = bigAmount % divisor;
      const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
      return `${whole.toString()}.${fractionStr}`;
    } catch {
      return '0.0000';
    }
  };

  const getStatusString = (status: any): string => {
    if (typeof status === 'string') return status;
    if (typeof status === 'number') {
        switch (status) {
        case 0: return 'Active';
        case 1: return 'PartiallyReleased';
        case 2: return 'FullyReleased';
        case 3: return 'Cancelled';
        default: return 'Unknown';
        }
    }
    // Handle object format like { Active: null } or { Cancelled: null }
    if (typeof status === 'object' && status !== null) {
        const keys = Object.keys(status);
        if (keys.length > 0) return keys[0];
    }
    return 'Unknown';
    };

    const getLockTypeString = (lockType: any): string => {
    if (typeof lockType === 'string') return lockType;
    if (typeof lockType === 'number') {
        return lockType === 0 ? 'TimeLock' : 'Vesting';
    }
    if (typeof lockType === 'object' && lockType !== null) {
        const keys = Object.keys(lockType);
        if (keys.length > 0) return keys[0];
    }
    return 'Unknown';
    };

  const getTokenSymbol = (tokenAddress: string): string => {
    const token = balances.find(t => t.address === tokenAddress);
    if (token) return token.symbol;
    if (tokenAddress === 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC') return 'XLM';
    return truncateAddress(tokenAddress);
  };

  const getTokenDecimals = (tokenAddress: string): number => {
    const token = balances.find(t => t.address === tokenAddress);
    return token?.decimals || 7;
  };

  const getStatusColor = (status: any): string => {
    const statusStr = getStatusString(status).toLowerCase();
    switch (statusStr) {
        case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'partiallyreleased': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        case 'fullyreleased': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
    };

  const getLockTypeColor = (lockType: any): string => {
    const typeStr = getLockTypeString(lockType);
    return typeStr === 'TimeLock'
        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    };

  const getProgressPercent = (lock: Lock): number => {
    try {
      const total = safeBigInt(lock.total_amount);
      const released = safeBigInt(lock.released_amount);
      if (total === BigInt(0)) return 0;
      return Number((released * BigInt(100)) / total);
    } catch {
      return 0;
    }
  };

  const getTimeRemaining = (lock: Lock): string => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const endTime = safeNumber(lock.end_time);
      const cliffTime = safeNumber(lock.cliff_time);
      
      if (lock.lock_type === 'TimeLock') {
        if (now >= endTime) return 'Unlocked';
        const remaining = endTime - now;
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        return `${days}d ${hours}h remaining`;
      } else {
        if (now >= cliffTime) return 'Cliff passed';
        const remaining = cliffTime - now;
        const days = Math.floor(remaining / 86400);
        const hours = Math.floor((remaining % 86400) / 3600);
        return `${days}d ${hours}h to cliff`;
      }
    } catch {
      return 'Unknown';
    }
  };

  const totalLockedValue = locks.reduce((sum, lock) => {
    try {
      const total = safeBigInt(lock.total_amount);
      const released = safeBigInt(lock.released_amount);
      return sum + (total - released);
    } catch {
      return sum;
    }
  }, BigInt(0));

  const activeLocks = locks.filter(l => getStatusString(l.status).toLowerCase() === 'active');

  const shareUrl = `${window.location.origin}?vault=${vaultAddress}&view=public`;

  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading vault data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-red-500/30 p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Vault</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">{config?.name || 'Stellar Vault'}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-gray-400 text-sm font-mono">{truncateAddress(vaultAddress)}</span>
                  <button
                    onClick={() => copyToClipboard(vaultAddress)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm border border-purple-500/30">
                Public View
              </span>
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-gray-300 text-sm">Share</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Toast */}
      {copied && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          Copied to clipboard!
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <p className="text-gray-400 text-sm mb-1">Signers</p>
            <p className="text-2xl font-bold text-white">{signers.length}</p>
            <p className="text-gray-500 text-xs mt-1">Threshold: {config?.threshold || 1}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <p className="text-gray-400 text-sm mb-1">Total Locks</p>
            <p className="text-2xl font-bold text-white">{locks.length}</p>
            <p className="text-gray-500 text-xs mt-1">{activeLocks.length} active</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <p className="text-gray-400 text-sm mb-1">Assets</p>
            <p className="text-2xl font-bold text-white">{balances.filter(b => safeBigInt(b.balance) > BigInt(0)).length}</p>
            <p className="text-gray-500 text-xs mt-1">tokens held</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <p className="text-gray-400 text-sm mb-1">Locked Value</p>
            <p className="text-2xl font-bold text-white">{formatAmount(totalLockedValue)}</p>
            <p className="text-gray-500 text-xs mt-1">total locked</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-white/10">
          {(['overview', 'locks', 'assets'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Signers */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Signers</h3>
              <div className="space-y-3">
                {signers.map((signer, idx) => (
                  <div key={signer} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {idx + 1}
                      </div>
                      <span className="font-mono text-gray-300">{truncateAddress(signer)}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(signer)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Locks */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Locks</h3>
              {locks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No locks created yet</p>
              ) : (
                <div className="space-y-3">
                  {locks.slice(0, 5).map((lock) => (
                    <div key={lock.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`px-2 py-1 rounded text-xs border ${getLockTypeColor(lock.lock_type)}`}>
                          {lock.lock_type}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {formatAmount(lock.total_amount, getTokenDecimals(lock.token))} {getTokenSymbol(lock.token)}
                          </p>
                          <p className="text-gray-400 text-sm">To: {truncateAddress(lock.beneficiary)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(lock.status)}`}>
                          {lock.status}
                        </span>
                        <p className="text-gray-500 text-xs mt-1">{getTimeRemaining(lock)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'locks' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">All Locks ({locks.length})</h3>
            {locks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-gray-400">No locks created yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {locks.map((lock) => (
                  <div key={lock.id} className="bg-slate-700/30 rounded-xl p-5 border border-white/5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getLockTypeColor(lock.lock_type)}`}>
                          {lock.lock_type}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(lock.status)}`}>
                          {lock.status}
                        </span>
                        {lock.revocable && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            Revocable
                          </span>
                        )}
                      </div>
                      <span className="text-gray-500 text-sm">#{lock.id}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Amount</p>
                        <p className="text-white font-medium">
                          {formatAmount(lock.total_amount, getTokenDecimals(lock.token))} {getTokenSymbol(lock.token)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Beneficiary</p>
                        <p className="text-gray-300 font-mono text-sm">{truncateAddress(lock.beneficiary)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Unlock Date</p>
                        <p className="text-gray-300 text-sm">
                          {new Date(safeNumber(lock.end_time) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Time Remaining</p>
                        <p className="text-gray-300 text-sm">{getTimeRemaining(lock)}</p>
                      </div>
                    </div>

                    {lock.description && (
                      <p className="text-gray-400 text-sm mb-4">"{lock.description}"</p>
                    )}

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Released</span>
                        <span>{getProgressPercent(lock)}%</span>
                      </div>
                      <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                          style={{ width: `${getProgressPercent(lock)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Assets</h3>
            {balances.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No assets found</p>
            ) : (
              <div className="space-y-3">
                {balances.map((token) => (
                  <div key={token.address} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {token.symbol?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{token.symbol || 'Unknown'}</p>
                        <p className="text-gray-500 text-xs font-mono">{truncateAddress(token.address)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">
                        {formatAmount(token.balance, token.decimals)}
                      </p>
                      <p className="text-gray-500 text-xs">{token.symbol}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800/30 border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Stellar Vault - Public View</span>
            <span>Powered by Soroban</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicVaultView;
