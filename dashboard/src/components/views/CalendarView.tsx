import React, { useState, useMemo } from 'react';
import { formatAmount } from '../../lib/utils';
import { SUPPORTED_TOKENS, NATIVE_TOKEN } from '../../config';

interface Lock {
  id: number;
  creator: string;
  beneficiary: string;
  token: string;
  total_amount: bigint | string | number;
  released_amount: bigint | string | number;
  lock_type: number | string;
  status: number | string;
  created_at?: number;
  start_time: number | bigint;
  end_time: number | bigint;
  cliff_time: number | bigint;
  release_intervals: number | bigint;
  revocable: boolean;
  description: string;
}

interface TokenBalance {
  address: string;
  symbol: string;
  decimals: number;
}

interface CalendarViewProps {
  locks: Lock[];
  vaultBalance?: TokenBalance[];
}

type ViewMode = 'calendar' | 'list';

// Safe conversion helpers
const safeNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return parseInt(value) || 0;
  return 0;
};

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

const getLockTypeNum = (lockType: any): number => {
  if (typeof lockType === 'number') return lockType;
  if (typeof lockType === 'string') {
    if (lockType.toLowerCase().includes('time') || lockType === 'TimeLock') return 0;
    if (lockType.toLowerCase().includes('vest') || lockType === 'Vesting') return 1;
  }
  if (typeof lockType === 'object' && lockType !== null) {
    const keys = Object.keys(lockType);
    if (keys.length > 0) {
      if (keys[0].toLowerCase().includes('time')) return 0;
      if (keys[0].toLowerCase().includes('vest')) return 1;
    }
  }
  return 0;
};

const getStatusNum = (status: any): number => {
  if (typeof status === 'number') return status;
  if (typeof status === 'string') {
    const s = status.toLowerCase();
    if (s === 'active') return 0;
    if (s === 'partiallyreleased') return 1;
    if (s === 'fullyreleased') return 2;
    if (s === 'cancelled') return 3;
  }
  if (typeof status === 'object' && status !== null) {
    const keys = Object.keys(status);
    if (keys.length > 0) {
      const k = keys[0].toLowerCase();
      if (k === 'active') return 0;
      if (k === 'partiallyreleased') return 1;
      if (k === 'fullyreleased') return 2;
      if (k === 'cancelled') return 3;
    }
  }
  return 0;
};

