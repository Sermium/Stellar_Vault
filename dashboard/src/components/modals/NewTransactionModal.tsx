import React, { useState, useEffect } from 'react';
import { SUPPORTED_TOKENS } from '../../config';
import { getCustomTokens } from '../../services/tokensService';
import { getContacts, Contact } from '../../services/contactsService';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (token: string, recipient: string, amount: bigint) => Promise<void>;
  preselectedToken?: string | null;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedToken,
}) => {
  const [selectedToken, setSelectedToken] = useState(SUPPORTED_TOKENS[0]?.address || '');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

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
    // Show dropdown if user is typing and there are matching contacts
    if (value.length > 0 && !value.startsWith('G')) {
      setShowContactDropdown(true);
    } else {
      setShowContactDropdown(false);
    }
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
    const decimals = selectedTokenInfo?.decimals || 7;
    const amountInStroops = BigInt(Math.floor(amountNum * Math.pow(10, decimals)));

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

  // Get contact name for display if recipient matches a contact
  const getRecipientDisplay = () => {
    const contact = contacts.find(c => c.address === recipient);
    return contact ? contact.name : '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">New Transaction</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token Selection */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Token</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              {allTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient with Contacts */}
          <div className="relative">
            <label className="block text-sm text-slate-400 mb-2">Recipient</label>
            
            {/* Contact selector buttons */}
            {contacts.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                <span className="text-xs text-slate-500">Quick select:</span>
                {contacts.slice(0, 5).map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectContact(contact)}
                    className={`px-2 py-1 text-xs rounded-full transition-colors ${
                      recipient === contact.address
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
                value={recipient.startsWith('G') ? recipient : contactSearch}
                onChange={(e) => handleRecipientChange(e.target.value)}
                onFocus={() => {
                  if (contacts.length > 0 && !recipient.startsWith('G')) {
                    setShowContactDropdown(true);
                  }
                }}
                placeholder="Search contacts or enter G... address"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              
              {/* Show selected contact name badge */}
              {recipient.startsWith('G') && getRecipientDisplay() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="px-2 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full">
                    {getRecipientDisplay()}
                  </span>
                </div>
              )}

              {/* Contact dropdown */}
              {showContactDropdown && filteredContacts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-600 transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold text-sm">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{contact.name}</p>
                        <p className="text-slate-400 text-xs font-mono truncate">{contact.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Show full address if contact selected */}
            {recipient.startsWith('G') && (
              <p className="text-xs text-slate-500 mt-1 font-mono truncate">{recipient}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Amount ({selectedTokenInfo?.symbol || 'Token'})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="any"
              min="0"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !recipient || !amount}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Creating...' : 'Create Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
