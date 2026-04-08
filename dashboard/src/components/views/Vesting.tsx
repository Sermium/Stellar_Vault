import React, { useState, useEffect } from 'react';
import { getContacts, Contact } from '../../services/contactsService';

interface Lock {
  id: number | bigint;
  creator: string;
  beneficiary: string;
  token: string;
  total_amount: bigint | string | number;
  released_amount: bigint | string | number;
  lock_type: 'TimeLock' | 'Vesting' | string;
  status: 'Active' | 'PartiallyReleased' | 'FullyReleased' | 'Cancelled' | string;
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

interface Proposal {
  id: number;
  token: string;
  amount: bigint | string;
  status: number | string;
}

interface VestingProps {
  vaultAddress: string | null;
  locks: Lock[];
  vaultBalance: TokenBalance[];
  proposals?: Proposal[];
  userRole?: string;
  publicKey: string | null;
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

function getLockTypeString(lockType: any): string {
  if (typeof lockType === 'string') return lockType;
  if (typeof lockType === 'number') return lockType === 0 ? 'TimeLock' : 'Vesting';
  if (typeof lockType === 'object' && lockType !== null) {
    const keys = Object.keys(lockType);
    if (keys.length > 0) return keys[0];
  }
  return 'Unknown';
}

function getStatusString(status: any): string {
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
}

const Vesting: React.FC<VestingProps> = ({
  vaultAddress,
  locks: allLocks,
  vaultBalance,
  proposals = [],
  userRole,
  publicKey,
  onCreateVestingLock,
  onClaimLock,
  onCancelLock,
  onRefresh,
  preselectedToken,
  isPublicView = false,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [cliffDays, setCliffDays] = useState('30');
  const [vestingDays, setVestingDays] = useState('365');
  const [releaseIntervalDays, setReleaseIntervalDays] = useState('30');
  const [revocable, setRevocable] = useState(true);
  const [description, setDescription] = useState('');

  const isAdmin = userRole === 'Admin' || userRole === 'SuperAdmin';
  const locks = allLocks.filter(l => getLockTypeString(l.lock_type) === 'Vesting');

  useEffect(() => { setContacts(getContacts()); }, [showCreateModal]);
  useEffect(() => { if (preselectedToken) { setSelectedToken(preselectedToken); setShowCreateModal(true); } }, [preselectedToken]);

  const getLockId = (lock: Lock): number => typeof lock.id === 'bigint' ? Number(lock.id) : lock.id;
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
  
  const getAvailableBalance = (tokenAddress: string): bigint => {
    const token = vaultBalance.find(t => t.address === tokenAddress);
    if (!token) return BigInt(0);
    const totalBalance = token.balance;
    const lockedAmount = allLocks
      .filter(l => l.token === tokenAddress && getStatusString(l.status) === 'Active')
      .reduce((sum, l) => sum + BigInt(l.total_amount || 0) - BigInt(l.released_amount || 0), BigInt(0));
    const pendingAmount = proposals
      .filter(p => p.token === tokenAddress && (Number(p.status) === 0 || Number(p.status) === 1))
      .reduce((sum, p) => sum + BigInt(p.amount || 0), BigInt(0));
    const reserved = lockedAmount + pendingAmount;
    return totalBalance > reserved ? totalBalance - reserved : BigInt(0);
  };
  const getTokenSymbol = (tokenAddress: string): string => vaultBalance.find(t => t.address === tokenAddress)?.symbol || truncateAddress(tokenAddress);
  const getTokenDecimals = (tokenAddress: string): number => vaultBalance.find(t => t.address === tokenAddress)?.decimals || 7;
  const getContactName = (address: string): string | null => contacts.find(c => c.address === address)?.name || null;
  const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()) || c.address.toLowerCase().includes(contactSearch.toLowerCase()));

  const handleSelectContact = (contact: Contact) => { setBeneficiary(contact.address); setContactSearch(contact.name); setShowContactDropdown(false); };
  const handleBeneficiaryChange = (value: string) => { setBeneficiary(value); setContactSearch(value); setShowContactDropdown(value.length > 0 && !value.startsWith('G')); };

