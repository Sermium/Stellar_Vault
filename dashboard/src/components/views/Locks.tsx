import React, { useState, useEffect } from 'react';
import { getContacts, Contact } from '../../services/contactsService';

interface Lock {
  id: number;
  creator: string;
  beneficiary: string;
  token: string;
  total_amount: bigint | string | number;
  released_amount: bigint | string | number;
  lock_type: 'TimeLock' | 'Vesting';
  status: 'Active' | 'PartiallyReleased' | 'FullyReleased' | 'Cancelled';
  created_at: number | bigint;
  start_time: number | bigint;
  end_time: number | bigint;
  cliff_time: number | bigint;
  release_intervals: number | bigint;
  revocable: boolean;
  description: string;
}

interface TokenBalance {
  symbol: string;
  balance: bigint;
  decimals: number;
  address?: string;
}

interface LocksProps {
  vaultAddress: string | null;
  locks: Lock[];
  vaultBalance: TokenBalance[];
  userRole?: string;
  publicKey: string | null;
  onCreateTimeLock: (
    beneficiary: string,
    token: string,
    amount: string,
    unlockTime: number,
    revocable: boolean,
    description: string
  ) => Promise<number | undefined | void>;
  onCreateVestingLock: (
    beneficiary: string,
    token: string,
    amount: string,
    startTime: number,
    cliffDuration: number,
    totalDuration: number,
    releaseIntervals: number,
    revocable: boolean,
    description: string
  ) => Promise<number | undefined | void>;
  onClaimLock: (lockId: number) => Promise<bigint | undefined | void>;
  onCancelLock: (lockId: number) => Promise<bigint | undefined | void>;
  onRefresh: () => void;
  preselectedToken?: string | null;
  isPublicView?: boolean;
}

