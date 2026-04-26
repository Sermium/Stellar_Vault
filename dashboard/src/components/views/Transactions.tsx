import React, { useState, useEffect } from 'react';
import { Proposal } from '../../types';
import { formatAmount, truncateAddress } from '../../lib/utils';
import { getAccountPayments, PaymentRecord } from '../../services/transactionHistoryService';
import { getContacts, Contact } from '../../services/contactsService';
import { SUPPORTED_TOKENS, NATIVE_TOKEN } from '../../config';
import { Plus, Trash2, Upload, Download, AlertCircle, CheckCircle, Loader2, X, Copy, AlertTriangle } from 'lucide-react';

interface TransactionsProps {
  vaultAddress: string | null;
  proposals: Proposal[];
  publicKey: string | null;
  isSigner: boolean;
  userRole?: 'SuperAdmin' | 'Admin' | 'Executor';
  threshold?: number;
  onApprove: (proposalId: number) => Promise<void>;
  onExecute: (proposalId: number) => Promise<void>;
  onRequestCancel: (proposalId: number) => Promise<void>;
  onApproveCancel: (proposalId: number) => Promise<void>;
  onExecuteCancel: (proposalId: number) => Promise<void>;
  onNewTransaction: () => void;
  onRefreshProposals?: () => Promise<void>;
  onCreateTransfer?: (recipient: string, token: string, amount: string) => Promise<void>;
  vaultBalance?: Array<{ symbol: string; balance: bigint; decimals: number; address?: string }>;
}

