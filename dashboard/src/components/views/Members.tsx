import React, { useState } from 'react';
import { CopyIcon, ShieldIcon } from '../icons';
import { VaultConfig, Role, SignerWithRole } from '../../types';
import { truncateAddress } from '../../lib/stellar';
import { getContactName } from '../../services/contactsService';

interface MembersProps {
  signers: string[];
  signersWithRoles?: SignerWithRole[];
  vaultConfig: VaultConfig | null;
  publicKey: string | null;
  userRole?: Role;
  onCopy: (text: string) => void;
  onAddSigner?: (address: string, role: Role) => Promise<void>;
  onRemoveSigner?: (address: string) => Promise<void>;
  onSetRole?: (address: string, role: Role) => Promise<void>;
  onSetThreshold?: (threshold: number) => Promise<void>;
}

export const Members: React.FC<MembersProps> = ({
  signers,
  signersWithRoles,
  vaultConfig,
  publicKey,
  userRole,
  onCopy,
  onAddSigner,
  onRemoveSigner,
  onSetRole,
  onSetThreshold,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [newSignerAddress, setNewSignerAddress] = useState('');
  const [newSignerRole, setNewSignerRole] = useState<Role>('Executor');
  const [newThreshold, setNewThreshold] = useState(vaultConfig?.threshold || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const isAdmin = userRole === 'Admin';
  const canManageMembers = isAdmin && onAddSigner && onRemoveSigner && onSetRole;

  const getSignerRole = (address: string): Role => {
    const found = signersWithRoles?.find(s => s.address === address);
    return found?.role || 'Executor';
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

  const handleAddSigner = async () => {
    if (!newSignerAddress || !onAddSigner) return;
    
    // Validate address
    if (!newSignerAddress.startsWith('G') || newSignerAddress.length !== 56) {
      setError('Invalid Stellar address');
      return;
    }

    if (signers.includes(newSignerAddress)) {
      setError('Address is already a signer');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onAddSigner(newSignerAddress, newSignerRole);
      setShowAddModal(false);
      setNewSignerAddress('');
      setNewSignerRole('Executor');
    } catch (err: any) {
      setError(err.message || 'Failed to add signer');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSigner = async (address: string) => {
    if (!onRemoveSigner) return;

    // Check if removing would break threshold
    if (signers.length <= (vaultConfig?.threshold || 1)) {
      setError('Cannot remove signer: would break threshold requirement');
      return;
    }

    // Check if removing last admin
    const adminCount = signersWithRoles?.filter(s => s.role === 'Admin').length || 0;
    const isRemovingAdmin = getSignerRole(address) === 'Admin';
    if (isRemovingAdmin && adminCount <= 1) {
      setError('Cannot remove the last admin');
      return;
    }

    if (!window.confirm(`Remove ${getContactName(address) || truncateAddress(address)} from vault?`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onRemoveSigner(address);
    } catch (err: any) {
      setError(err.message || 'Failed to remove signer');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (address: string, role: Role) => {
    if (!onSetRole) return;

    // Check if changing last admin away from admin
    const adminCount = signersWithRoles?.filter(s => s.role === 'Admin').length || 0;
    const currentRole = getSignerRole(address);
    if (currentRole === 'Admin' && role !== 'Admin' && adminCount <= 1) {
      setError('Cannot change role: vault must have at least one admin');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSetRole(address, role);
      setEditingRole(null);
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
      setError('Threshold cannot exceed number of signers');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onSetThreshold(newThreshold);
      setShowThresholdModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to change threshold');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
          <button onClick={() => setError('')} className="float-right hover:text-red-300">×</button>
        </div>
      )}

      {/* Members List */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
        <div className="p-6 border-b border-gray-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Vault Members</h2>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
              {signers.length} signers
            </span>
            {canManageMembers && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-medium transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Member
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-700/50">
          {signers.map((signer, i) => {
            const role = getSignerRole(signer);
            const contactName = getContactName(signer);
            
            return (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-800/30 transition">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                    signer === publicKey
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                      : 'bg-gray-700'
                  }`}>
                    {signer.slice(0, 2)}
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
                      
                      {/* Role Badge / Dropdown */}
                      {editingRole === signer && canManageMembers ? (
                        <select
                          value={role}
                          onChange={(e) => handleRoleChange(signer, e.target.value as Role)}
                          onBlur={() => setEditingRole(null)}
                          className="text-xs px-2 py-1 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-purple-500"
                          autoFocus
                        >
                          <option value="Admin">Admin</option>
                          <option value="Executor">Executor</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => canManageMembers && setEditingRole(signer)}
                          className={`text-xs px-2 py-0.5 rounded border ${getRoleBadgeStyle(role)} ${
                            canManageMembers ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                          }`}
                          disabled={!canManageMembers}
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
                  
                  {canManageMembers && signer !== publicKey && (
                    <button
                      onClick={() => handleRemoveSigner(signer)}
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
            );
          })}
        </div>
      </div>

      {/* Threshold Info */}
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShieldIcon />
            </div>
            <div>
              <p className="font-semibold">Approval Threshold</p>
              <p className="text-gray-400">
                {vaultConfig?.threshold} of {vaultConfig?.signer_count} signatures required to execute transactions
              </p>
            </div>
          </div>
          {canManageMembers && (
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

      {/* Role Permissions Info */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-sm font-medium">Admin</span>
            </div>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Manage members & roles</li>
              <li>• Change threshold</li>
              <li>• Create & approve transactions</li>
              <li>• Execute transactions</li>
              <li>• View all activity</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-sm font-medium">Executor</span>
            </div>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Create & approve transactions</li>
              <li>• Execute transactions</li>
              <li>• View all activity</li>
              <li className="text-gray-600">• Cannot manage members</li>
              <li className="text-gray-600">• Cannot change settings</li>
            </ul>
          </div>
          
          <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 text-sm font-medium">Viewer</span>
            </div>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• View all activity</li>
              <li>• View balances & history</li>
              <li className="text-gray-600">• Cannot create transactions</li>
              <li className="text-gray-600">• Cannot approve/execute</li>
              <li className="text-gray-600">• Cannot manage anything</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12131a] rounded-2xl border border-gray-700 w-full max-w-md">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold">Add New Member</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Stellar Address</label>
                <input
                  type="text"
                  value={newSignerAddress}
                  onChange={(e) => setNewSignerAddress(e.target.value)}
                  placeholder="G..."
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Role</label>
                <select
                  value={newSignerRole}
                  onChange={(e) => setNewSignerRole(e.target.value as Role)}
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
                >
                  <option value="Admin">Admin - Full control</option>
                  <option value="Executor">Executor - Can transact</option>
                  <option value="Viewer">Viewer - Read only</option>
                </select>
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError('');
                  setNewSignerAddress('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSigner}
                disabled={loading || !newSignerAddress}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition font-medium"
              >
                {loading ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Threshold Modal */}
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

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowThresholdModal(false);
                  setError('');
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleThresholdChange}
                disabled={loading || newThreshold === vaultConfig?.threshold}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition font-medium"
              >
                {loading ? 'Updating...' : 'Update Threshold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