  const isAutoArchived = (lock: Lock): boolean => {
    const status = getStatusString(lock.status);
    if (status !== 'FullyReleased' && status !== 'Cancelled') return false;
    const now = Math.floor(Date.now() / 1000);
    const remaining = safeBigInt(lock.total_amount) - safeBigInt(lock.released_amount);
    if (status === 'Cancelled') return remaining <= BigInt(0) || now > Number(lock.end_time);
    return now > Number(lock.end_time);
  };

  const isLockClaimable = (lock: Lock): boolean => {
    const status = getStatusString(lock.status);
    if (status !== 'Active' && status !== 'PartiallyReleased') return false;
    const now = Math.floor(Date.now() / 1000);
    return now >= Number(lock.cliff_time);
  };

  // FIXED: Added !! for boolean coercion
  const canUserClaim = (lock: Lock): boolean => !!(publicKey && isLockClaimable(lock) && lock.beneficiary === publicKey);
  const canUserCancel = (lock: Lock): boolean => !!(publicKey && isAdmin && lock.revocable && ['Active', 'PartiallyReleased'].includes(getStatusString(lock.status)));
  
  const getProgressPercent = (lock: Lock): number => { const t = safeBigInt(lock.total_amount); return t === BigInt(0) ? 0 : Number((safeBigInt(lock.released_amount) * BigInt(100)) / t); };

  const getVestedAmount = (lock: Lock): bigint => {
    const now = Math.floor(Date.now() / 1000);
    const cliffTime = Number(lock.cliff_time);
    const endTime = Number(lock.end_time);
    const total = safeBigInt(lock.total_amount);
    if (now < cliffTime) return BigInt(0);
    if (now >= endTime) return total;
    const elapsed = BigInt(now - Number(lock.start_time));
    const duration = BigInt(endTime - Number(lock.start_time));
    return (total * elapsed) / duration;
  };

  const getClaimableAmount = (lock: Lock): bigint => {
    const vested = getVestedAmount(lock);
    const released = safeBigInt(lock.released_amount);
    return vested > released ? vested - released : BigInt(0);
  };

  const getTimeRemaining = (lock: Lock): string => {
    const now = Math.floor(Date.now() / 1000);
    const cliffTime = Number(lock.cliff_time);
    const endTime = Number(lock.end_time);
    if (now < cliffTime) {
      const diff = cliffTime - now;
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      return days + 'd ' + hours + 'h to cliff';
    }
    if (now >= endTime) return 'Fully vested';
    const diff = endTime - now;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    return days + 'd ' + hours + 'h remaining';
  };