const CalendarView: React.FC<CalendarViewProps> = ({ locks, vaultBalance = [] }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<'all' | 'timelock' | 'vesting'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  // Separate Time Locks and Vestings
  const timeLocks = useMemo(() => locks.filter(l => getLockTypeNum(l.lock_type) === 0), [locks]);
  const vestings = useMemo(() => locks.filter(l => getLockTypeNum(l.lock_type) === 1), [locks]);

  const getTokenSymbol = (tokenAddress: string): string => {
    if (tokenAddress === NATIVE_TOKEN) return 'XLM';
    const token = SUPPORTED_TOKENS.find(t => t.address === tokenAddress);
    if (token) return token.symbol;
    const custom = vaultBalance.find(t => t.address === tokenAddress);
    return custom?.symbol || tokenAddress.slice(0, 8) + '...';
  };

  const getStatusLabel = (status: any): string => {
    const num = getStatusNum(status);
    switch (num) {
      case 0: return 'Active';
      case 1: return 'Partially Released';
      case 2: return 'Fully Released';
      case 3: return 'Cancelled';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: any): string => {
    const num = getStatusNum(status);
    switch (num) {
      case 0: return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 1: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 2: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 3: return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (timestamp: any): string => {
    const ts = safeNumber(timestamp);
    if (!ts) return 'N/A';
    return new Date(ts * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateProgress = (lock: Lock): number => {
    const now = Math.floor(Date.now() / 1000);
    const endTime = safeNumber(lock.end_time);
    const startTime = safeNumber(lock.start_time);
    if (now >= endTime) return 100;
    if (now <= startTime) return 0;
    const total = endTime - startTime;
    const elapsed = now - startTime;
    return Math.min(100, Math.floor((elapsed / total) * 100));
  };

  const calculateVestedAmount = (lock: Lock): bigint => {
    const now = Math.floor(Date.now() / 1000);
    const totalAmount = safeBigInt(lock.total_amount);
    const lockType = getLockTypeNum(lock.lock_type);
    const endTime = safeNumber(lock.end_time);
    const startTime = safeNumber(lock.start_time);
    const cliffTime = safeNumber(lock.cliff_time);
    const releaseIntervals = safeNumber(lock.release_intervals);
    
    if (lockType === 0) {
      return now >= endTime ? totalAmount : BigInt(0);
    }
    
    if (now < cliffTime) return BigInt(0);
    if (now >= endTime) return totalAmount;
    
    const vestingDuration = endTime - startTime;
    const elapsed = now - startTime;
    
    if (releaseIntervals > 0) {
      const intervalsPassed = Math.floor(elapsed / releaseIntervals);
      const totalIntervals = Math.floor(vestingDuration / releaseIntervals);
      if (totalIntervals === 0) return BigInt(0);
      return (totalAmount * BigInt(intervalsPassed)) / BigInt(totalIntervals);
    }
    
    if (vestingDuration === 0) return BigInt(0);
    return (totalAmount * BigInt(elapsed)) / BigInt(vestingDuration);
  };

  const filteredLocks = useMemo(() => {
    return locks.filter(lock => {
      const lockType = getLockTypeNum(lock.lock_type);
      const status = getStatusNum(lock.status);
      
      if (filterType === 'timelock' && lockType !== 0) return false;
      if (filterType === 'vesting' && lockType !== 1) return false;
      if (filterStatus === 'active' && status !== 0 && status !== 1) return false;
      if (filterStatus === 'completed' && status !== 2 && status !== 3) return false;
      return true;
    });
  }, [locks, filterType, filterStatus]);

  const sortedLocks = useMemo(() => {
    return [...filteredLocks].sort((a, b) => {
      const aTime = safeNumber(a.end_time);
      const bTime = safeNumber(b.end_time);
      return aTime - bTime;
    });
  }, [filteredLocks]);

  const renderTimeline = () => {
    if (sortedLocks.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          No locks or vestings to display
        </div>
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const times = sortedLocks.flatMap(l => [safeNumber(l.start_time), safeNumber(l.end_time)]);
    const minTime = Math.min(...times, now);
    const maxTime = Math.max(...times, now);
    const totalDuration = maxTime - minTime || 1;

    return (
      <div className="space-y-4">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{formatDate(minTime)}</span>
          <span>Today</span>
          <span>{formatDate(maxTime)}</span>
        </div>
        
        <div className="relative h-2 bg-gray-800 rounded-full mb-6">
          <div 
            className="absolute top-0 w-0.5 h-4 bg-cyan-400 -mt-1 z-10"
            style={{ left: `${((now - minTime) / totalDuration) * 100}%` }}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-cyan-400 whitespace-nowrap">
              Now
            </div>
          </div>
        </div>

        {/* Time Locks Section */}
        {timeLocks.length > 0 && (filterType === 'all' || filterType === 'timelock') && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-purple-400 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              Time Locks ({timeLocks.filter(l => filterStatus === 'all' || 
                (filterStatus === 'active' && (getStatusNum(l.status) === 0 || getStatusNum(l.status) === 1)) ||
                (filterStatus === 'completed' && (getStatusNum(l.status) === 2 || getStatusNum(l.status) === 3))
              ).length})
            </h3>
            {timeLocks.filter(l => filterStatus === 'all' || 
              (filterStatus === 'active' && (getStatusNum(l.status) === 0 || getStatusNum(l.status) === 1)) ||
              (filterStatus === 'completed' && (getStatusNum(l.status) === 2 || getStatusNum(l.status) === 3))
            ).map((lock) => renderLockBar(lock, minTime, totalDuration, 'purple'))}
          </div>
        )}

        {/* Vestings Section */}
        {vestings.length > 0 && (filterType === 'all' || filterType === 'vesting') && (
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Vestings ({vestings.filter(l => filterStatus === 'all' || 
                (filterStatus === 'active' && (getStatusNum(l.status) === 0 || getStatusNum(l.status) === 1)) ||
                (filterStatus === 'completed' && (getStatusNum(l.status) === 2 || getStatusNum(l.status) === 3))
              ).length})
            </h3>
            {vestings.filter(l => filterStatus === 'all' || 
              (filterStatus === 'active' && (getStatusNum(l.status) === 0 || getStatusNum(l.status) === 1)) ||
              (filterStatus === 'completed' && (getStatusNum(l.status) === 2 || getStatusNum(l.status) === 3))
            ).map((lock) => renderLockBar(lock, minTime, totalDuration, 'blue'))}
          </div>
        )}
      </div>
    );
  };

  const renderLockBar = (lock: Lock, minTime: number, totalDuration: number, color: 'purple' | 'blue') => {
    const startTime = safeNumber(lock.start_time);
    const endTime = safeNumber(lock.end_time);
    const cliffTime = safeNumber(lock.cliff_time);
    const startPercent = ((startTime - minTime) / totalDuration) * 100;
    const endPercent = ((endTime - minTime) / totalDuration) * 100;
    const width = Math.max(endPercent - startPercent, 2);
    const progress = calculateProgress(lock);
    const vestedAmount = calculateVestedAmount(lock);
    const totalAmount = safeBigInt(lock.total_amount);
    const lockType = getLockTypeNum(lock.lock_type);

    const bgColor = color === 'purple' ? 'bg-purple-500/30' : 'bg-blue-500/30';
    const borderColor = color === 'purple' ? 'border-purple-600' : 'border-blue-600';

    return (
      <div key={lock.id} className="relative group mb-4">
        <div className="flex items-center gap-4 mb-1">
          <div className="w-16 text-sm text-gray-400">#{lock.id}</div>
          <div className="flex-1 text-sm text-gray-300 truncate">
            {formatAmount(totalAmount, 7)} {getTokenSymbol(lock.token)}
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(lock.status)}`}>
            {getStatusLabel(lock.status)}
          </span>
        </div>
        
        <div className="relative h-8 mb-2">
          <div 
            className={`absolute h-full rounded-lg bg-gray-700/50 border ${borderColor}`}
            style={{ left: `${startPercent}%`, width: `${width}%` }}
          >
            <div 
              className={`h-full rounded-lg ${bgColor}`}
              style={{ width: `${progress}%` }}
            />
            
            {lockType === 1 && cliffTime > startTime && (
              <div 
                className="absolute top-0 h-full w-0.5 bg-yellow-400"
                style={{ left: `${((cliffTime - startTime) / (endTime - startTime)) * 100}%` }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-yellow-400 whitespace-nowrap">
                  Cliff
                </div>
              </div>
            )}
            
            <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
              <span className="text-gray-300">{formatDate(startTime)}</span>
              <span className="text-white font-medium">
                {progress}%
              </span>
              <span className="text-gray-300">{formatDate(endTime)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderList = () => {
    const renderLockList = (lockList: Lock[], title: string, color: string) => {
      if (lockList.length === 0) return null;
      
      return (
        <div className="mb-8">
          <h3 className={`text-lg font-semibold ${color} mb-4`}>{title} ({lockList.length})</h3>
          <div className="space-y-3">
            {lockList.map((lock) => {
              const progress = calculateProgress(lock);
              const vestedAmount = calculateVestedAmount(lock);
              const totalAmount = safeBigInt(lock.total_amount);
              const releasedAmount = safeBigInt(lock.released_amount);
              const claimable = vestedAmount > releasedAmount ? vestedAmount - releasedAmount : BigInt(0);
              const lockType = getLockTypeNum(lock.lock_type);

              return (
                <div 
                  key={lock.id}
                  className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-400">#{lock.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${lockType === 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {lockType === 0 ? 'Time Lock' : 'Vesting'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(lock.status)}`}>
                          {getStatusLabel(lock.status)}
                        </span>
                      </div>
                      <div className="text-xl font-bold text-white">
                        {formatAmount(totalAmount, 7)} {getTokenSymbol(lock.token)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Claimable</div>
                      <div className="text-lg font-semibold text-cyan-400">
                        {formatAmount(claimable, 7)} {getTokenSymbol(lock.token)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-white">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${lockType === 0 ? 'bg-purple-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Start</div>
                      <div className="text-gray-300">{formatDate(lock.start_time)}</div>
                    </div>
                    {lockType === 1 && safeNumber(lock.cliff_time) > 0 && (
                      <div>
                        <div className="text-gray-500">Cliff</div>
                        <div className="text-yellow-400">{formatDate(lock.cliff_time)}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-500">{lockType === 0 ? 'Unlock' : 'End'}</div>
                      <div className="text-gray-300">{formatDate(lock.end_time)}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Beneficiary</div>
                      <div className="text-gray-300 font-mono">{lock.beneficiary.slice(0, 8)}...</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const filteredTimeLocks = timeLocks.filter(l => 
      filterStatus === 'all' || 
      (filterStatus === 'active' && (getStatusNum(l.status) === 0 || getStatusNum(l.status) === 1)) ||
      (filterStatus === 'completed' && (getStatusNum(l.status) === 2 || getStatusNum(l.status) === 3))
    );

    const filteredVestings = vestings.filter(l => 
      filterStatus === 'all' || 
      (filterStatus === 'active' && (getStatusNum(l.status) === 0 || getStatusNum(l.status) === 1)) ||
      (filterStatus === 'completed' && (getStatusNum(l.status) === 2 || getStatusNum(l.status) === 3))
    );

    return (
      <div>
        {(filterType === 'all' || filterType === 'timelock') && 
          renderLockList(filteredTimeLocks, 'Time Locks', 'text-purple-400')}
        {(filterType === 'all' || filterType === 'vesting') && 
          renderLockList(filteredVestings, 'Vestings', 'text-blue-400')}
        {filteredTimeLocks.length === 0 && filteredVestings.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No locks or vestings to display
          </div>
        )}
      </div>
    );
  };

  const renderCalendar = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const getEventsForDay = (day: number) => {
      const events: { lock: Lock; type: 'start' | 'cliff' | 'end' }[] = [];
      
      filteredLocks.forEach(lock => {
        const startDate = new Date(safeNumber(lock.start_time) * 1000);
        const cliffDate = new Date(safeNumber(lock.cliff_time) * 1000);
        const endDate = new Date(safeNumber(lock.end_time) * 1000);
        
        if (startDate.getFullYear() === year && startDate.getMonth() === month && startDate.getDate() === day) {
          events.push({ lock, type: 'start' });
        }
        if (safeNumber(lock.cliff_time) > 0 && cliffDate.getFullYear() === year && cliffDate.getMonth() === month && cliffDate.getDate() === day) {
          events.push({ lock, type: 'cliff' });
        }
        if (endDate.getFullYear() === year && endDate.getMonth() === month && endDate.getDate() === day) {
          events.push({ lock, type: 'end' });
        }
      });
      
      return events;
    };

    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-900/30" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      
      days.push(
        <div 
          key={day} 
          className={`h-24 p-1 border border-gray-800 ${isToday ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-gray-900/30'}`}
        >
          <div className={`text-sm mb-1 ${isToday ? 'text-cyan-400 font-bold' : 'text-gray-400'}`}>
            {day}
          </div>
          <div className="space-y-1 overflow-y-auto max-h-16">
            {dayEvents.map((event, idx) => {
              const lockType = getLockTypeNum(event.lock.lock_type);
              const bgColor = lockType === 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400';
              return (
                <div 
                  key={idx}
                  className={`text-xs px-1 py-0.5 rounded truncate ${
                    event.type === 'cliff' ? 'bg-yellow-500/20 text-yellow-400' : bgColor
                  }`}
                  title={`#${event.lock.id} - ${event.type}`}
                >
                  #{event.lock.id} {event.type}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedMonth(new Date(year, month - 1))}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-semibold">
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => setSelectedMonth(new Date(year, month + 1))}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px mb-px">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm text-gray-400 py-2 bg-gray-800">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px">
          {days}
        </div>

        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30" />
            <span className="text-gray-400">Time Lock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30" />
            <span className="text-gray-400">Vesting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30" />
            <span className="text-gray-400">Cliff</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Locks & Vesting Calendar</h2>
          <p className="text-gray-400">
            {timeLocks.length} time locks, {vestings.length} vestings
          </p>
        </div>

        <div className="flex gap-2">
          {(['calendar', 'list'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                viewMode === mode
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          <span className="text-gray-400 self-center">Type:</span>
          {(['all', 'timelock', 'vesting'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                filterType === type
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              {type === 'all' ? 'All' : type === 'timelock' ? 'Time Locks' : 'Vestings'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400 self-center">Status:</span>
          {(['all', 'active', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                filterStatus === status
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800/30 rounded-2xl p-6 border border-gray-700/50">
        
        {viewMode === 'calendar' && renderCalendar()}
        {viewMode === 'list' && renderList()}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/30">
          <div className="text-purple-400 text-sm">Time Locks</div>
          <div className="text-xl font-bold text-white">{timeLocks.length}</div>
          <div className="text-sm text-gray-400">
            {formatAmount(timeLocks.reduce((sum, l) => sum + safeBigInt(l.total_amount), BigInt(0)), 7)} locked
          </div>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
          <div className="text-blue-400 text-sm">Vestings</div>
          <div className="text-xl font-bold text-white">{vestings.length}</div>
          <div className="text-sm text-gray-400">
            {formatAmount(vestings.reduce((sum, l) => sum + safeBigInt(l.total_amount), BigInt(0)), 7)} vesting
          </div>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
          <div className="text-green-400 text-sm">Released</div>
          <div className="text-xl font-bold text-white">
            {formatAmount(locks.reduce((sum, l) => sum + safeBigInt(l.released_amount), BigInt(0)), 7)}
          </div>
        </div>
        <div className="bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/30">
          <div className="text-cyan-400 text-sm">Active</div>
          <div className="text-xl font-bold text-white">
            {locks.filter(l => getStatusNum(l.status) === 0 || getStatusNum(l.status) === 1).length}
          </div>
          <div className="text-sm text-gray-400">
            {locks.filter(l => getStatusNum(l.status) === 2).length} completed
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
