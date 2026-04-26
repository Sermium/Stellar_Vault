import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Download, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';

interface BulkLockEntry {
  id: string;
  beneficiary: string;
  amount: string;
  token: string;
  unlockDate?: string;
  // Vesting specific
  cliffDate?: string;
  endDate?: string;
  releaseInterval?: string;
  revocable: boolean;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

interface BulkLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultAddress: string;
  publicKey: string;
  lockType: 'timelock' | 'vesting';
  availableTokens: Array<{ address: string; symbol: string; balance: string }>;
  onCreateProposal: (
    type: 'TimeLock' | 'VestingLock',
    token: string,
    amount: string,
    destination: string,
    unlockTime?: number,
    cliffTime?: number,
    endTime?: number,
    releaseInterval?: number,
    revocable?: boolean
  ) => Promise<void>;
  contacts?: Array<{ address: string; name: string }>;
}

const BulkLockModal: React.FC<BulkLockModalProps> = ({
  isOpen,
  onClose,
  vaultAddress,
  publicKey,
  lockType,
  availableTokens,
  onCreateProposal,
  contacts = [],
}) => {
  const [entries, setEntries] = useState<BulkLockEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // Initialize with one empty entry
  useEffect(() => {
    if (isOpen && entries.length === 0) {
      addEntry();
    }
  }, [isOpen]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addEntry = () => {
    const newEntry: BulkLockEntry = {
      id: generateId(),
      beneficiary: '',
      amount: '',
      token: availableTokens[0]?.address || '',
      unlockDate: '',
      cliffDate: '',
      endDate: '',
      releaseInterval: '2592000', // 30 days default
      revocable: true,
      status: 'pending',
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof BulkLockEntry, value: any) => {
    setEntries(entries.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const duplicateEntry = (entry: BulkLockEntry) => {
    const newEntry: BulkLockEntry = {
      ...entry,
      id: generateId(),
      beneficiary: '',
      status: 'pending',
      error: undefined,
    };
    setEntries([...entries, newEntry]);
  };

  const validateEntry = (entry: BulkLockEntry): string | null => {
    if (!entry.beneficiary || entry.beneficiary.length !== 56 || !entry.beneficiary.startsWith('G')) {
      return 'Invalid beneficiary address';
    }
    if (!entry.amount || parseFloat(entry.amount) <= 0) {
      return 'Invalid amount';
    }
    if (!entry.token) {
      return 'Token not selected';
    }
    
    if (lockType === 'timelock') {
      if (!entry.unlockDate) {
        return 'Unlock date required';
      }
      if (new Date(entry.unlockDate).getTime() <= Date.now()) {
        return 'Unlock date must be in the future';
      }
    } else {
      // Vesting validation
      if (!entry.cliffDate || !entry.endDate) {
        return 'Cliff and end dates required';
      }
      if (new Date(entry.cliffDate).getTime() <= Date.now()) {
        return 'Cliff date must be in the future';
      }
      if (new Date(entry.endDate).getTime() <= new Date(entry.cliffDate).getTime()) {
        return 'End date must be after cliff date';
      }
    }
    
    return null;
  };

  const handleProcessAll = async () => {
    // Validate all entries first
    const validationErrors: { [key: string]: string } = {};
    entries.forEach(entry => {
      const error = validateEntry(entry);
      if (error) {
        validationErrors[entry.id] = error;
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setEntries(entries.map(e => ({
        ...e,
        status: validationErrors[e.id] ? 'error' : 'pending',
        error: validationErrors[e.id],
      })));
      return;
    }

    setIsProcessing(true);
    setCompletedCount(0);
    setErrorCount(0);

    for (let i = 0; i < entries.length; i++) {
      setCurrentIndex(i);
      const entry = entries[i];
      
      // Update status to processing
      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, status: 'processing' } : e
      ));

      try {
        if (lockType === 'timelock') {
          const unlockTime = Math.floor(new Date(entry.unlockDate!).getTime() / 1000);
          await onCreateProposal(
            'TimeLock',
            entry.token,
            entry.amount,
            entry.beneficiary,
            unlockTime,
            undefined,
            undefined,
            undefined,
            entry.revocable
          );
        } else {
          const cliffTime = Math.floor(new Date(entry.cliffDate!).getTime() / 1000);
          const endTime = Math.floor(new Date(entry.endDate!).getTime() / 1000);
          const releaseInterval = parseInt(entry.releaseInterval || '2592000');
          
          await onCreateProposal(
            'VestingLock',
            entry.token,
            entry.amount,
            entry.beneficiary,
            undefined,
            cliffTime,
            endTime,
            releaseInterval,
            entry.revocable
          );
        }

        setEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, status: 'success' } : e
        ));
        setCompletedCount(prev => prev + 1);

        // Small delay between transactions
        if (i < entries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        setEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, status: 'error', error: error.message || 'Failed to create proposal' } : e
        ));
        setErrorCount(prev => prev + 1);
      }
    }

    setIsProcessing(false);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      const newEntries: BulkLockEntry[] = dataLines.map(line => {
        const columns = line.split(',').map(col => col.trim());
        
        if (lockType === 'timelock') {
          // Format: beneficiary, amount, token, unlock_date, revocable
          return {
            id: generateId(),
            beneficiary: columns[0] || '',
            amount: columns[1] || '',
            token: columns[2] || availableTokens[0]?.address || '',
            unlockDate: columns[3] || '',
            revocable: columns[4]?.toLowerCase() !== 'false',
            status: 'pending' as const,
          };
        } else {
          // Format: beneficiary, amount, token, cliff_date, end_date, interval, revocable
          return {
            id: generateId(),
            beneficiary: columns[0] || '',
            amount: columns[1] || '',
            token: columns[2] || availableTokens[0]?.address || '',
            cliffDate: columns[3] || '',
            endDate: columns[4] || '',
            releaseInterval: columns[5] || '2592000',
            revocable: columns[6]?.toLowerCase() !== 'false',
            status: 'pending' as const,
          };
        }
      });

      setEntries(newEntries);
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleExportTemplate = () => {
    let csv = '';
    if (lockType === 'timelock') {
      csv = 'beneficiary,amount,token,unlock_date,revocable\n';
      csv += 'GXXXX...,1000,CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC,2026-12-31,true\n';
    } else {
      csv = 'beneficiary,amount,token,cliff_date,end_date,interval_seconds,revocable\n';
      csv += 'GXXXX...,10000,CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC,2026-06-01,2027-06-01,2592000,true\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_${lockType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getContactName = (address: string) => {
    const contact = contacts.find(c => c.address === address);
    return contact?.name;
  };

  const getTokenSymbol = (address: string) => {
    const token = availableTokens.find(t => t.address === address);
    return token?.symbol || 'Unknown';
  };

  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const successCount = entries.filter(e => e.status === 'success').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isProcessing ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0e1a] rounded-2xl border border-blue-900/30 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-blue-900/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                Bulk {lockType === 'timelock' ? 'Time Lock' : 'Vesting'} Creation
              </h2>
              <p className="text-sm text-blue-400/60 mt-1">
                Create multiple {lockType === 'timelock' ? 'time locks' : 'vesting schedules'} in batch
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 hover:bg-blue-900/30 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Import/Export buttons */}
          <div className="flex items-center gap-3 mt-4">
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg cursor-pointer transition-colors text-blue-400 text-sm">
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
                disabled={isProcessing}
              />
            </label>
            <button
              onClick={handleExportTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 hover:bg-blue-900/50 rounded-lg transition-colors text-blue-400 text-sm"
              disabled={isProcessing}
            >
              <Download className="w-4 h-4" />
              <span>Download Template</span>
            </button>
            
            {/* Stats */}
            <div className="ml-auto flex items-center gap-4 text-sm">
              <span className="text-gray-400">
                Total: <span className="text-white font-semibold">{entries.length}</span>
              </span>
              {successCount > 0 && (
                <span className="text-green-400">
                  Success: <span className="font-semibold">{successCount}</span>
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-red-400">
                  Failed: <span className="font-semibold">{errorCount}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className={`p-4 rounded-xl border transition-all ${
                entry.status === 'success'
                  ? 'bg-green-900/20 border-green-500/30'
                  : entry.status === 'error'
                  ? 'bg-red-900/20 border-red-500/30'
                  : entry.status === 'processing'
                  ? 'bg-blue-900/20 border-blue-500/30 animate-pulse'
                  : 'bg-gray-900/50 border-blue-900/30'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Index & Status */}
                <div className="flex flex-col items-center gap-2">
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-900/50 text-blue-400 text-sm font-semibold">
                    {index + 1}
                  </span>
                  {entry.status === 'processing' && (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  )}
                  {entry.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {entry.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>

                {/* Form Fields */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Beneficiary */}
                  <div className="lg:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Beneficiary Address</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={entry.beneficiary}
                        onChange={(e) => updateEntry(entry.id, 'beneficiary', e.target.value)}
                        placeholder="GXXXX..."
                        disabled={entry.status !== 'pending' || isProcessing}
                        className="w-full px-4 py-2 bg-gray-900/50 border border-blue-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50 font-mono text-sm"
                        list={`contacts-${entry.id}`}
                      />
                      <datalist id={`contacts-${entry.id}`}>
                        {contacts.map(c => (
                          <option key={c.address} value={c.address}>{c.name}</option>
                        ))}
                      </datalist>
                      {getContactName(entry.beneficiary) && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-400">
                          {getContactName(entry.beneficiary)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Amount</label>
                    <input
                      type="number"
                      value={entry.amount}
                      onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      disabled={entry.status !== 'pending' || isProcessing}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-blue-900/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                    />
                  </div>

                  {/* Token */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Token</label>
                    <select
                      value={entry.token}
                      onChange={(e) => updateEntry(entry.id, 'token', e.target.value)}
                      disabled={entry.status !== 'pending' || isProcessing}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-blue-900/30 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                    >
                      {availableTokens.map(token => (
                        <option key={token.address} value={token.address}>
                          {token.symbol} ({parseFloat(token.balance).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Fields */}
                  {lockType === 'timelock' ? (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Unlock Date</label>
                      <input
                        type="datetime-local"
                        value={entry.unlockDate}
                        onChange={(e) => updateEntry(entry.id, 'unlockDate', e.target.value)}
                        disabled={entry.status !== 'pending' || isProcessing}
                        className="w-full px-4 py-2 bg-gray-900/50 border border-blue-900/30 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Cliff Date</label>
                        <input
                          type="datetime-local"
                          value={entry.cliffDate}
                          onChange={(e) => updateEntry(entry.id, 'cliffDate', e.target.value)}
                          disabled={entry.status !== 'pending' || isProcessing}
                          className="w-full px-4 py-2 bg-gray-900/50 border border-blue-900/30 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">End Date</label>
                        <input
                          type="datetime-local"
                          value={entry.endDate}
                          onChange={(e) => updateEntry(entry.id, 'endDate', e.target.value)}
                          disabled={entry.status !== 'pending' || isProcessing}
                          className="w-full px-4 py-2 bg-gray-900/50 border border-blue-900/30 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Release Interval</label>
                        <select
                          value={entry.releaseInterval}
                          onChange={(e) => updateEntry(entry.id, 'releaseInterval', e.target.value)}
                          disabled={entry.status !== 'pending' || isProcessing}
                          className="w-full px-4 py-2 bg-gray-900/50 border border-blue-900/30 rounded-lg text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                        >
                          <option value="86400">Daily</option>
                          <option value="604800">Weekly</option>
                          <option value="2592000">Monthly (30 days)</option>
                          <option value="7776000">Quarterly (90 days)</option>
                          <option value="31536000">Yearly</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Revocable */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`revocable-${entry.id}`}
                      checked={entry.revocable}
                      onChange={(e) => updateEntry(entry.id, 'revocable', e.target.checked)}
                      disabled={entry.status !== 'pending' || isProcessing}
                      className="w-4 h-4 rounded border-blue-900/30 bg-gray-900/50 text-cyan-500 focus:ring-cyan-500/50"
                    />
                    <label htmlFor={`revocable-${entry.id}`} className="text-sm text-gray-400">
                      Revocable
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => duplicateEntry(entry)}
                    disabled={entry.status !== 'pending' || isProcessing}
                    className="p-2 hover:bg-blue-900/30 rounded-lg transition-colors text-blue-400 disabled:opacity-50"
                    title="Duplicate"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    disabled={entries.length <= 1 || entry.status !== 'pending' || isProcessing}
                    className="p-2 hover:bg-red-900/30 rounded-lg transition-colors text-red-400 disabled:opacity-50"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {entry.error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>{entry.error}</span>
                </div>
              )}
            </div>
          ))}

          {/* Add Entry Button */}
          <button
            onClick={addEntry}
            disabled={isProcessing}
            className="w-full p-4 border-2 border-dashed border-blue-900/30 rounded-xl text-blue-400 hover:bg-blue-900/20 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            <span>Add {lockType === 'timelock' ? 'Time Lock' : 'Vesting Schedule'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-blue-900/30 bg-gray-900/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  Processing {currentIndex + 1} of {entries.length}...
                </span>
              ) : (
                <span>
                  {pendingCount} {lockType === 'timelock' ? 'lock(s)' : 'schedule(s)'} ready to create
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                {successCount === entries.length ? 'Close' : 'Cancel'}
              </button>
              <button
                onClick={handleProcessAll}
                disabled={isProcessing || pendingCount === 0}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Proposals...</span>
                  </>
                ) : (
                  <>
                    <span>Create {pendingCount} Proposal{pendingCount !== 1 ? 's' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkLockModal;
