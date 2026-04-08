import React, { useState, useEffect } from 'react';
import { CopyIcon } from '../icons';
import { VaultConfig, Role, SignerWithRole } from '../../types';
import { truncateAddress } from '../../lib/utils';
import { getContacts, getContactByAddress, Contact } from '../../services/contactsService';

interface SettingsProps {
  vaultAddress: string | null;
  vaultConfig: VaultConfig | null;
  signers: string[];
  signersWithRoles?: SignerWithRole[];
  userRole?: Role;
  publicKey: string | null;
  onCopy: (text: string) => void;
  onAddSigner?: (address: string, role: Role) => Promise<void>;
  onRemoveSigner?: (address: string) => Promise<void>;
  onSetRole?: (address: string, role: Role) => Promise<void>;
  onSetThreshold?: (threshold: number) => Promise<void>;
  onLeaveVault?: () => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({
  vaultAddress,
  vaultConfig,
  signers,
  signersWithRoles,
  userRole,
  publicKey,
  onCopy,
  onAddSigner,
  onRemoveSigner,
  onSetRole,
  onSetThreshold,
  onLeaveVault,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'advanced'>('general');
  
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<Role>('Executor');
  const [editingMember, setEditingMember] = useState<string | null>(null);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [inputMode, setInputMode] = useState<'contacts' | 'manual'>('contacts');
  
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [newThreshold, setNewThreshold] = useState(vaultConfig?.threshold || 1);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = userRole === 'SuperAdmin' || userRole === 'Admin';
  const isSigner = publicKey && signers.includes(publicKey);

  useEffect(() => {
    if (showAddMemberModal) {
      setContacts(getContacts());
    }
  }, [showAddMemberModal]);

  const availableContacts = contacts.filter(
    contact => !signers.includes(contact.address)
  );

  const filteredContacts = availableContacts.filter(contact => {
    if (!contactSearch) return true;
    const searchLower = contactSearch.toLowerCase();
    return (
      contact.name.toLowerCase().includes(searchLower) ||
      contact.address.toLowerCase().includes(searchLower)
    );
  });

  const getSignerRole = (address: string): Role => {
    const found = signersWithRoles?.find(s => s.address === address);
    return found?.role || 'Executor';
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Executor':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setNewMemberAddress(contact.address);
    setContactSearch('');
    setShowContactDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedContact(null);
    setNewMemberAddress('');
    setContactSearch('');
  };

  const handleAddMember = async () => {
    if (!onAddSigner || !newMemberAddress) return;
    
    if (!newMemberAddress.startsWith('G') || newMemberAddress.length !== 56) {
      setError('Invalid Stellar address');
      return;
    }

    if (signers.includes(newMemberAddress)) {
      setError('Address is already a member');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onAddSigner(newMemberAddress, newMemberRole);
      setSuccess('Member added successfully!');
      setShowAddMemberModal(false);
      setNewMemberAddress('');
      setNewMemberRole('Executor');
      setSelectedContact(null);
      setContactSearch('');
      setInputMode('contacts');
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (address: string) => {
    if (!onRemoveSigner) return;

    if (signers.length <= (vaultConfig?.threshold || 1)) {
      setError('Cannot remove member: would break threshold requirement');
      return;
    }

    const superAdminCount = signersWithRoles?.filter(s => s.role === 'SuperAdmin').length || 0;
    const isRemovingSuperAdmin = getSignerRole(address) === 'SuperAdmin';
    if (isRemovingSuperAdmin && superAdminCount <= 1) {
      setError('Cannot remove the last super admin');
      return;
    }

    const contactName = getContactByAddress(address)?.name || null;
    if (!window.confirm(`Remove ${contactName || truncateAddress(address)} from vault?`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onRemoveSigner(address);
      setSuccess('Member removed successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (address: string, role: Role) => {
    if (!onSetRole) return;

    const superAdminCount = signersWithRoles?.filter(s => s.role === 'SuperAdmin').length || 0;
    const currentRole = getSignerRole(address);
    if (currentRole === 'SuperAdmin' && role !== 'SuperAdmin' && superAdminCount <= 1) {
      setError('Cannot change role: vault must have at least one super admin');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSetRole(address, role);
      setSuccess('Role updated successfully!');
      setEditingMember(null);
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdChange = async () => {
    if (!onSetThreshold) return;

    if (newThreshold < 1) {
      setError('Threshold must be at least 1');
      return;
    }

    if (newThreshold > signers.length) {
      setError('Threshold cannot exceed number of members');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSetThreshold(newThreshold);
      setSuccess('Threshold updated successfully!');
      setShowThresholdModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update threshold');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveVault = async () => {
    if (!onLeaveVault || !publicKey) return;

    const superAdminCount = signersWithRoles?.filter(s => s.role === 'SuperAdmin').length || 0;
    const isLastSigner = signers.length === 1;
    const isLastSuperAdmin = userRole === 'SuperAdmin' && superAdminCount <= 1;

    let warningMessage = 'Are you sure you want to leave this vault? This action cannot be undone.';
    
    if (isLastSigner) {
      warningMessage = 'WARNING: You are the LAST member of this vault. Leaving will ABANDON the vault permanently. Any remaining funds will be inaccessible. Are you absolutely sure?';
    } else if (isLastSuperAdmin && signers.length > 1) {
      setError('You are the last super admin. Please assign another super admin before leaving, or remove all other members first.');
      return;
    } else if ((signers.length - 1) < (vaultConfig?.threshold || 1)) {
      setError(`Cannot leave: would break threshold requirement. Current threshold is ${vaultConfig?.threshold}, but only ${signers.length - 1} members would remain.`);
      return;
    }

    if (!window.confirm(warningMessage)) {
      return;
    }

    if (isLastSigner) {
      if (!window.confirm('This is your FINAL warning. The vault will be permanently abandoned. Continue?')) {
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      await onLeaveVault();
      setSuccess('You have left the vault successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to leave vault');
    } finally {
      setLoading(false);
    }
  };

  const resetAddMemberModal = () => {
    setShowAddMemberModal(false);
    setError('');
    setNewMemberAddress('');
    setNewMemberRole('Executor');
    setSelectedContact(null);
    setContactSearch('');
    setInputMode('contacts');
    setShowContactDropdown(false);
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: '⚙️' },
    { id: 'members' as const, label: 'Members & Roles', icon: '👥' },
    { id: 'advanced' as const, label: 'Advanced', icon: '🔧' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vault Settings</h1>
        <p className="text-gray-400 mt-1">Manage your vault configuration and members</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="hover:text-red-300">×</button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="hover:text-green-300">×</button>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-700 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Vault Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <div>
                  <p className="text-sm text-gray-400">Vault Name</p>
                  <p className="font-semibold text-lg">{vaultConfig?.name || 'Unknown'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-400">Vault Address</p>
                  <p className="font-mono text-sm truncate">{vaultAddress || 'Not selected'}</p>
                </div>
                {vaultAddress && (
                  <button
                    onClick={() => onCopy(vaultAddress)}
                    className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition ml-2"
                  >
                    <CopyIcon />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <div>
                  <p className="text-sm text-gray-400">Your Role</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeStyle(userRole || 'Executor')}`}>
                    {userRole || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-4">
              <p className="text-sm text-gray-400">Members</p>
              <p className="text-2xl font-bold">{signers.length}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-4">
              <p className="text-sm text-gray-400">Threshold</p>
              <p className="text-2xl font-bold">{vaultConfig?.threshold} / {signers.length}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-4">
              <p className="text-sm text-gray-400">Super Admins</p>
              <p className="text-2xl font-bold">{signersWithRoles?.filter(s => s.role === 'SuperAdmin').length || 0}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Connected Wallet</h3>
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold">
                  {publicKey?.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm text-gray-400">Public Key</p>
                  <p className="font-mono text-sm">{truncateAddress(publicKey || '')}</p>
                </div>
              </div>
              {publicKey && (
                <button
                  onClick={() => onCopy(publicKey)}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                >
                  <CopyIcon />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Approval Threshold</h3>
                <p className="text-gray-400 text-sm mt-1">
                  {vaultConfig?.threshold} of {signers.length} signatures required to execute transactions
                </p>
              </div>
              {isAdmin && onSetThreshold && (
                <button
                  onClick={() => {
                    setNewThreshold(vaultConfig?.threshold || 1);
                    setShowThresholdModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition font-medium"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
            <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Vault Members</h3>
                <p className="text-sm text-gray-400 mt-1">Manage who can access and control this vault</p>
              </div>
              {isAdmin && onAddSigner && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Member
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-700/50">
              {signers.map((signer) => {
                const role = getSignerRole(signer);
                const contactName = getContactByAddress(signer)?.name || null;
                
                return (
                  <div key={signer} className="p-4 hover:bg-gray-800/30 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                          role === 'SuperAdmin'
                            ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                            : role === 'Admin'
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                            : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        }`}>
                          {contactName?.charAt(0).toUpperCase() || signer.slice(0, 2)}
                        </div>
                        <div>
                          {contactName && (
                            <p className="font-semibold text-white">{contactName}</p>
                          )}
                          <p className={`font-mono ${contactName ? 'text-sm text-gray-400' : ''}`}>
                            {truncateAddress(signer)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {signer === publicKey && (
                              <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">You</span>
                            )}
                            
                            {editingMember === signer && isAdmin && onSetRole ? (
                              <select
                                value={role}
                                onChange={(e) => handleRoleChange(signer, e.target.value as Role)}
                                onBlur={() => setEditingMember(null)}
                                className="text-xs px-2 py-1 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-purple-500"
                                autoFocus
                                disabled={loading}
                              >
                                <option value="SuperAdmin">SuperAdmin</option>
                                <option value="Admin">Admin</option>
                                <option value="Executor">Executor</option>
                              </select>
                            ) : (
                              <button
                                onClick={() => isAdmin && onSetRole && setEditingMember(signer)}
                                className={`text-xs px-2 py-0.5 rounded border ${getRoleBadgeStyle(role)} ${
                                  isAdmin && onSetRole ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                                }`}
                                disabled={!isAdmin || !onSetRole}
                              >
                                {role}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onCopy(signer)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                          title="Copy address"
                        >
                          <CopyIcon />
                        </button>
                        
                        {isAdmin && onRemoveSigner && signer !== publicKey && (
                          <button
                            onClick={() => handleRemoveMember(signer)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                            title="Remove member"
                            disabled={loading}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Role Permissions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-sm font-medium">SuperAdmin</span>
                </div>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Full vault control</li>
                  <li>• Manage all members & roles</li>
                  <li>• Change threshold</li>
                  <li>• Create & execute transactions</li>
                </ul>
              </div>
              
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-sm font-medium">Admin</span>
                </div>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Manage executors</li>
                  <li>• Change threshold</li>
                  <li>• Create & approve transactions</li>
                  <li>• Manage locks</li>
                </ul>
              </div>
              
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-sm font-medium">Executor</span>
                </div>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Create transactions</li>
                  <li>• Approve transactions</li>
                  <li>• Execute approved txns</li>
                  <li>• View all activity</li>
                </ul>
              </div>
            </div>
          </div>

          {!isAdmin && (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
              Only vault admins can manage members and roles.
            </div>
          )}
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Contract Details</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                <span className="text-gray-400">Contract Type</span>
                <span>Soroban Smart Contract</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50">
                <span className="text-gray-400">Network</span>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  Testnet
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Export Vault Data</p>
                    <p className="text-sm text-gray-400">Download configuration and transaction history</p>
                  </div>
                  <button
                    onClick={() => {
                      const data = {
                        vaultAddress,
                        config: vaultConfig,
                        signers,
                        signersWithRoles,
                        exportedAt: new Date().toISOString(),
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `vault-${vaultAddress?.slice(0, 8)}-export.json`;
                      a.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
                  >
                    Export
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">View on Explorer</p>
                    <p className="text-sm text-gray-400">Open vault contract on Stellar Expert</p>
                  </div>
                  <button
                    onClick={() => window.open(`https://stellar.expert/explorer/testnet/contract/${vaultAddress}`, '_blank')}
                    className="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
                  >
                    Open
                  </button>
                </div>
              </div>
            </div>
          </div>

          {isSigner && onLeaveVault && (
            <div className="rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4">⚠️ Danger Zone</h3>
              
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-red-400">Leave Vault</p>
                    <p className="text-sm text-gray-400">
                      Remove yourself as a signer. This cannot be undone.
                      {signers.length === 1 && (
                        <span className="block text-red-400 mt-1">
                          ⚠️ You are the last member - leaving will abandon the vault!
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={handleLeaveVault}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50"
                  >
                    {loading ? 'Leaving...' : 'Leave'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12131a] rounded-2xl border border-gray-700 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Add New Member</h3>
              <p className="text-sm text-gray-400 mt-1">Select from contacts or enter address manually</p>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex gap-2 p-1 bg-gray-800 rounded-xl">
                <button
                  onClick={() => {
                    setInputMode('contacts');
                    setNewMemberAddress('');
                    setSelectedContact(null);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg transition font-medium ${
                    inputMode === 'contacts'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  From Contacts
                </button>
                <button
                  onClick={() => {
                    setInputMode('manual');
                    setSelectedContact(null);
                    setContactSearch('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg transition font-medium ${
                    inputMode === 'manual'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Enter Address
                </button>
              </div>

              {inputMode === 'contacts' && (
                <div className="space-y-4">
                  {selectedContact ? (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold">
                            {selectedContact.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{selectedContact.name}</p>
                            <p className="text-sm text-gray-400 font-mono">{truncateAddress(selectedContact.address)}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleClearSelection}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={(e) => {
                          setContactSearch(e.target.value);
                          setShowContactDropdown(true);
                        }}
                        onFocus={() => setShowContactDropdown(true)}
                        className="w-full p-3 pl-10 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
                      />
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>

                      {showContactDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto">
                          {filteredContacts.length > 0 ? (
                            filteredContacts.map((contact) => (
                              <button
                                key={contact.id}
                                onClick={() => handleSelectContact(contact)}
                                className="w-full p-3 flex items-center gap-3 hover:bg-gray-700 transition text-left"
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-sm">
                                  {contact.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{contact.name}</p>
                                  <p className="text-xs text-gray-400 font-mono truncate">{truncateAddress(contact.address)}</p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-gray-400">
                              {availableContacts.length === 0 
                                ? 'No contacts available (all are already members)'
                                : 'No contacts found'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {availableContacts.length === 0 && !selectedContact && (
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
                      All your contacts are already vault members. Use "Enter Address" to add a new member.
                    </div>
                  )}
                </div>
              )}

              {inputMode === 'manual' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Stellar Address</label>
                  <input
                    type="text"
                    value={newMemberAddress}
                    onChange={(e) => setNewMemberAddress(e.target.value)}
                    placeholder="G..."
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none font-mono text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as Role)}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
                >
                  <option value="SuperAdmin">SuperAdmin - Full control</option>
                  <option value="Admin">Admin - Manage members</option>
                  <option value="Executor">Executor - Can transact</option>
                </select>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={resetAddMemberModal}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={loading || !newMemberAddress}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition font-medium"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showThresholdModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12131a] rounded-2xl border border-gray-700 w-full max-w-md">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Change Approval Threshold</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Required signatures: {newThreshold} of {signers.length}
                </label>
                <input
                  type="range"
                  min="1"
                  max={signers.length}
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>{signers.length}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Changing the threshold affects security. A higher threshold requires more signatures but may slow operations.
                </p>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => setShowThresholdModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleThresholdChange}
                disabled={loading || newThreshold === vaultConfig?.threshold}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition font-medium"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
