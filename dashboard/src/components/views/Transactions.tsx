import React, { useState, useEffect } from 'react';
import { Proposal } from '../../types';
import { formatAmount, truncateAddress } from '../../lib/utils';
import { getAccountPayments, PaymentRecord } from '../../services/transactionHistoryService';
import { getContacts, Contact } from '../../services/contactsService';

interface TransactionsProps {
  vaultAddress: string | null;
  proposals: Proposal[];
  publicKey: string | null;
  isSigner: boolean;
  userRole?: 'Admin' | 'Executor' | 'Viewer';
  onApprove: (proposalId: number) => Promise<void>;
  onExecute: (proposalId: number) => Promise<void>;
  onNewTransaction: () => void;
}

type TabType = 'proposals' | 'history';

export const Transactions: React.FC<TransactionsProps> = ({
  vaultAddress,
  proposals,
  publicKey,
  isSigner,
  userRole,
  onApprove,
  onExecute,
  onNewTransaction,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('proposals');
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'executed'>('all');
  const [contacts, setContacts] = useState<Contact[]>(() => getContacts());

  // Load payment history when switching to history tab
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
      setContacts(getContacts()); // Refresh contacts
    } catch (error) {
      console.error('Failed to load payment history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getContactName = (address: string): string | null => {
    const contact = contacts.find(c => c.address === address);
    return contact?.name || null;
  };

  const formatAddressWithContact = (address: string): React.ReactNode => {
    const name = getContactName(address);
    if (name) {
      return (
        <span>
          <span className="text-white">{name}</span>
          <span className="text-slate-500 ml-1">({truncateAddress(address, 4)})</span>
        </span>
      );
    }
    return <span className="font-mono">{truncateAddress(address, 6)}</span>;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'approved': return 'bg-blue-500/20 text-blue-400';
      case 'executed': return 'bg-green-500/20 text-green-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getAssetSymbol = (assetType: string, assetCode?: string) => {
    if (assetType === 'native') return 'XLM';
    return assetCode || 'Unknown';
  };

  const filteredProposals = proposals.filter(p => {
    if (filter === 'all') return true;
    return p.status.toLowerCase() === filter;
  });

  const canApprove = (proposal: Proposal) => {
    return isSigner && 
           proposal.status.toLowerCase() === 'pending' && 
           publicKey &&
           !proposal.approvals.includes(publicKey);
  };

  const canExecute = (proposal: Proposal) => {
    return isSigner && 
           proposal.status.toLowerCase() === 'approved' &&
           (userRole === 'Admin' || userRole === 'Executor');
  };

  const formatDate = (dateString: string | number) => {
    const date = typeof dateString === 'number' 
      ? new Date(dateString * 1000) 
      : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400">Manage proposals and view transaction history</p>
        </div>
        {isSigner && (userRole === 'Admin' || userRole === 'Executor') && (
          <button
            onClick={onNewTransaction}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Transaction
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('proposals')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'proposals'
              ? 'text-purple-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Proposals
          {proposals.filter(p => p.status.toLowerCase() === 'pending').length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
              {proposals.filter(p => p.status.toLowerCase() === 'pending').length}
            </span>
          )}
          {activeTab === 'proposals' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-medium transition-colors relative ${
            activeTab === 'history'
              ? 'text-purple-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          History
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
          )}
        </button>
      </div>

      {activeTab === 'proposals' ? (
        <>
          {/* Filter */}
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'executed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Proposals List */}
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            {filteredProposals.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-slate-400">No proposals found</p>
                {isSigner && (
                  <button
                    onClick={onNewTransaction}
                    className="mt-4 text-purple-400 hover:text-purple-300"
                  >
                    Create your first proposal
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filteredProposals.map((proposal) => (
                  <div key={proposal.id} className="p-4 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white font-medium">
                            #{proposal.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(proposal.status)}`}>
                            {proposal.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm mb-1">
                          Send <span className="text-white">{formatAmount(proposal.amount, 7)}</span> to{' '}
                          {formatAddressWithContact(proposal.to)}
                        </p>
                        <p className="text-slate-500 text-xs">
                          Proposed by {formatAddressWithContact(proposal.proposer)} • {formatDate(proposal.created_at)}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          Approvals: {proposal.approvals.length}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {canApprove(proposal) && (
                          <button
                            onClick={() => onApprove(proposal.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {canExecute(proposal) && (
                          <button
                            onClick={() => onExecute(proposal.id)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                          >
                            Execute
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Payment History */}
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <span className="text-slate-400">
                {paymentHistory.length} transaction{paymentHistory.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={loadPaymentHistory}
                disabled={loadingHistory}
                className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
              >
                {loadingHistory ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400">Loading transaction history...</p>
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-slate-400">No transaction history found</p>
                <p className="text-slate-500 text-sm mt-1">
                  Transactions will appear here once the vault receives or sends payments
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {paymentHistory.map((payment) => (
                  <div key={payment.id} className="p-4 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payment.isIncoming 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {payment.isIncoming ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {payment.isIncoming ? 'Received' : 'Sent'}{' '}
                            <span className={payment.isIncoming ? 'text-green-400' : 'text-red-400'}>
                              {payment.isIncoming ? '+' : '-'}{payment.amount} {getAssetSymbol(payment.assetType, payment.assetCode)}
                            </span>
                          </p>
                          <p className="text-slate-400 text-sm">
                            {payment.isIncoming ? 'From' : 'To'}: {formatAddressWithContact(payment.isIncoming ? payment.from : payment.to)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-sm">
                          {formatDate(payment.createdAt)}
                        </p>
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${payment.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 text-xs"
                        >
                          View on Explorer →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
