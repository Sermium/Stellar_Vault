import React, { useState, useEffect } from 'react';
import { SUPPORTED_TOKENS } from '../../config';
import { getCustomTokens } from '../../services/tokensService';
import { getContacts, Contact } from '../../services/contactsService';
import { getTokenLockedAmount } from '../../lib/stellar';
import { TokenBalance, Proposal } from '../../types';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (token: string, recipient: string, amount: bigint) => Promise<void>;
  preselectedToken?: string | null;
  vaultAddress?: string;
  vaultBalance?: TokenBalance[];
  proposals?: Proposal[];
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedToken,
  vaultAddress,
  vaultBalance = [],
  proposals = [],
}) => {
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]?.address || '');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  
  // Available balance state
  const [lockedAmount, setLockedAmount] = useState<bigint>(BigInt(0));
  const [loadingLocked, setLoadingLocked] = useState(false);

  // Load contacts on mount
  useEffect(() => {
    setContacts(getContacts());
  }, [isOpen]);

  // Set preselected token
  useEffect(() => {
    if (preselectedToken) {
      setSelectedToken(preselectedToken);
    }
  }, [preselectedToken]);

  // Debug logging
  useEffect(() => {
    console.log('=== Send Modal Debug ===');
    console.log('vaultBalance prop:', vaultBalance);
    console.log('vaultBalance length:', vaultBalance?.length);
    console.log('selectedToken:', selectedToken);
    if (vaultBalance && vaultBalance.length > 0) {
      vaultBalance.forEach((b, i) => {
        console.log('Balance [' + i + ']: address=' + b.address + ', balance=' + String(b.balance) + ', symbol=' + b.symbol);
      });
    }
  }, [vaultBalance, selectedToken]);

  // Fetch locked amount when token changes
  useEffect(() => {
    const fetchLockedAmount = async () => {
      if (!vaultAddress || !selectedToken) {
        setLockedAmount(BigInt(0));
        return;
      }
      
      setLoadingLocked(true);
      try {
        const locked = await getTokenLockedAmount(vaultAddress, selectedToken);
        setLockedAmount(locked);
      } catch (err) {
        console.error('Failed to fetch locked amount:', err);
        setLockedAmount(BigInt(0));
      } finally {
        setLoadingLocked(false);
      }
    };
    
    fetchLockedAmount();
  }, [vaultAddress, selectedToken]);

  // Combine supported and custom tokens
  const allTokens = [
    ...SUPPORTED_TOKENS,
    ...getCustomTokens().map(t => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      icon: t.icon,
    }))
  ];

  const selectedTokenInfo = allTokens.find(t => t.address === selectedToken);
  const decimals = selectedTokenInfo?.decimals || 7;

  // Get token balance from vault
  const tokenBalanceInfo = vaultBalance.find(b => b.address === selectedToken);
  const totalBalance = tokenBalanceInfo?.balance || BigInt(0);
  
  // Calculate pending proposals amount for selected token (status 0 = pending, 1 = approved but not executed)
  const pendingAmount = proposals
    .filter(p => p.token === selectedToken && (Number(p.status) === 0 || Number(p.status) === 1))
    .reduce((sum, p) => sum + BigInt(p.amount || 0), BigInt(0));
  
  // Calculate available balance (total - locked - pending)
  const totalReserved = lockedAmount + pendingAmount;
  const availableBalance = totalBalance > totalReserved ? totalBalance - totalReserved : BigInt(0);
  
  // Format balance for display
  const formatBalance = (balance: bigint): string => {
    const divisor = BigInt(10 ** decimals);
    const intPart = balance / divisor;
    const fracPart = balance % divisor;
    const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
    return fracStr ? intPart.toLocaleString() + '.' + fracStr : intPart.toLocaleString();
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.address.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const resetForm = () => {
    setSelectedToken(preselectedToken || SUPPORTED_TOKENS[0]?.address || '');
    setRecipient('');
    setAmount('');
    setError('');
    setContactSearch('');
    setShowContactDropdown(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectContact = (contact: Contact) => {
    setRecipient(contact.address);
    setContactSearch(contact.name);
    setShowContactDropdown(false);
  };

  const handleRecipientChange = (value: string) => {
    setRecipient(value);
    setContactSearch(value);
    if (value.length > 0 && !value.startsWith('G')) {
      setShowContactDropdown(true);
    } else {
      setShowContactDropdown(false);
    }
  };

  const handleSetMax = () => {
    const maxAmount = Number(availableBalance) / Math.pow(10, decimals);
    setAmount(maxAmount.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate recipient
    if (!recipient.trim()) {
      setError('Recipient address is required');
      return;
    }

    if (!recipient.startsWith('G') || recipient.length !== 56) {
      setError('Invalid recipient address (must start with G and be 56 characters)');
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Convert to stroops/smallest unit
    const amountInStroops = BigInt(Math.floor(amountNum * Math.pow(10, decimals)));

    // Check against available balance
    if (amountInStroops > availableBalance) {
      setError('Amount exceeds available balance. Maximum: ' + formatBalance(availableBalance) + ' ' + (selectedTokenInfo?.symbol || ''));
      return;
    }

    setLoading(true);
    try {
      await onSubmit(selectedToken, recipient.trim(), amountInStroops);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const getRecipientDisplay = () => {
    const contact = contacts.find(c => c.address === recipient);
    return contact ? contact.name : '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1318] border border-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">New Transaction</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Token</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              {allTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Balance Display */}
          <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Balance:</span>
              <span className="text-white font-medium">
                {formatBalance(totalBalance)} {selectedTokenInfo?.symbol || ''}
              </span>
            </div>
            {lockedAmount > BigInt(0) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Locked/Vesting:</span>
                <span className="text-orange-400 font-medium">
                  -{formatBalance(lockedAmount)} {selectedTokenInfo?.symbol || ''}
                </span>
              </div>
            )}
            {pendingAmount > BigInt(0) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Pending Transactions:</span>
                <span className="text-yellow-400 font-medium">
                  -{formatBalance(pendingAmount)} {selectedTokenInfo?.symbol || ''}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-gray-700/50">
              <span className="text-gray-400">Available to Send:</span>
              <span className={availableBalance > BigInt(0) ? 'text-cyan-400 font-semibold' : 'text-red-400 font-semibold'}>
                {loadingLocked ? 'Loading...' : formatBalance(availableBalance) + ' ' + (selectedTokenInfo?.symbol || '')}
              </span>
            </div>
          </div>

          {/* Recipient with Contacts */}
          <div className="relative">
            <label className="block text-sm text-gray-400 mb-2">Recipient</label>
            
            {contacts.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                <span className="text-xs text-gray-500">Quick select:</span>
                {contacts.slice(0, 5).map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className={recipient === contact.address
                      ? 'px-2 py-1 text-xs rounded-full bg-cyan-600 text-white transition-colors'
                      : 'px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors'
                    }
                  >
                    {contact.name}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                value={recipient.startsWith('G') ? recipient : contactSearch}
                onChange={(e) => handleRecipientChange(e.target.value)}
                onFocus={() => {
                  if (contacts.length > 0 && !recipient.startsWith('G')) {
                    setShowContactDropdown(true);
                  }
                }}
                placeholder="Search contacts or enter G... address"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
              
              {recipient.startsWith('G') && getRecipientDisplay() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="px-2 py-1 bg-cyan-600/30 text-cyan-300 text-xs rounded-full">
                    {getRecipientDisplay()}
                  </span>
                </div>
              )}

              {showContactDropdown && filteredContacts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-sm">
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

            {recipient.startsWith('G') && (
              <p className="text-xs text-gray-500 mt-1 font-mono truncate">{recipient}</p>
            )}
          </div>

          {/* Amount with Max Button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">
                Amount ({selectedTokenInfo?.symbol || 'Token'})
              </label>
              <button
                type="button"
                onClick={handleSetMax}
                disabled={availableBalance <= BigInt(0) || loadingLocked}
                className="text-xs text-cyan-400 hover:text-cyan-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                MAX
              </button>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              min="0"
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !recipient || !amount || availableBalance <= BigInt(0)}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
            >
              {loading ? 'Creating...' : 'Create Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