  const getStatusColor = (status: any) => {
    switch (getStatusString(status)) {
      case 'Active': return 'bg-green-500/20 text-green-400';
      case 'PartiallyReleased': return 'bg-yellow-500/20 text-yellow-400';
      case 'FullyReleased': return 'bg-blue-500/20 text-blue-400';
      case 'Cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleCreateVesting = async () => {
    if (!selectedToken || !beneficiary || !amount) { setError('Please fill in all required fields'); return; }
    if (!beneficiary.startsWith('G') || beneficiary.length !== 56) { setError('Invalid beneficiary address'); return; }
    setLoading(true); setError(null);
    try {
      const startTime = Math.floor(Date.now() / 1000);
      const cliffDuration = parseInt(cliffDays) * 86400;
      const totalDuration = parseInt(vestingDays) * 86400;
      const releaseIntervals = parseInt(releaseIntervalDays) * 86400;
      if (totalDuration <= 0) { setError('Vesting duration must be greater than 0'); setLoading(false); return; }
      if (cliffDuration >= totalDuration) { setError('Cliff must be shorter than total duration'); setLoading(false); return; }
      await onCreateVestingLock(beneficiary, selectedToken, amount, startTime, cliffDuration, totalDuration, releaseIntervals, revocable, description || 'Vesting Schedule');
      setShowCreateModal(false); resetForm(); onRefresh();
    } catch (err: any) { setError(err.message || 'Failed to create vesting'); } finally { setLoading(false); }
  };

  const handleClaim = async (lockId: number | bigint) => {
    setLoading(true); setError(null);
    try { await onClaimLock(typeof lockId === 'bigint' ? Number(lockId) : lockId); onRefresh(); }
    catch (err: any) { setError(err.message || 'Failed to claim'); } finally { setLoading(false); }
  };

  const handleCancel = async (lockId: number | bigint) => {
    if (!window.confirm('Are you sure you want to cancel this vesting schedule?')) return;
    setLoading(true); setError(null);
    try { await onCancelLock(typeof lockId === 'bigint' ? Number(lockId) : lockId); onRefresh(); }
    catch (err: any) { setError(err.message || 'Failed to cancel'); } finally { setLoading(false); }
  };

  const resetForm = () => { setBeneficiary(''); setContactSearch(''); setSelectedToken(''); setAmount(''); setCliffDays('30'); setVestingDays('365'); setReleaseIntervalDays('30'); setRevocable(true); setDescription(''); setShowContactDropdown(false); };

  const myClaimableLocks = locks.filter(l => l.beneficiary === publicKey && !isAutoArchived(l));
  const activeLocks = locks.filter(l => ['Active', 'PartiallyReleased'].includes(getStatusString(l.status)) && l.beneficiary !== publicKey);
  const archivedLocks = locks.filter(l => isAutoArchived(l));
  const pendingCompletion = locks.filter(l => ['FullyReleased', 'Cancelled'].includes(getStatusString(l.status)) && !isAutoArchived(l) && l.beneficiary !== publicKey);

  const VestingCard: React.FC<{ lock: Lock; showClaimButton?: boolean; isArchived?: boolean }> = ({ lock, showClaimButton = false, isArchived = false }) => {
    const beneficiaryName = getContactName(lock.beneficiary);
    const creatorName = getContactName(lock.creator);
    const claimable = isLockClaimable(lock);
    const total = safeBigInt(lock.total_amount);
    const released = safeBigInt(lock.released_amount);
    const remaining = total - released;
    const claimableAmount = getClaimableAmount(lock);
    const vestedAmount = getVestedAmount(lock);

    return (
      <div className={'bg-gray-800 rounded-lg p-4 ' + (isArchived ? 'opacity-60 ' : '') + (showClaimButton && claimable && claimableAmount > BigInt(0) ? 'border-2 border-cyan-500/50' : '')}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-lg font-semibold text-white">Vesting #{getLockId(lock)}</span>
              <span className={'px-2 py-1 rounded text-xs ' + getStatusColor(lock.status)}>{getStatusString(lock.status)}</span>
              <span className="px-2 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400">📈 Vesting</span>
              {lock.revocable && !isArchived && <span className="px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-400">Revocable</span>}
              {showClaimButton && claimable && claimableAmount > BigInt(0) && <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400 animate-pulse">✓ {formatAmount(claimableAmount, getTokenDecimals(lock.token))} Claimable</span>}
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Vested: {formatAmount(vestedAmount, getTokenDecimals(lock.token))} / {formatAmount(total, getTokenDecimals(lock.token))}</span>
                <span>{Math.min(100, Math.floor(Number(vestedAmount * BigInt(100) / total)))}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={'h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all'} style={{ width: Math.min(100, Number(vestedAmount * BigInt(100) / total)) + '%' }} />
              </div>
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Released: {formatAmount(released, getTokenDecimals(lock.token))}</span>
                <span>{getProgressPercent(lock)}%</span>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className={'h-full bg-green-500 transition-all'} style={{ width: getProgressPercent(lock) + '%' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-400">Token</p><p className="text-white font-medium">{getTokenSymbol(lock.token)}</p></div>
              <div><p className="text-gray-400">Remaining</p><p className={'font-medium ' + (remaining > BigInt(0) ? 'text-yellow-400' : 'text-gray-500')}>{formatAmount(remaining, getTokenDecimals(lock.token))}</p></div>
              <div><p className="text-gray-400">Status</p><p className={'font-medium ' + (claimable ? 'text-cyan-400' : 'text-white')}>{getTimeRemaining(lock)}</p></div>
              <div><p className="text-gray-400">Cliff Date</p><p className="text-white">{new Date(Number(lock.cliff_time) * 1000).toLocaleDateString()}</p></div>
              <div><p className="text-gray-400">End Date</p><p className="text-white">{new Date(Number(lock.end_time) * 1000).toLocaleDateString()}</p></div>
              <div><p className="text-gray-400">Release Interval</p><p className="text-white">{Math.floor(Number(lock.release_intervals) / 86400)} days</p></div>
              <div><p className="text-gray-400">Beneficiary</p>
                <div className="flex items-center gap-2">
                  {beneficiaryName ? <><span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">{beneficiaryName}</span><span className="text-gray-500 text-xs">{truncateAddress(lock.beneficiary)}</span></> : <span className="text-white font-mono text-xs">{truncateAddress(lock.beneficiary)}</span>}
                  {lock.beneficiary === publicKey && <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">You</span>}
                </div>
              </div>
              <div><p className="text-gray-400">Creator</p>
                <div className="flex items-center gap-2">{creatorName ? <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">{creatorName}</span> : <span className="text-white font-mono text-xs">{truncateAddress(lock.creator)}</span>}</div>
              </div>
              {lock.description && <div className="col-span-2"><p className="text-gray-400">Description</p><p className="text-white">{lock.description}</p></div>}
            </div>
          </div>
          {!isPublicView && !isArchived && (
            <div className="flex flex-col gap-2 ml-4">
              {canUserClaim(lock) && claimableAmount > BigInt(0) && <button onClick={() => handleClaim(lock.id)} disabled={loading} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-white font-semibold disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/25">{loading ? '...' : '💰 Claim'}</button>}
              {canUserCancel(lock) && <button onClick={() => handleCancel(lock.id)} disabled={loading} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm disabled:opacity-50 transition-colors">Cancel</button>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-white">📈 Vesting Schedules</h1><p className="text-gray-400 mt-1">Token vesting with cliff periods and gradual release</p></div>
        <div className="flex gap-3">
          <button onClick={onRefresh} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">Refresh</button>
          {isAdmin && !isPublicView && <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white transition-colors">+ Create Vesting</button>}
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400">{error}<button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">✕</button></div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4"><p className="text-gray-400 text-sm">Total Vesting</p><p className="text-2xl font-bold text-white">{locks.length}</p></div>
        <div className="bg-gray-800 rounded-lg p-4"><p className="text-gray-400 text-sm">Active</p><p className="text-2xl font-bold text-green-400">{activeLocks.length + myClaimableLocks.filter(l => getStatusString(l.status) === 'Active').length}</p></div>
        <div className="bg-gray-800 rounded-lg p-4"><p className="text-gray-400 text-sm">Claimable</p><p className="text-2xl font-bold text-cyan-400">{locks.filter(l => isLockClaimable(l) && getClaimableAmount(l) > BigInt(0)).length}</p></div>
        <div className="bg-gray-800 rounded-lg p-4"><p className="text-gray-400 text-sm">Your Vesting</p><p className="text-2xl font-bold text-purple-400">{locks.filter(l => l.beneficiary === publicKey).length}</p></div>
      </div>

      {myClaimableLocks.length > 0 && !isPublicView && <div className="mb-8"><h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><span className="text-2xl">🎁</span>Your Vesting Schedules</h2><div className="space-y-4">{myClaimableLocks.map(lock => <VestingCard key={getLockId(lock)} lock={lock} showClaimButton={true} />)}</div></div>}
      {activeLocks.length > 0 && <div className="mb-8"><h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><span className="text-2xl">📊</span>Active Vesting Schedules</h2><div className="space-y-4">{activeLocks.map(lock => <VestingCard key={getLockId(lock)} lock={lock} />)}</div></div>}
      {pendingCompletion.length > 0 && <div className="mb-8"><h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><span className="text-2xl">⏳</span>Pending Completion</h2><div className="space-y-4">{pendingCompletion.map(lock => <VestingCard key={getLockId(lock)} lock={lock} />)}</div></div>}

      {locks.length === 0 && <div className="bg-gray-800 rounded-lg p-8 text-center"><div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 flex items-center justify-center"><span className="text-3xl">📈</span></div><p className="text-gray-400 mb-4">No vesting schedules created yet</p>{isAdmin && !isPublicView && <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white">Create Your First Vesting Schedule</button>}</div>}

      {archivedLocks.length > 0 && <div className="mt-8"><button onClick={() => setShowArchived(!showArchived)} className="w-full flex items-center justify-between p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"><div className="flex items-center gap-2"><span className="text-xl">📦</span><span className="text-lg font-semibold text-gray-300">Archived</span><span className="px-2 py-0.5 bg-gray-700 text-gray-400 rounded text-sm">{archivedLocks.length}</span></div><svg className={'w-5 h-5 text-gray-400 transition-transform ' + (showArchived ? 'rotate-180' : '')} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>{showArchived && <div className="mt-4 space-y-4">{archivedLocks.map(lock => <VestingCard key={getLockId(lock)} lock={lock} isArchived={true} />)}</div>}</div>}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">📈 Create Vesting Schedule</h2><button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-gray-400 hover:text-white">✕</button></div>
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-1">Token</label><select value={selectedToken} onChange={e => setSelectedToken(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"><option value="">Select token</option>{vaultBalance.map(token => <option key={token.address} value={token.address}>{token.symbol} - {formatAmount(getAvailableBalance(token.address || ''), token.decimals)} available</option>)}</select></div>
              <div><label className="block text-sm text-gray-400 mb-1">Total Amount</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="any" min="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none" /></div>
              <div className="relative">
                <label className="block text-sm text-gray-400 mb-1">Beneficiary</label>
                {contacts.length > 0 && <div className="flex gap-2 mb-2 flex-wrap"><span className="text-xs text-gray-500">Quick select:</span>{contacts.slice(0,5).map(c => <button key={c.id} type="button" onClick={() => handleSelectContact(c)} className={'px-2 py-1 text-xs rounded-full transition-colors ' + (beneficiary === c.address ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>{c.name}</button>)}</div>}
                <input type="text" value={beneficiary.startsWith('G') ? beneficiary : contactSearch} onChange={e => handleBeneficiaryChange(e.target.value)} onFocus={() => { if (contacts.length > 0 && !beneficiary.startsWith('G')) setShowContactDropdown(true); }} placeholder="Search contacts or enter G... address" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none" />
                {showContactDropdown && filteredContacts.length > 0 && <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">{filteredContacts.map(c => <button key={c.id} type="button" onClick={() => handleSelectContact(c)} className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-sm">{c.name.charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><p className="text-white font-medium truncate">{c.name}</p><p className="text-gray-400 text-xs font-mono truncate">{c.address}</p></div></button>)}</div>}
                {beneficiary.startsWith('G') && <p className="text-xs text-gray-500 mt-1 font-mono truncate">{beneficiary}</p>}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm text-gray-400 mb-1">Cliff (days)</label><input type="number" value={cliffDays} onChange={e => setCliffDays(e.target.value)} placeholder="30" min="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none" /><p className="text-xs text-gray-500 mt-1">No release before cliff</p></div>
                <div><label className="block text-sm text-gray-400 mb-1">Duration (days)</label><input type="number" value={vestingDays} onChange={e => setVestingDays(e.target.value)} placeholder="365" min="1" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none" /><p className="text-xs text-gray-500 mt-1">Total vesting period</p></div>
                <div><label className="block text-sm text-gray-400 mb-1">Interval (days)</label><input type="number" value={releaseIntervalDays} onChange={e => setReleaseIntervalDays(e.target.value)} placeholder="30" min="1" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none" /><p className="text-xs text-gray-500 mt-1">Release frequency</p></div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-1">Description (optional)</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Employee vesting, Advisor allocation" maxLength={32} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none" /></div>
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"><input type="checkbox" id="revocable" checked={revocable} onChange={e => setRevocable(e.target.checked)} className="w-4 h-4 rounded" /><label htmlFor="revocable" className="text-gray-300 flex-1"><span className="font-medium">Revocable</span><p className="text-xs text-gray-500">Admin can cancel and return unvested funds</p></label></div>
              <div className="p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg text-sm">
                <p className="text-cyan-400 font-medium mb-2">Vesting Preview</p>
                <div className="text-gray-300 space-y-1">
                  <p>• Cliff ends: {new Date(Date.now() + parseInt(cliffDays || '0') * 86400000).toLocaleDateString()}</p>
                  <p>• Fully vested: {new Date(Date.now() + parseInt(vestingDays || '0') * 86400000).toLocaleDateString()}</p>
                  <p>• Releases every {releaseIntervalDays || '0'} days after cliff</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 p-2 bg-gray-800/50 rounded">⚠️ A 0.1 XLM fee will be charged for creating the vesting schedule.</p>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleCreateVesting} disabled={loading || !selectedToken || !beneficiary || !amount} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors">{loading ? 'Creating...' : 'Create Vesting Schedule'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vesting;
