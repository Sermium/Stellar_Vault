import React, { useState } from 'react';
import { CopyIcon } from '../icons';
import { VaultConfig, Role, SignerWithRole } from '../../types';
import { truncateAddress } from '../../lib/utils';
import { getContacts, saveContact, Contact, getContactByAddress } from '../../services/contactsService';

interface MembersProps {
  signers: string[];
  signersWithRoles?: SignerWithRole[];
  vaultConfig: VaultConfig | null;
  publicKey: string | null;
  userRole?: Role;
  onCopy: (text: string) => void;
}

export const Members: React.FC<MembersProps> = ({
  signers,
  signersWithRoles,
  vaultConfig,
  publicKey,
  userRole,
  onCopy,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>(getContacts());
  
  // Add to contacts modal state
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [addedToContacts, setAddedToContacts] = useState<string[]>([]);

  const getSignerRole = (address: string): Role => {
    const found = signersWithRoles?.find(s => s.address === address);
    return found?.role || 'Viewer';
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Executor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Viewer':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const isInContacts = (address: string): boolean => {
    return contacts.some(c => c.address === address) || addedToContacts.includes(address);
  };

  const handleAddToContacts = () => {
    if (!contactName.trim() || !selectedAddress) return;

    const newContact: Contact = {
      id: Date.now().toString(),
      address: selectedAddress,
      name: contactName.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveContact(newContact);
    setContacts(getContacts());
    setAddedToContacts([...addedToContacts, selectedAddress]);
    setShowAddContactModal(false);
    setContactName('');
    setSelectedAddress('');
  };

  const filteredSigners = signers.filter(signer => {
    if (!searchQuery) return true;
    const contact = getContactByAddress(signer);
    const searchLower = searchQuery.toLowerCase();
    return (
      signer.toLowerCase().includes(searchLower) ||
      contact?.name?.toLowerCase().includes(searchLower) ||
      getSignerRole(signer).toLowerCase().includes(searchLower)
    );
  });

  const adminCount = signersWithRoles?.filter(s => s.role === 'Admin').length || 0;
  const executorCount = signersWithRoles?.filter(s => s.role === 'Executor').length || 0;
  const viewerCount = signersWithRoles?.filter(s => s.role === 'Viewer').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vault Members</h1>
          <p className="text-gray-400 mt-1">
            {signers.length} member{signers.length !== 1 ? 's' : ''} • 
            Threshold: {vaultConfig?.threshold || 1} of {signers.length}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-4">
          <p className="text-sm text-gray-400">Total Members</p>
          <p className="text-2xl font-bold">{signers.length}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-4">
          <p className="text-sm text-gray-400">Admins</p>
          <p className="text-2xl font-bold text-purple-400">{adminCount}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-4">
          <p className="text-sm text-gray-400">Executors</p>
          <p className="text-2xl font-bold text-blue-400">{executorCount}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-gray-500/10 to-slate-500/10 border border-gray-500/20 p-4">
          <p className="text-sm text-gray-400">Viewers</p>
          <p className="text-2xl font-bold text-gray-400">{viewerCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search members by address, name, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-4 pl-12 rounded-xl bg-gray-800/50 border border-gray-700 focus:border-purple-500 focus:outline-none"
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">
        💡 To manage members (add, remove, change roles), go to <strong>Settings → Members & Roles</strong>
      </div>

      {/* Members List */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 overflow-hidden">
        <div className="divide-y divide-gray-700/50">
          {filteredSigners.map((signer) => {
            const role = getSignerRole(signer);
            const contact = getContactByAddress(signer);
            const isCurrentUser = signer === publicKey;

            return (
              <div
                key={signer}
                className={`p-4 hover:bg-gray-800/30 transition ${isCurrentUser ? 'bg-cyan-500/5' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      role === 'Admin' 
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                        : role === 'Executor'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        : 'bg-gray-700'
                    }`}>
                      {contact?.name?.charAt(0).toUpperCase() || signer.slice(0, 2)}
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        {contact ? (
                          <>
                            <p className="font-semibold text-white">{contact.name}</p>
                            <p className="text-sm text-gray-400 font-mono">({truncateAddress(signer)})</p>
                          </>
                        ) : (
                          <p className="font-mono">{truncateAddress(signer)}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {isCurrentUser && (
                          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(role)}`}>
                          {role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Add to contacts button */}
                    {!isInContacts(signer) && (
                      <button
                        onClick={() => {
                          setSelectedAddress(signer);
                          setShowAddContactModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition"
                        title="Add to contacts"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      </button>
                    )}

                    {/* Copy address */}
                    <button
                      onClick={() => onCopy(signer)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                      title="Copy address"
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSigners.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No members found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Role Legend */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-sm font-medium">Admin</span>
            </div>
            <p className="text-sm text-gray-400">Full control over vault settings, members, and transactions</p>
          </div>
          
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-sm font-medium">Executor</span>
            </div>
            <p className="text-sm text-gray-400">Can create, approve, and execute transactions</p>
          </div>
          
          <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-sm font-medium">Viewer</span>
            </div>
            <p className="text-sm text-gray-400">Read-only access to view balances and activity</p>
          </div>
        </div>
      </div>

      {/* Add to Contacts Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12131a] rounded-2xl border border-gray-700 w-full max-w-md">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Add to Contacts</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Address</label>
                <p className="font-mono text-sm bg-gray-800 p-3 rounded-xl break-all">
                  {selectedAddress}
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter a name for this contact"
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowAddContactModal(false);
                  setContactName('');
                  setSelectedAddress('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToContacts}
                disabled={!contactName.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition font-medium"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