interface BulkTransferEntry {
  id: string;
  recipient: string;
  amount: string;
  token: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

// Constants for batch limits
const MAX_BATCH_SIZE = 10; // Maximum entries per batch to avoid network overload
const BATCH_DELAY_MS = 3000; // Delay between transactions (3 seconds)

// Status enum: 0=Pending, 1=Approved, 2=Executed
const getStatusLabel = (status: number): string => {
  switch (Number(status)) {
    case 0: return 'Pending';
    case 1: return 'Approved';
    case 2: return 'Executed';
    case 3: return 'Rejected';
    default: return 'Unknown';
  }
};

const getProposalTypeLabel = (type: number): string => {
  switch (Number(type)) {
    case 0: return 'Transfer';
    case 1: return 'Time Lock';
    case 2: return 'Vesting';
    default: return 'Unknown';
  }
};

const getProposalTypeColor = (type: number): string => {
  switch (Number(type)) {
    case 0: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 1: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 2: return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getStatusFilter = (status: number): string => {
  switch (Number(status)) {
    case 0: return 'pending';
    case 1: return 'approved';
    case 2: return 'executed';
    case 3: return 'rejected';
    default: return 'unknown';
  }
};

// CSV Example Templates
const CSV_TRANSFER_EXAMPLE = `# Bulk Transfer Template - Orion Safe
# Maximum ${MAX_BATCH_SIZE} transfers per batch to avoid network overload
# 
# Format: recipient,amount,token_address
# 
# Example entries:
recipient,amount,token
GBXGQJWVLWOYHFLVTKWV5FGHA3LNYY2JQKM7OAJAUEQFU6LPCSEFVXON,1000,CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
GCFONE23AB7Y6C5YZOMKPQHBLRPNXACTTBLCBHWBXM5CUUTP7M4JOZQQ,500,CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOUJ3DCMOPJCXP6V,2500,native`;

export const Transactions: React.FC<TransactionsProps> = ({
  vaultAddress,
  proposals,
  publicKey,
  isSigner,
  userRole,
  threshold = 1,
  onApprove,
  onExecute,
  onRequestCancel,
  onApproveCancel,
  onExecuteCancel,
  onNewTransaction,
  onRefreshProposals,
  onCreateTransfer,
  vaultBalance = []
}) => {
  const [activeTab, setActiveTab] = useState<'proposals' | 'history'>('proposals');
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [contacts, setContacts] = useState<Contact[]>(() => getContacts());
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [refreshingProposals, setRefreshingProposals] = useState(false);

  // Bulk transfer state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkEntries, setBulkEntries] = useState<BulkTransferEntry[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState(0);
  const [showCsvHelp, setShowCsvHelp] = useState(false);

  useEffect(() => {
    if (activeTab === 'history' && vaultAddress) {
      loadPaymentHistory();
    }
  }, [activeTab, vaultAddress]);

  // Initialize bulk entries when modal opens
  useEffect(() => {
    if (showBulkModal && bulkEntries.length === 0) {
      addBulkEntry();
    }
  }, [showBulkModal]);

  const loadPaymentHistory = async () => {
    if (!vaultAddress) return;
    setLoadingHistory(true);
    try {
      const payments = await getAccountPayments(vaultAddress, 100);
      setPaymentHistory(payments);
      setContacts(getContacts());
    } catch (error) {
      console.error('Failed to load payment history:', error);
    }
    setLoadingHistory(false);
  };

  const handleRefreshProposals = async () => {
    if (onRefreshProposals) {
      setRefreshingProposals(true);
      try {
        await onRefreshProposals();
      } finally {
        setRefreshingProposals(false);
      }
    }
  };

  const getContactName = (address: string): string | null => {
    const contact = contacts.find(c => c.address === address);
    return contact ? contact.name : null;
  };

  const formatAddressWithContact = (address: string): React.ReactNode => {
    const contactName = getContactName(address);
    if (contactName) {
      return (
        <span>
          <span className="text-cyan-400">{contactName}</span>
          <span className="text-gray-500 ml-1">({truncateAddress(address)})</span>
        </span>
      );
    }
    return truncateAddress(address);
  };

  const getStatusColor = (status: number): string => {
    switch (Number(status)) {
      case 0: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 1: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 2: return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 3: return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getAssetSymbol = (assetType: string, assetCode?: string): string => {
    if (assetType === 'native') return 'XLM';
    return assetCode || 'Unknown';
  };

  const getTokenSymbol = (tokenAddress: string): string => {
    if (tokenAddress === NATIVE_TOKEN || tokenAddress === 'native') return 'XLM';
    const token = SUPPORTED_TOKENS.find(t => t.address === tokenAddress);
    if (token) return token.symbol;
    const vaultToken = vaultBalance.find(t => t.address === tokenAddress);
    return vaultToken ? vaultToken.symbol : truncateAddress(tokenAddress);
  };

  // ==================== BULK TRANSFER FUNCTIONS ====================
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addBulkEntry = () => {
    if (bulkEntries.filter(e => e.status === 'pending').length >= MAX_BATCH_SIZE) {
      alert(`Maximum ${MAX_BATCH_SIZE} transfers per batch to avoid network overload.`);
      return;
    }
    const newEntry: BulkTransferEntry = {
      id: generateId(),
      recipient: '',
      amount: '',
      token: vaultBalance[0]?.address || NATIVE_TOKEN,
      status: 'pending',
    };
    setBulkEntries(prev => [...prev, newEntry]);
  };

  const removeBulkEntry = (id: string) => {
    if (bulkEntries.length > 1) {
      setBulkEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const updateBulkEntry = (id: string, field: keyof BulkTransferEntry, value: any) => {
    setBulkEntries(prev => prev.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const duplicateBulkEntry = (entry: BulkTransferEntry) => {
    if (bulkEntries.filter(e => e.status === 'pending').length >= MAX_BATCH_SIZE) {
      alert(`Maximum ${MAX_BATCH_SIZE} transfers per batch.`);
      return;
    }
    const newEntry: BulkTransferEntry = {
      ...entry,
      id: generateId(),
      recipient: '',
      status: 'pending',
      error: undefined,
    };
    setBulkEntries(prev => [...prev, newEntry]);
  };

  const validateBulkEntry = (entry: BulkTransferEntry): string | null => {
    if (!entry.recipient || entry.recipient.length !== 56 || !entry.recipient.startsWith('G')) {
      return 'Invalid recipient address';
    }
    if (!entry.amount || parseFloat(entry.amount) <= 0) {
      return 'Invalid amount';
    }
    if (!entry.token) {
      return 'Token not selected';
    }
    return null;
  };

  const handleBulkProcessAll = async () => {
    if (!onCreateTransfer) {
      alert('Transfer function not available');
      return;
    }

    // Validate all entries first
    const validationErrors: { [key: string]: string } = {};
    bulkEntries.forEach(entry => {
      const error = validateBulkEntry(entry);
      if (error) {
        validationErrors[entry.id] = error;
      }
    });

    if (Object.keys(validationErrors).length > 0) {
      setBulkEntries(prev => prev.map(e => ({
        ...e,
        status: validationErrors[e.id] ? 'error' : 'pending',
        error: validationErrors[e.id],
      })));
      return;
    }

    setBulkProcessing(true);

    for (let i = 0; i < bulkEntries.length; i++) {
      setBulkCurrentIndex(i);
      const entry = bulkEntries[i];
      
      if (entry.status !== 'pending') continue;

      // Update status to processing
      setBulkEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, status: 'processing' } : e
      ));

      try {
        await onCreateTransfer(entry.recipient, entry.token, entry.amount);

        setBulkEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, status: 'success' } : e
        ));

        // Delay between transactions to avoid network overload
        if (i < bulkEntries.length - 1) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
      } catch (error: any) {
        setBulkEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, status: 'error', error: error.message || 'Failed to create proposal' } : e
        ));
      }
    }

    setBulkProcessing(false);
    if (onRefreshProposals) await onRefreshProposals();
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments
      
      // Skip header row if it looks like a header
      const dataLines = lines[0]?.toLowerCase().includes('recipient') ? lines.slice(1) : lines;
      
      if (dataLines.length > MAX_BATCH_SIZE) {
        alert(`CSV contains ${dataLines.length} entries. Maximum ${MAX_BATCH_SIZE} per batch. Only the first ${MAX_BATCH_SIZE} will be imported.`);
      }

      const newEntries: BulkTransferEntry[] = dataLines.slice(0, MAX_BATCH_SIZE).map(line => {
        const columns = line.split(',').map(col => col.trim());
        return {
          id: generateId(),
          recipient: columns[0] || '',
          amount: columns[1] || '',
          token: columns[2] === 'native' ? NATIVE_TOKEN : (columns[2] || vaultBalance[0]?.address || ''),
          status: 'pending' as const,
        };
      });

      setBulkEntries(newEntries);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportTemplate = () => {
    const blob = new Blob([CSV_TRANSFER_EXAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_transfer_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetBulkModal = () => {
    setBulkEntries([]);
    setBulkProcessing(false);
    setBulkCurrentIndex(0);
  };

  const bulkPendingCount = bulkEntries.filter(e => e.status === 'pending').length;
  const bulkSuccessCount = bulkEntries.filter(e => e.status === 'success').length;
  const bulkErrorCount = bulkEntries.filter(e => e.status === 'error').length;
  const bulkTotalAmount = bulkEntries
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // ==================== END BULK TRANSFER FUNCTIONS ====================

  // Only show pending (0) and approved (1) in proposals tab
  const activeProposals = proposals.filter(p => Number(p.status) === 0 || Number(p.status) === 1);
  
  const filteredProposals = activeProposals.filter(p => {
    if (filter === 'all') return true;
    return getStatusFilter(Number(p.status)) === filter;
  });

  // Executed (2) and Rejected (3) go to history
  const completedProposals = proposals.filter(p => Number(p.status) === 2 || Number(p.status) === 3);

  const canApprove = (proposal: Proposal): boolean => {
    if (!isSigner || !publicKey) return false;
    if (Number(proposal.status) !== 0) return false;
    const approvals = proposal.approvals || [];
    return !approvals.includes(publicKey);
  };

  const canExecute = (proposal: Proposal): boolean => {
    if (!isSigner || !publicKey) return false;
    if (Number(proposal.status) === 2) return false;
    if (userRole !== 'SuperAdmin' && userRole !== 'Admin' && userRole !== 'Executor') return false;
    const approvalCount = (proposal.approvals || []).length;
    return approvalCount >= threshold;
  };

  const handleApprove = async (proposalId: number) => {
    setProcessingId(proposalId);
    try {
      await onApprove(proposalId);
      if (onRefreshProposals) await onRefreshProposals();
    } finally {
      setProcessingId(null);
    }
  };

  const handleExecute = async (proposalId: number) => {
    setProcessingId(proposalId);
    try {
      await onExecute(proposalId);
      if (onRefreshProposals) await onRefreshProposals();
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestCancel = async (proposalId: number) => {
    setProcessingId(proposalId);
    try {
      await onRequestCancel(proposalId);
      if (onRefreshProposals) await onRefreshProposals();
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveCancel = async (proposalId: number) => {
    setProcessingId(proposalId);
    try {
      await onApproveCancel(proposalId);
      if (onRefreshProposals) await onRefreshProposals();
    } finally {
      setProcessingId(null);
    }
  };

  const handleExecuteCancel = async (proposalId: number) => {
    setProcessingId(proposalId);
    try {
      await onExecuteCancel(proposalId);
      if (onRefreshProposals) await onRefreshProposals();
    } finally {
      setProcessingId(null);
    }
  };

  const canRequestCancel = (proposal: Proposal): boolean => {
    if (!isSigner || !publicKey) return false;
    if (Number(proposal.status) !== 0) return false;
    if (userRole !== 'SuperAdmin' && userRole !== 'Admin' && userRole !== 'Executor') return false;
    const cancelApprovals = proposal.cancel_approvals || [];
    return !cancelApprovals.includes(publicKey);
  };

  const canExecuteCancel = (proposal: Proposal): boolean => {
    if (!isSigner || !publicKey) return false;
    if (Number(proposal.status) !== 0) return false;
    if (userRole !== 'SuperAdmin' && userRole !== 'Admin' && userRole !== 'Executor') return false;
    const cancelApprovals = proposal.cancel_approvals || [];
    return cancelApprovals.length >= threshold;
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Transactions</h2>
          <p className="text-gray-400">Manage proposals and view history</p>
        </div>
        <div className="flex gap-3">
          {onRefreshProposals && (
            <button
              onClick={handleRefreshProposals}
              disabled={refreshingProposals}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${refreshingProposals ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          )}
          {isSigner && (userRole === 'Admin' || userRole === 'Executor' || userRole === 'SuperAdmin') && onCreateTransfer && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Bulk Transfer
            </button>
          )}
          {isSigner && (userRole === 'Admin' || userRole === 'Executor' || userRole === 'SuperAdmin') && (
            <button
              onClick={onNewTransaction}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-400 hover:to-blue-500 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Transaction
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('proposals')}
            className={`pb-3 px-1 font-medium transition ${
              activeTab === 'proposals'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Proposals ({activeProposals.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 font-medium transition ${
              activeTab === 'history'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            History ({completedProposals.length})
          </button>
        </div>
      </div>

      {/* Proposals Tab */}
      {activeTab === 'proposals' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'pending', 'approved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filter === f
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Proposals List */}
          {filteredProposals.length === 0 ? (
            <div className="bg-gray-800/50 rounded-xl p-8 text-center border border-gray-700">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 mb-4">No {filter !== 'all' ? filter : ''} proposals found</p>
              {isSigner && (userRole === 'Admin' || userRole === 'Executor' || userRole === 'SuperAdmin') && filter === 'all' && (
                <button
                  onClick={onNewTransaction}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-400 hover:to-blue-500 transition"
                >
                  Create First Proposal
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProposals.map((proposal) => {
                const approvalCount = (proposal.approvals || []).length;
                const thresholdMet = approvalCount >= threshold;
                
                return (
                  <div
                    key={proposal.id}
                    className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-gray-500 font-mono">#{proposal.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getProposalTypeColor(proposal.proposal_type)}`}>
                            {getProposalTypeLabel(proposal.proposal_type)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(Number(proposal.status))}`}>
                            {getStatusLabel(Number(proposal.status))}
                          </span>
                          {Number(proposal.status) === 0 && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              thresholdMet 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {approvalCount}/{threshold} approvals
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xl font-bold text-white mb-2">
                          {formatAmount(BigInt(proposal.amount), 7)} {getTokenSymbol(proposal.token)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">{proposal.proposal_type === 0 ? 'To:' : 'Beneficiary:'}</span>{' '}
                            <span className="text-white">{formatAddressWithContact(proposal.recipient)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">By:</span>{' '}
                            <span className="text-gray-300">{formatAddressWithContact(proposal.proposer)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Created:</span>{' '}
                            <span className="text-gray-300">{formatDate(proposal.created_at)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Approvals:</span>{' '}
                            <span className={thresholdMet ? 'text-green-400' : 'text-cyan-400'}>
                              {approvalCount} / {threshold}
                            </span>
                          </div>
                          {proposal.proposal_type === 1 && proposal.lock_end_time > 0 && (
                            <div>
                              <span className="text-gray-500">Unlock Date:</span>{' '}
                              <span className="text-gray-300">{formatDate(proposal.lock_end_time)}</span>
                            </div>
                          )}
                          {proposal.proposal_type === 2 && (
                            <>
                              {proposal.lock_cliff_time > 0 && (
                                <div>
                                  <span className="text-gray-500">Cliff Date:</span>{' '}
                                  <span className="text-gray-300">{formatDate(proposal.lock_cliff_time)}</span>
                                </div>
                              )}
                              {proposal.lock_end_time > 0 && (
                                <div>
                                  <span className="text-gray-500">End Date:</span>{' '}
                                  <span className="text-gray-300">{formatDate(proposal.lock_end_time)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 ml-4">
                        <div className="flex gap-2">
                          {canApprove(proposal) && (
                            <button
                              onClick={() => handleApprove(proposal.id)}
                              disabled={processingId === proposal.id}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                            >
                              {processingId === proposal.id ? 'Processing...' : 'Approve'}
                            </button>
                          )}
                          {canExecute(proposal) && (
                            <button
                              onClick={() => handleExecute(proposal.id)}
                              disabled={processingId === proposal.id}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                            >
                              {processingId === proposal.id ? 'Processing...' : 'Execute'}
                            </button>
                          )}
                        </div>
                        {Number(proposal.status) === 0 && (
                          <div className="flex gap-2 items-center">
                            {canRequestCancel(proposal) && (
                              <button
                                onClick={() => handleRequestCancel(proposal.id)}
                                disabled={processingId === proposal.id}
                                className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition disabled:opacity-50 text-sm"
                              >
                                {processingId === proposal.id ? 'Processing...' : 'Reject'}
                              </button>
                            )}
                            {(proposal.cancel_approvals?.length || 0) > 0 && (
                              <span className="text-xs text-red-400">
                                {proposal.cancel_approvals?.length || 0}/{threshold} rejections
                              </span>
                            )}
                            {canExecuteCancel(proposal) && (
                              <button
                                onClick={() => handleExecuteCancel(proposal.id)}
                                disabled={processingId === proposal.id}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm"
                              >
                                {processingId === proposal.id ? 'Processing...' : 'Confirm Reject'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {completedProposals.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Completed Proposals</h3>
              <div className="space-y-3">
                {completedProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          Number(proposal.status) === 2 ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          <svg className={`w-5 h-5 ${Number(proposal.status) === 2 ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {Number(proposal.status) === 2 ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            #{proposal.id} - {formatAmount(BigInt(proposal.amount), 7)} {getTokenSymbol(proposal.token)}
                          </div>
                          <div className="text-sm text-gray-400">
                            To: {formatAddressWithContact(proposal.recipient)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          Number(proposal.status) === 2 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {Number(proposal.status) === 2 ? 'Executed' : 'Rejected'}
                        </span>
                        <div className="text-gray-500 text-sm mt-1">{formatDate(proposal.created_at)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-gray-400">{paymentHistory.length} on-chain payments</span>
            <button
              onClick={loadPaymentHistory}
              disabled={loadingHistory}
              className="px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="bg-gray-800/50 rounded-xl p-8 text-center border border-gray-700">
              <p className="text-gray-400">No transaction history found</p>
              <p className="text-gray-500 text-sm mt-2">
                Note: Soroban contract transactions appear via executed proposals
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentHistory.map((payment, index) => {
                const isReceived = payment.to === vaultAddress;
                return (
                  <div
                    key={payment.transactionHash + '-' + index}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isReceived ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          <svg className={`w-5 h-5 ${isReceived ? 'text-green-400' : 'text-red-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isReceived ? "M19 14l-7 7m0 0l-7-7m7 7V3" : "M5 10l7-7m0 0l7 7m-7-7v18"} />
                          </svg>
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {isReceived ? 'Received' : 'Sent'} {payment.amount} {getAssetSymbol(payment.assetType, payment.assetCode)}
                          </div>
                          <div className="text-sm text-gray-400">
                            {isReceived ? 'From: ' : 'To: '}
                            {formatAddressWithContact(isReceived ? payment.from : payment.to)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-400 text-sm">{new Date(payment.createdAt).toLocaleDateString()}</div>
                        <a
                          href={'https://stellar.expert/explorer/testnet/tx/' + payment.transactionHash}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 text-sm hover:underline"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bulk Transfer Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={!bulkProcessing ? () => { setShowBulkModal(false); resetBulkModal(); } : undefined}
          />
          
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-2xl border border-blue-900/30 shadow-2xl overflow-hidden flex flex-col mx-4">
            {/* Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    💸 Bulk Transfer
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Create multiple transfer proposals in batch (max {MAX_BATCH_SIZE} per batch)
                  </p>
                </div>
                <button
                  onClick={() => { setShowBulkModal(false); resetBulkModal(); }}
                  disabled={bulkProcessing}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Import/Export buttons */}
              <div className="flex items-center gap-3 mt-4 flex-wrap">
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg cursor-pointer transition-colors text-blue-400 text-sm border border-blue-500/30">
                  <Upload className="w-4 h-4" />
                  <span>Import CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                    disabled={bulkProcessing}
                  />
                </label>
                <button
                  onClick={handleExportTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 text-sm border border-gray-700"
                  disabled={bulkProcessing}
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template</span>
                </button>
                <button
                  onClick={() => setShowCsvHelp(!showCsvHelp)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>CSV Format Help</span>
                </button>
                
                {/* Stats */}
                <div className="ml-auto flex items-center gap-4 text-sm">
                  <span className="text-gray-400">
                    Total: <span className="text-white font-semibold">{bulkEntries.length}/{MAX_BATCH_SIZE}</span>
                  </span>
                  {bulkSuccessCount > 0 && (
                    <span className="text-green-400">
                      Success: <span className="font-semibold">{bulkSuccessCount}</span>
                    </span>
                  )}
                  {bulkErrorCount > 0 && (
                    <span className="text-red-400">
                      Failed: <span className="font-semibold">{bulkErrorCount}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* CSV Help */}
              {showCsvHelp && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-semibold text-white mb-2">CSV Format</h4>
                  <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
{`# Lines starting with # are comments
# Format: recipient,amount,token

recipient,amount,token
GBXGQJWV...,1000,CDLZFC3S...
GCFONE23...,500,native`}
                  </pre>
                  <p className="text-xs text-gray-500 mt-2">
                    Use "native" for XLM or the full token contract address.
                  </p>
                </div>
              )}

              {/* Batch Limit Warning */}
              {bulkEntries.filter(e => e.status === 'pending').length >= MAX_BATCH_SIZE && (
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-yellow-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Maximum {MAX_BATCH_SIZE} transfers per batch to avoid network overload. Create another batch for more.</span>
                </div>
              )}
            </div>

            {/* Entries List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {bulkEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl border transition-all ${
                    entry.status === 'success'
                      ? 'bg-green-900/20 border-green-500/30'
                      : entry.status === 'error'
                      ? 'bg-red-900/20 border-red-500/30'
                      : entry.status === 'processing'
                      ? 'bg-blue-900/20 border-blue-500/30 animate-pulse'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Index & Status */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 text-gray-300 text-sm font-semibold">
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
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Recipient */}
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Recipient Address</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={entry.recipient}
                            onChange={(e) => updateBulkEntry(entry.id, 'recipient', e.target.value)}
                            placeholder="GXXXX..."
                            disabled={entry.status !== 'pending' || bulkProcessing}
                            className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 font-mono text-sm"
                            list={`contacts-${entry.id}`}
                          />
                          <datalist id={`contacts-${entry.id}`}>
                            {contacts.map(c => (
                              <option key={c.address} value={c.address}>{c.name}</option>
                            ))}
                          </datalist>
                          {getContactName(entry.recipient) && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-400">
                              {getContactName(entry.recipient)}
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
                          onChange={(e) => updateBulkEntry(entry.id, 'amount', e.target.value)}
                          placeholder="0.00"
                          step="any"
                          min="0"
                          disabled={entry.status !== 'pending' || bulkProcessing}
                          className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        />
                      </div>

                      {/* Token */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Token</label>
                        <select
                          value={entry.token}
                          onChange={(e) => updateBulkEntry(entry.id, 'token', e.target.value)}
                          disabled={entry.status !== 'pending' || bulkProcessing}
                          className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                        >
                          <option value={NATIVE_TOKEN}>XLM</option>
                          {vaultBalance.filter(t => t.address !== NATIVE_TOKEN).map(token => (
                            <option key={token.address} value={token.address}>
                              {token.symbol}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => duplicateBulkEntry(entry)}
                        disabled={entry.status !== 'pending' || bulkProcessing || bulkEntries.filter(e => e.status === 'pending').length >= MAX_BATCH_SIZE}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-blue-400 disabled:opacity-50"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeBulkEntry(entry.id)}
                        disabled={bulkEntries.length <= 1 || entry.status !== 'pending' || bulkProcessing}
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
                onClick={addBulkEntry}
                disabled={bulkProcessing || bulkEntries.filter(e => e.status === 'pending').length >= MAX_BATCH_SIZE}
                className="w-full p-4 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:bg-gray-800/50 hover:border-blue-500/50 hover:text-blue-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                <span>Add Transfer</span>
              </button>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {bulkProcessing ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      Processing {bulkCurrentIndex + 1} of {bulkEntries.length}... ({BATCH_DELAY_MS/1000}s delay between txs)
                    </span>
                  ) : (
                    <span>
                      {bulkPendingCount} transfer{bulkPendingCount !== 1 ? 's' : ''} ready
                      {bulkPendingCount > 0 && (
                        <span className="text-cyan-400 ml-2">
                          • Total: ~{bulkTotalAmount.toLocaleString()} tokens
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setShowBulkModal(false); resetBulkModal(); }}
                    disabled={bulkProcessing}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {bulkSuccessCount === bulkEntries.length && bulkEntries.length > 0 ? 'Close' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleBulkProcessAll}
                    disabled={bulkProcessing || bulkPendingCount === 0}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {bulkProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creating Proposals...</span>
                      </>
                    ) : (
                      <span>Create {bulkPendingCount} Proposal{bulkPendingCount !== 1 ? 's' : ''}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
