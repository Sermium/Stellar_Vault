import React, { useState, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { buildCreateVaultTx, getFactoryConfig } from '../services/factoryService';
import { STELLAR_RPC_URL, NETWORK_PASSPHRASE } from '../config';

interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
  onVaultCreated: () => void;
}

const server = new rpc.Server(STELLAR_RPC_URL);

export const CreateVaultModal: React.FC<CreateVaultModalProps> = ({
  isOpen,
  onClose,
  userAddress,
  onVaultCreated,
}) => {
  const [vaultName, setVaultName] = useState('');
  const [signers, setSigners] = useState<string[]>([]);
  const [newSigner, setNewSigner] = useState('');
  const [threshold, setThreshold] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdVaultAddress, setCreatedVaultAddress] = useState('');
  const [fee, setFee] = useState<number>(0);

  // Add current user as default signer
  useEffect(() => {
    if (isOpen && userAddress && signers.length === 0) {
      setSigners([userAddress]);
    }
  }, [isOpen, userAddress]);

  // Load fee from factory
  useEffect(() => {
    if (isOpen) {
      getFactoryConfig()
        .then(config => setFee(Number(config.fee_amount)))
        .catch(err => console.error('Failed to load fee:', err));
    }
  }, [isOpen]);

  const handleAddSigner = () => {
    const trimmed = newSigner.trim();
    if (!trimmed) return;
    
    // Basic validation
    if (!trimmed.startsWith('G') || trimmed.length !== 56) {
      setError('Invalid Stellar address');
      return;
    }
    
    if (signers.includes(trimmed)) {
      setError('Signer already added');
      return;
    }
    
    setSigners([...signers, trimmed]);
    setNewSigner('');
    setError('');
  };

  const handleRemoveSigner = (address: string) => {
    const updated = signers.filter(s => s !== address);
    setSigners(updated);
    if (threshold > updated.length) {
      setThreshold(Math.max(1, updated.length));
    }
  };

  const handleCreateVault = async () => {
    // Validation
    if (!vaultName.trim()) {
      setError('Please enter a vault name');
      return;
    }
    
    if (signers.length === 0) {
      setError('Add at least one signer');
      return;
    }
    
    if (threshold < 1 || threshold > signers.length) {
      setError('Invalid threshold');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Sanitize vault name for Symbol type
      const cleanName = vaultName
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 32);
      
      console.log('=== Creating vault ===');
      console.log('Original name:', vaultName);
      console.log('Clean name:', cleanName);
      console.log('Signers:', signers);
      console.log('Threshold:', threshold);
      console.log('Creator:', userAddress);

      if (!cleanName) {
        setError('Vault name must contain at least one letter or number');
        setLoading(false);
        return;
      }

      const tx = await buildCreateVaultTx(userAddress, cleanName, signers, threshold);
      
      const signedResult = await signTransaction(tx.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const signedTx = new StellarSdk.Transaction(signedResult.signedTxXdr, NETWORK_PASSPHRASE);
      const response = await server.sendTransaction(signedTx);

      if (response.status === 'ERROR') {
        throw new Error(`Transaction failed: ${response.errorResult}`);
      }

      // Wait for confirmation
      let result = await server.getTransaction(response.hash);
      while (result.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = await server.getTransaction(response.hash);
      }

      if (result.status === 'SUCCESS' && result.returnValue) {
        const vaultAddress = StellarSdk.scValToNative(result.returnValue) as string;
        setCreatedVaultAddress(vaultAddress);
        setSuccess(true);
        onVaultCreated();
      } else {
        throw new Error('Transaction failed');
      }
    } catch (e: any) {
      console.error('Create vault error:', e);
      setError(e.message || 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVaultName('');
    setSigners([]);
    setNewSigner('');
    setThreshold(1);
    setError('');
    setSuccess(false);
    setCreatedVaultAddress('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12131a] border border-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {!success ? (
          <>
            <h2 className="text-xl font-bold mb-6">Create New Vault</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Vault Name */}
            <div className="mb-5">
              <label className="block text-sm text-gray-400 mb-2">Vault Name</label>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="My Treasury"
                className="w-full bg-[#0a0b0d] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                disabled={loading}
              />
            </div>

            {/* Signers */}
            <div className="mb-5">
              <label className="block text-sm text-gray-400 mb-2">
                Signers ({signers.length})
              </label>
              
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newSigner}
                  onChange={(e) => setNewSigner(e.target.value)}
                  placeholder="G... (Stellar address)"
                  className="flex-1 bg-[#0a0b0d] border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSigner()}
                />
                <button
                  onClick={handleAddSigner}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {signers.map((signer, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between bg-[#0a0b0d] border border-gray-800 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">#{i + 1}</span>
                      <span className="text-sm font-mono">
                        {signer.slice(0, 8)}...{signer.slice(-8)}
                      </span>
                      {signer === userAddress && (
                        <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded">You</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveSigner(signer)}
                      disabled={loading}
                      className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Threshold */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">
                Approval Threshold
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max={Math.max(signers.length, 1)}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="flex-1 accent-purple-500"
                  disabled={loading || signers.length === 0}
                />
                <div className="bg-[#0a0b0d] border border-gray-700 rounded-lg px-4 py-2 min-w-[100px] text-center">
                  <span className="text-lg font-bold text-purple-400">{threshold}</span>
                  <span className="text-gray-500"> / {signers.length}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {threshold} of {signers.length} signers required to approve transactions
              </p>
            </div>

            {/* Fee Display */}
            <div className="mb-6 p-4 bg-[#0a0b0d] border border-gray-800 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Creation Fee</span>
                <span className="text-lg font-bold">
                  {fee > 0 ? `${fee / 10000000} XLM` : 'Free'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVault}
                disabled={loading || signers.length === 0 || !vaultName.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  'Create Vault'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">Vault Created!</h2>
              <p className="text-gray-400 mb-6">Your multi-sig vault is ready to use</p>
              
              <div className="bg-[#0a0b0d] border border-gray-800 rounded-lg p-4 mb-6">
                <p className="text-xs text-gray-500 mb-1">Vault Address</p>
                <p className="text-sm font-mono break-all text-purple-400">{createdVaultAddress}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left mb-6">
                <div className="bg-[#0a0b0d] border border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Name</p>
                  <p className="font-medium">{vaultName}</p>
                </div>
                <div className="bg-[#0a0b0d] border border-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Threshold</p>
                  <p className="font-medium">{threshold} of {signers.length}</p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
