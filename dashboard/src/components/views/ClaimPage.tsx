import React, { useState, useEffect } from 'react';
import * as stellar from '../../lib/stellar';
import { getAllVaults, getVaultInfo } from '../../services/factoryService';
import ConnectWalletModal from '../modals/ConnectWalletModal';
import { updateLockClaim, deactivateLock } from '../../lib/supabase';

interface Lock {
  id: number;
  vaultAddress: string;
  vaultName: string;
  creator: string;
  beneficiary: string;
  token: string;
  total_amount: bigint;
  released_amount: bigint;
  start_time: number;
  end_time: number;
  cliff_time: number;
  release_intervals: number;
  revocable: boolean;
  status: number | string;
  lock_type: number | string;
  description: string;
}

interface ClaimPageProps {
  onClose: () => void;
  initialPublicKey?: string | null;
  initialWalletId?: string | null;
}

const ClaimPage: React.FC<ClaimPageProps> = ({ 
    onClose, 
    initialPublicKey = null, 
    initialWalletId = null 
}) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [myLocks, setMyLocks] = useState<Lock[]>([]);
  const [scannedVaults, setScannedVaults] = useState(0);
  const [totalVaults, setTotalVaults] = useState(0);

  const handleConnect = (pk: string, wid: string) => {
    setPublicKey(pk);
    setWalletId(wid);
    setShowConnectModal(false);
  };

  const handleDisconnect = () => {
    setPublicKey(null);
    setWalletId(null);
    setMyLocks([]);
  };

  // Load all locks for connected wallet
  useEffect(() => {
    if (publicKey) {
      loadMyLocks();
    }
  }, [publicKey]);

  useEffect(() => {
    if (initialPublicKey && !publicKey) {
      setPublicKey(initialPublicKey);
      setWalletId(initialWalletId);
    }
  }, [initialPublicKey, initialWalletId]);

  const loadMyLocks = async () => {
    if (!publicKey) return;
    
    setLoading(true);
    setError(null);
    setMyLocks([]);
    
    try {
      const allVaults = await getAllVaults();
      setTotalVaults(allVaults.length);
      
      const foundLocks: Lock[] = [];
      
      for (let i = 0; i < allVaults.length; i++) {
        const vaultInfo = allVaults[i];  // This is VaultInfo object
        const vaultAddress = vaultInfo.vault_address;  // Extract the address string
        setScannedVaults(i + 1);

        try {
          const locks = await stellar.getLocks(vaultAddress);

          for (const lock of locks) {
            if (lock.beneficiary === publicKey) {
              foundLocks.push({
                ...lock,
                id: Number(lock.id),
                vaultAddress,
                vaultName: vaultInfo.name || 'Unknown Vault',  // Use vaultInfo directly
                total_amount: BigInt(lock.total_amount),
                released_amount: BigInt(lock.released_amount),
                start_time: Number(lock.start_time),
                end_time: Number(lock.end_time),
                cliff_time: Number(lock.cliff_time),
                release_intervals: Number(lock.release_intervals),
              });
            }
          }
        } catch (err) {
          console.error(`Failed to load locks from vault ${vaultAddress}:`, err);
        }
      }
      
      setMyLocks(foundLocks);
    } catch (err: any) {
      setError(err.message || 'Failed to load locks');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (lock: Lock) => {
    if (!publicKey) return;

    setClaiming(lock.id);
    setError(null);
    setSuccess(null);

    try {
      const claimed = await stellar.claimLock(publicKey, lock.vaultAddress, lock.id);
      
      // Update the database after successful claim
      const newReleasedAmount = (BigInt(lock.released_amount) + claimed).toString();
      const totalAmount = BigInt(lock.total_amount);
      
      await updateLockClaim(
        lock.vaultAddress,
        lock.id,
        newReleasedAmount,
        newReleasedAmount  // total_claimed
      );
      
      // If fully claimed, deactivate the lock
      if (BigInt(newReleasedAmount) >= totalAmount) {
        await deactivateLock(lock.vaultAddress, lock.id);
      }
      
      setSuccess(`Successfully claimed ${formatAmount(claimed, 7)} tokens!`);
      await loadMyLocks(); // Refresh
    } catch (err: any) {
      setError(err.message || 'Failed to claim');
    } finally {
      setClaiming(null);
    }
  };

  // Helpers
  const safeBigInt = (value: any): bigint => {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string') return BigInt(value || '0');
    return BigInt(0);
  };

  const formatAmount = (amt: bigint | number | string, decimals: number = 7): string => {
    try {
      const value = safeBigInt(amt);
      const divisor = BigInt(10 ** decimals);
      const whole = value / divisor;
      const fraction = value % divisor;
      return whole.toString() + '.' + fraction.toString().padStart(decimals, '0').slice(0, 4);
    } catch { return '0.0000'; }
  };

  const truncateAddress = (addr: string): string => addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '';

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
    if (typeof status === 'object' && status !== null) {
      const keys = Object.keys(status);
      if (keys.length > 0) return keys[0];
    }
    return 'Unknown';
  };

  const getLockTypeString = (lockType: any): string => {
    if (typeof lockType === 'string') return lockType;
    if (typeof lockType === 'number') return lockType === 0 ? 'TimeLock' : 'Vesting';
    if (typeof lockType === 'object' && lockType !== null) {
      const keys = Object.keys(lockType);
      if (keys.length > 0) return keys[0];
    }
    return 'Unknown';
  };

  const isClaimable = (lock: Lock): boolean => {
    const status = getStatusString(lock.status);
    if (status !== 'Active' && status !== 'PartiallyReleased') return false;
    
    const now = Math.floor(Date.now() / 1000);
    const lockType = getLockTypeString(lock.lock_type);
    
    if (lockType === 'TimeLock') {
      return now >= lock.end_time;
    } else {
      return now >= lock.cliff_time;
    }
  };

  const getClaimableAmount = (lock: Lock): bigint => {
    const now = Math.floor(Date.now() / 1000);
    const lockType = getLockTypeString(lock.lock_type);
    const total = safeBigInt(lock.total_amount);
    const released = safeBigInt(lock.released_amount);
    
    if (lockType === 'TimeLock') {
      if (now >= lock.end_time) {
        return total - released;
      }
      return BigInt(0);
    } else {
      // Vesting
      if (now < lock.cliff_time) return BigInt(0);
      if (now >= lock.end_time) return total - released;
      
      const elapsed = BigInt(now - lock.start_time);
      const duration = BigInt(lock.end_time - lock.start_time);
      const vested = (total * elapsed) / duration;
      return vested > released ? vested - released : BigInt(0);
    }
  };

  const getTimeRemaining = (lock: Lock): string => {
    const now = Math.floor(Date.now() / 1000);
    const lockType = getLockTypeString(lock.lock_type);
    
    if (lockType === 'TimeLock') {
      if (now >= lock.end_time) return 'Unlocked';
      const diff = lock.end_time - now;
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      return `${days}d ${hours}h remaining`;
    } else {
      if (now < lock.cliff_time) {
        const diff = lock.cliff_time - now;
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        return `${days}d ${hours}h to cliff`;
      }
      if (now >= lock.end_time) return 'Fully vested';
      const diff = lock.end_time - now;
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      return `${days}d ${hours}h remaining`;
    }
  };

  const claimableLocks = myLocks.filter(l => isClaimable(l) && getClaimableAmount(l) > BigInt(0));
  const pendingLocks = myLocks.filter(l => !isClaimable(l) && getStatusString(l.status) === 'Active');
  const completedLocks = myLocks.filter(l => ['FullyReleased', 'Cancelled'].includes(getStatusString(l.status)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Claim Your Tokens</h1>
                <p className="text-gray-400 text-sm">View and claim locks assigned to you</p>
              </div>
            </div>
            
            {publicKey ? (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm text-white font-mono">{truncateAddress(publicKey)}</p>
                  <p className="text-xs text-gray-500">{walletId}</p>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConnectModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 hover:text-white">✕</button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400">
            {success}
            <button onClick={() => setSuccess(null)} className="ml-2 hover:text-white">✕</button>
          </div>
        )}

        {/* Not Connected */}
        {!publicKey && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Connect your wallet to see all time locks and vesting schedules assigned to you across all Stellar Vaults.
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {/* Loading */}
        {publicKey && loading && (
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Scanning vaults for your locks...</p>
            <p className="text-gray-500 text-sm mt-2">Checked {scannedVaults} of {totalVaults} vaults</p>
          </div>
        )}

        {/* Results */}
        {publicKey && !loading && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <p className="text-gray-400 text-sm">Ready to Claim</p>
                <p className="text-3xl font-bold text-green-400">{claimableLocks.length}</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-3xl font-bold text-yellow-400">{pendingLocks.length}</p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <p className="text-gray-400 text-sm">Completed</p>
                <p className="text-3xl font-bold text-gray-400">{completedLocks.length}</p>
              </div>
            </div>

            {/* Claimable */}
            {claimableLocks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">💰</span> Ready to Claim
                </h2>
                <div className="space-y-4">
                  {claimableLocks.map((lock) => (
                    <div key={`${lock.vaultAddress}-${lock.id}`} className="bg-slate-800/50 backdrop-blur-xl rounded-xl border-2 border-green-500/30 p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-lg font-bold text-white">
                              {formatAmount(getClaimableAmount(lock), 7)} tokens
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">
                              {getLockTypeString(lock.lock_type)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">From Vault</p>
                              <p className="text-white">{lock.vaultName}</p>
                              <p className="text-gray-500 text-xs font-mono">{truncateAddress(lock.vaultAddress)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Total Amount</p>
                              <p className="text-white">{formatAmount(lock.total_amount, 7)}</p>
                            </div>
                            {lock.description && (
                              <div className="col-span-2">
                                <p className="text-gray-500">Description</p>
                                <p className="text-white">{lock.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleClaim(lock)}
                          disabled={claiming === lock.id}
                          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl text-white font-bold disabled:opacity-50 transition-all shadow-lg shadow-green-500/25"
                        >
                          {claiming === lock.id ? 'Claiming...' : 'Claim Now'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending */}
            {pendingLocks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span className="text-2xl">⏳</span> Pending
                </h2>
                <div className="space-y-4">
                  {pendingLocks.map((lock) => (
                    <div key={`${lock.vaultAddress}-${lock.id}`} className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-lg font-bold text-white">
                              {formatAmount(lock.total_amount, 7)} tokens
                            </span>
                            <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                              {getLockTypeString(lock.lock_type)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">From Vault</p>
                              <p className="text-white">{lock.vaultName}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Time Remaining</p>
                              <p className="text-yellow-400">{getTimeRemaining(lock)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Unlock Date</p>
                              <p className="text-white">
                                {new Date(lock.end_time * 1000).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {myLocks.length === 0 && (
              <div className="text-center py-12 bg-slate-800/50 backdrop-blur-xl rounded-xl border border-white/10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-gray-400 mb-2">No locks found</p>
                <p className="text-gray-500 text-sm">You don't have any time locks or vesting schedules assigned to you.</p>
                <button
                  onClick={loadMyLocks}
                  className="mt-4 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
                >
                  Refresh
                </button>
              </div>
            )}

            {/* Refresh Button */}
            {myLocks.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMyLocks}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  Refresh Locks
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Connect Modal */}
      <ConnectWalletModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnect={handleConnect}
      />
    </div>
  );
};

export default ClaimPage;