const Locks: React.FC<LocksProps> = ({
  vaultAddress,
  locks,
  vaultBalance,
  userRole,
  publicKey,
  onCreateTimeLock,
  onCreateVestingLock,
  onClaimLock,
  onCancelLock,
  onRefresh,
  preselectedToken,
  isPublicView = false,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lockType, setLockType] = useState<'timelock' | 'vesting'>('timelock');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  // Form state
  const [beneficiary, setBeneficiary] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [cliffDays, setCliffDays] = useState('0');
  const [vestingDays, setVestingDays] = useState('30');
  const [releaseIntervalDays, setReleaseIntervalDays] = useState('7');
  const [revocable, setRevocable] = useState(true);
  const [description, setDescription] = useState('');

  const isAdmin = userRole === 'Admin';

  // Load contacts
  useEffect(() => {
    setContacts(getContacts());
  }, [showCreateModal]);

  useEffect(() => {
    if (preselectedToken) {
      setSelectedToken(preselectedToken);
      setShowCreateModal(true);
    }
  }, [preselectedToken]);

  const formatAmount = (amt: bigint | number | string, decimals: number = 7): string => {
    try {
        const value = typeof amt === 'bigint' ? amt : BigInt(String(amt) || '0');
        const divisor = BigInt(10 ** decimals);
        const whole = value / divisor;
        const fraction = value % divisor;
        const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
        return `${whole}.${fractionStr}`;
    } catch {
        return '0.0000';
    }
    };

  const truncateAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getTokenSymbol = (tokenAddress: string): string => {
    const token = vaultBalance.find((t) => t.address === tokenAddress);
    return token?.symbol || truncateAddress(tokenAddress);
  };

  const getTokenDecimals = (tokenAddress: string): number => {
    const token = vaultBalance.find((t) => t.address === tokenAddress);
    return token?.decimals || 7;
  };

  // Get contact name for an address
  const getContactName = (address: string): string | null => {
    const contact = contacts.find(c => c.address === address);
    return contact?.name || null;
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.address.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const handleSelectContact = (contact: Contact) => {
    setBeneficiary(contact.address);
    setContactSearch(contact.name);
    setShowContactDropdown(false);
  };

  const handleBeneficiaryChange = (value: string) => {
    setBeneficiary(value);
    setContactSearch(value);
    if (value.length > 0 && !value.startsWith('G')) {
      setShowContactDropdown(true);
    } else {
      setShowContactDropdown(false);
    }
  };

  const handleCreateLock = async () => {
    if (!selectedToken || !beneficiary || !amount) {
      setError('Please fill in all required fields');
      return;
    }

    if (!beneficiary.startsWith('G') || beneficiary.length !== 56) {
      setError('Invalid beneficiary address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (lockType === 'timelock') {
        const unlockTime = Math.floor(new Date(unlockDate).getTime() / 1000);
        if (unlockTime <= Math.floor(Date.now() / 1000)) {
          setError('Unlock time must be in the future');
          setLoading(false);
          return;
        }
        await onCreateTimeLock(
          beneficiary,
          selectedToken,
          amount,
          unlockTime,
          revocable,
          description
        );
      } else {
        const cliffDuration = parseInt(cliffDays) * 24 * 60 * 60;
        const totalDuration = parseInt(vestingDays) * 24 * 60 * 60;
        const releaseIntervals = parseInt(releaseIntervalDays) * 24 * 60 * 60;
        const startTime = Math.floor(Date.now() / 1000);

        if (totalDuration <= 0) {
          setError('Vesting duration must be greater than 0');
          setLoading(false);
          return;
        }

        await onCreateVestingLock(
          beneficiary,
          selectedToken,
          amount,
          startTime,
          cliffDuration,
          totalDuration,
          releaseIntervals,
          revocable,
          description
        );
      }

      setShowCreateModal(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create lock');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (lockId: number) => {
    setLoading(true);
    setError(null);
    try {
      await onClaimLock(lockId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to claim');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (lockId: number) => {
    if (!window.confirm('Are you sure you want to cancel this lock?')) return;
    setLoading(true);
    setError(null);
    try {
      await onCancelLock(lockId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel lock');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBeneficiary('');
    setContactSearch('');
    setSelectedToken('');
    setAmount('');
    setUnlockDate('');
    setCliffDays('0');
    setVestingDays('30');
    setReleaseIntervalDays('7');
    setRevocable(true);
    setDescription('');
    setShowContactDropdown(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-400';
      case 'PartiallyReleased': return 'bg-yellow-500/20 text-yellow-400';
      case 'FullyReleased': return 'bg-blue-500/20 text-blue-400';
      case 'Cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const canClaim = (lock: Lock): boolean => {
    if (lock.status !== 'Active' && lock.status !== 'PartiallyReleased') return false;
    const now = Math.floor(Date.now() / 1000);
    if (lock.lock_type === 'TimeLock') {
        return now >= Number(lock.end_time);
    }
    return now >= Number(lock.cliff_time);
    };

  const getProgressPercent = (lock: Lock): number => {
    try {
        const total = BigInt(String(lock.total_amount) || '0');
        const released = BigInt(String(lock.released_amount) || '0');
        if (total === BigInt(0)) return 0;
        return Number((released * BigInt(100)) / total);
    } catch {
        return 0;
    }
    };

  const getTimeRemaining = (lock: Lock): string => {
    const now = Math.floor(Date.now() / 1000);
    const targetTime = lock.lock_type === 'TimeLock' ? Number(lock.end_time) : Number(lock.cliff_time);
    
    if (now >= targetTime) {
        return lock.lock_type === 'TimeLock' ? 'Unlocked' : 'Cliff passed';
    }
    
    const diff = targetTime - now;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
    };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Locks</h1>
          <p className="text-gray-400 mt-1">
            {isPublicView 
              ? 'View locked assets and vesting schedules'
              : 'Lock assets with time-based or vesting schedules'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            Refresh
          </button>
          {isAdmin && !isPublicView && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
            >
              + Create Lock
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Locks</p>
          <p className="text-2xl font-bold text-white">{locks.length}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Active Locks</p>
          <p className="text-2xl font-bold text-green-400">
            {locks.filter((l) => l.status === 'Active' || l.status === 'PartiallyReleased').length}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Claimable</p>
          <p className="text-2xl font-bold text-indigo-400">
            {locks.filter((l) => canClaim(l)).length}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Completed</p>
          <p className="text-2xl font-bold text-blue-400">
            {locks.filter((l) => l.status === 'FullyReleased').length}
          </p>
        </div>
      </div>

      {/* Locks List */}
      {locks.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-400 mb-4">No locks created yet</p>
          {isAdmin && !isPublicView && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white"
            >
              Create Your First Lock
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {locks.map((lock) => {
            const beneficiaryName = getContactName(lock.beneficiary);
            const creatorName = getContactName(lock.creator);
            
            return (
              <div key={lock.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-lg font-semibold text-white">
                        Lock #{lock.id}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(lock.status)}`}>
                        {lock.status}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300">
                        {lock.lock_type === 'TimeLock' ? '⏰ Time Lock' : '📈 Vesting'}
                      </span>
                      {lock.revocable && (
                        <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-400">
                          Revocable
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{getProgressPercent(lock)}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                          style={{ width: `${getProgressPercent(lock)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Token</p>
                        <p className="text-white font-medium">{getTokenSymbol(lock.token)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Amount</p>
                        <p className="text-white font-medium">
                          {formatAmount(lock.total_amount, getTokenDecimals(lock.token))}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Released</p>
                        <p className="text-green-400 font-medium">
                          {formatAmount(lock.released_amount, getTokenDecimals(lock.token))}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Time Remaining</p>
                        <p className="text-white font-medium">{getTimeRemaining(lock)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Beneficiary</p>
                        <div className="flex items-center gap-2">
                          {beneficiaryName ? (
                            <>
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                                {beneficiaryName}
                              </span>
                              <span className="text-gray-500 text-xs">{truncateAddress(lock.beneficiary)}</span>
                            </>
                          ) : (
                            <span className="text-white font-mono">{truncateAddress(lock.beneficiary)}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400">Creator</p>
                        <div className="flex items-center gap-2">
                          {creatorName ? (
                            <>
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                                {creatorName}
                              </span>
                              <span className="text-gray-500 text-xs">{truncateAddress(lock.creator)}</span>
                            </>
                          ) : (
                            <span className="text-white font-mono">{truncateAddress(lock.creator)}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400">
                          {lock.lock_type === 'TimeLock' ? 'Unlock Date' : 'End Date'}
                        </p>
                        <p className="text-white">
                          {new Date(Number(lock.end_time) * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      {lock.description && (
                        <div>
                          <p className="text-gray-400">Description</p>
                          <p className="text-white">{lock.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions - only show if not public view */}
                  {!isPublicView && (
                    <div className="flex gap-2 ml-4">
                      {canClaim(lock) && (lock.beneficiary === publicKey || isAdmin) && (
                        <button
                          onClick={() => handleClaim(lock.id)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-white text-sm disabled:opacity-50 transition-colors"
                        >
                          Claim
                        </button>
                      )}
                      {isAdmin && lock.revocable && (lock.status === 'Active' || lock.status === 'PartiallyReleased') && (
                        <button
                          onClick={() => handleCancel(lock.id)}
                          disabled={loading}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-white text-sm disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Lock Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Create Asset Lock</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Lock Type Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setLockType('timelock')}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  lockType === 'timelock'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                ⏰ Time Lock
              </button>
              <button
                onClick={() => setLockType('vesting')}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  lockType === 'vesting'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                📈 Vesting
              </button>
            </div>

            <div className="space-y-4">
              {/* Token Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Token</label>
                <select
                  value={selectedToken}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select token</option>
                  {vaultBalance.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol} - {formatAmount(token.balance, token.decimals)} available
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="any"
                  min="0"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Beneficiary with Contacts */}
              <div className="relative">
                <label className="block text-sm text-gray-400 mb-1">Beneficiary</label>
                
                {/* Quick select contacts */}
                {contacts.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span className="text-xs text-gray-500">Quick select:</span>
                    {contacts.slice(0, 5).map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => handleSelectContact(contact)}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          beneficiary === contact.address
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {contact.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    value={beneficiary.startsWith('G') ? beneficiary : contactSearch}
                    onChange={(e) => handleBeneficiaryChange(e.target.value)}
                    onFocus={() => {
                      if (contacts.length > 0 && !beneficiary.startsWith('G')) {
                        setShowContactDropdown(true);
                      }
                    }}
                    placeholder="Search contacts or enter G... address"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />

                  {/* Show selected contact badge */}
                  {beneficiary.startsWith('G') && getContactName(beneficiary) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full">
                        {getContactName(beneficiary)}
                      </span>
                    </div>
                  )}

                  {/* Contact dropdown */}
                  {showContactDropdown && filteredContacts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => handleSelectContact(contact)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold text-sm">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{contact.name}</p>
                            <p className="text-gray-400 text-xs font-mono truncate">{contact.address}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Show full address if selected */}
                {beneficiary.startsWith('G') && (
                  <p className="text-xs text-gray-500 mt-1 font-mono truncate">{beneficiary}</p>
                )}
              </div>

              {lockType === 'timelock' ? (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Unlock Date & Time</label>
                  <input
                    type="datetime-local"
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Cliff Period (days)</label>
                      <input
                        type="number"
                        value={cliffDays}
                        onChange={(e) => setCliffDays(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">No tokens released during cliff</p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Total Duration (days)</label>
                      <input
                        type="number"
                        value={vestingDays}
                        onChange={(e) => setVestingDays(e.target.value)}
                        placeholder="30"
                        min="1"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Release Interval (days)</label>
                    <input
                      type="number"
                      value={releaseIntervalDays}
                      onChange={(e) => setReleaseIntervalDays(e.target.value)}
                      placeholder="7"
                      min="1"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">How often tokens become claimable</p>
                  </div>
                </>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Team vesting, Advisor tokens"
                  maxLength={32}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Revocable Toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  id="revocable"
                  checked={revocable}
                  onChange={(e) => setRevocable(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="revocable" className="text-gray-300 flex-1">
                  <span className="font-medium">Revocable</span>
                  <p className="text-xs text-gray-500">Admin can cancel and return unlocked funds to vault</p>
                </label>
              </div>

              <p className="text-xs text-gray-500 p-2 bg-gray-800/50 rounded">
                ⚠️ A 0.1 XLM fee will be charged for creating the lock.
              </p>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              {/* Submit Button */}
              <button
                onClick={handleCreateLock}
                disabled={loading || !selectedToken || !beneficiary || !amount}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
              >
                {loading ? 'Creating...' : 'Create Lock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Locks;
