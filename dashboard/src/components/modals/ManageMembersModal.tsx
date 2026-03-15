import React, { useState } from 'react';
import { VaultConfig } from '../../types';
import { getContactName } from '../../services/contactsService';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultConfig: VaultConfig | null;
  signers: string[];
  publicKey: string | null;
  loading: boolean;
  onAddSigner: (address: string) => Promise<void>;
  onRemoveSigner: (address: string) => Promise<void>;
  onSetThreshold: (threshold: number) => Promise<void>;
}

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  isOpen,
  onClose,
  vaultConfig,
  signers,
  publicKey,
  loading,
  onAddSigner,
  onRemoveSigner,
  onSetThreshold,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'threshold'>('members');
  const [newSigner, setNewSigner] = useState('');
  const [newThreshold, setNewThreshold] = useState(vaultConfig?.threshold || 1);
  const [error, setError] = useState('');

  const handleAddSigner = async () => {
    if (!newSigner.trim() || !newSigner.startsWith('G') || newSigner.length !== 56) {
      setError('Invalid Stellar address');
      return;
    }
    if (signers.includes(newSigner)) {
      setError('Address is already a signer');
      return;
    }

    try {
      setError('');
      await onAddSigner(newSigner.trim());
      setNewSigner('');
    } catch (err: any) {
      setError(err.message || 'Failed to add signer');
    }
  };

  const handleRemoveSigner = async (address: string) => {
    if (signers.length <= (vaultConfig?.threshold || 1)) {
      setError('Cannot remove signer: would go below threshold');
      return;
    }
    if (!confirm(`Remove ${getContactName(address) || address.slice(0, 8)}... as signer?`)) {
      return;
    }

    try {
      setError('');
      await onRemoveSigner(address);
    } catch (err: any) {
      setError(err.message || 'Failed to remove signer');
    }
  };

  const handleSetThreshold = async () => {
    if (newThreshold < 1 || newThreshold > signers.length) {
      setError(`Threshold must be between 1 and ${signers.length}`);
      return;
    }

    try {
      setError('');
      await onSetThreshold(newThreshold);
    } catch (err: any) {
      setError(err.message || 'Failed to update threshold');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12131a] border border-gray-800 rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Manage Vault</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              activeTab === 'members'
                ? 'bg-purple-600 text-white'
                : 'bg-[#0a0b0d] text-gray-400 hover:text-white'
            }`}
          >
            Members ({signers.length})
          </button>
          <button
            onClick={() => setActiveTab('threshold')}
            className={`flex-1 py-2 rounded-lg transition-colors ${
              activeTab === 'threshold'
                ? 'bg-purple-600 text-white'
                : 'bg-[#0a0b0d] text-gray-400 hover:text-white'
            }`}
          >
            Threshold ({vaultConfig?.threshold}/{signers.length})
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <>
            {/* Add Signer */}
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Add New Signer</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSigner}
                  onChange={(e) => setNewSigner(e.target.value)}
                  placeholder="G..."
                  className="flex-1 bg-[#0a0b0d] border border-gray-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
                  disabled={loading}
                />
                <button
                  onClick={handleAddSigner}
                  disabled={loading || !newSigner}
                  className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? '...' : 'Add'}
                </button>
              </div>
            </div>

            {/* Signers List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {signers.map((signer) => {
                const contactName = getContactName(signer);
                const isCurrentUser = signer === publicKey;

                return (
                  <div
                    key={signer}
                    className="flex items-center justify-between p-3 bg-[#0a0b0d] border border-gray-800 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {contactName || `${signer.slice(0, 8)}...${signer.slice(-4)}`}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                      </div>
                      {contactName && (
                        <p className="text-xs text-gray-500 font-mono mt-1">
                          {signer.slice(0, 12)}...{signer.slice(-8)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSigner(signer)}
                      disabled={loading || signers.length <= 1}
                      className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Threshold Tab */}
        {activeTab === 'threshold' && (
          <>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">
                Approval Threshold
              </label>
              <p className="text-gray-500 text-sm mb-4">
                Number of signatures required to approve and execute transactions.
              </p>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max={signers.length}
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(Number(e.target.value))}
                  className="flex-1 accent-purple-500"
                  disabled={loading}
                />
                <div className="bg-[#0a0b0d] border border-gray-700 rounded-lg px-4 py-2 min-w-[80px] text-center">
                  <span className="text-xl font-bold text-purple-400">{newThreshold}</span>
                  <span className="text-gray-500"> / {signers.length}</span>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-2">
                {newThreshold} of {signers.length} signers must approve each transaction
              </p>
            </div>

            <button
              onClick={handleSetThreshold}
              disabled={loading || newThreshold === vaultConfig?.threshold}
              className="w-full py-3 bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Updating...' : 'Update Threshold'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
