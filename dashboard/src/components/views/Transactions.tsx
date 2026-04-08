import React, { useState, useEffect } from 'react';
import { Proposal } from '../../types';
import { formatAmount, truncateAddress } from '../../lib/utils';
import { getAccountPayments, PaymentRecord } from '../../services/transactionHistoryService';
import { getContacts, Contact } from '../../services/contactsService';
import { SUPPORTED_TOKENS, NATIVE_TOKEN } from '../../config';

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
}

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
  onRefreshProposals
}) => {
  const [activeTab, setActiveTab] = useState<'proposals' | 'history'>('proposals');
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [contacts, setContacts] = useState<Contact[]>(() => getContacts());
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [refreshingProposals, setRefreshingProposals] = useState(false);

  useEffect(() => {
    if (activeTab === 'history' && vaultAddress) {
      loadPaymentHistory();
    }
  }, [activeTab, vaultAddress]);

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
    if (tokenAddress === NATIVE_TOKEN) return 'XLM';
    const token = SUPPORTED_TOKENS.find(t => t.address === tokenAddress);
    return token ? token.symbol : truncateAddress(tokenAddress);
  };

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
    if (Number(proposal.status) !== 0) return false; // Only pending
    const approvals = proposal.approvals || [];
    return !approvals.includes(publicKey);
  };

  const canExecute = (proposal: Proposal): boolean => {
    if (!isSigner || !publicKey) return false;
    // Cannot execute if already executed
    if (Number(proposal.status) === 2) return false;
    // Must be SuperAdmin, Admin or Executor
    if (userRole !== 'SuperAdmin' && userRole !== 'Admin' && userRole !== 'Executor') return false;
    // Check if threshold is met
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

  // Check if user can request cancel (hasn't already requested)
  const canRequestCancel = (proposal: Proposal): boolean => {
    if (!isSigner || !publicKey) return false;
    if (Number(proposal.status) !== 0) return false; // Only pending
    if (userRole !== 'SuperAdmin' && userRole !== 'Admin' && userRole !== 'Executor') return false;
    const cancelApprovals = proposal.cancel_approvals || [];
    return !cancelApprovals.includes(publicKey);
  };

  // Check if cancel threshold is met
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
          {isSigner && (userRole === 'Admin' || userRole === 'Executor') && (
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
              {isSigner && (userRole === 'Admin' || userRole === 'Executor') && filter === 'all' && (
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
                        {/* Reject/Cancel Buttons */}
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
          {/* Completed Proposals Section */}
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

          {/* Payment History Section */}
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
    </div>
  );
};

export default Transactions;
