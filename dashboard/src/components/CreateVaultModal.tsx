import React, { useState, useEffect } from 'react';
import { rpc, TransactionBuilder, scValToNative, StrKey } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { buildCreateVaultTx, getFactoryConfig, getVaultsByOwner } from '../services/factoryService';
import { getRpcUrl, getFactoryId, NETWORK_PASSPHRASE } from '../config';
import { getContacts, Contact } from '../services/contactsService';
import { insertVault, insertVaultSigners } from '../lib/supabase';

interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress: string;
  onVaultCreated: (vaultAddress: string) => void;
}

const CreateVaultModal: React.FC<CreateVaultModalProps> = ({
  isOpen,
  onClose,
  userAddress,
  onVaultCreated,
}) => {
  const [vaultName, setVaultName] = useState('');
  const [defaultName, setDefaultName] = useState('My Vault');
  const [signers, setSigners] = useState<string[]>([userAddress]);
  const [newSigner, setNewSigner] = useState('');
  const [threshold, setThreshold] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fee, setFee] = useState<number>(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);

  // Set default vault name based on existing vaults
  useEffect(() => {
    const loadDefaultName = async () => {
      if (!userAddress) return;
      try {
        const existingVaults = await getVaultsByOwner(userAddress);
        const vaultNumber = existingVaults.length + 1;
        setDefaultName(`My Vault ${vaultNumber}`);
      } catch {
        setDefaultName('My Vault');
      }
    };
    if (isOpen) {
      loadDefaultName();
    }
  }, [userAddress, isOpen]);

  // Load contacts when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadedContacts = getContacts();
      setContacts(loadedContacts);
    }
  }, [isOpen]);

  // Initialize signers with user address
  useEffect(() => {
    if (isOpen && userAddress) {
      setSigners([userAddress]);
    }
  }, [isOpen, userAddress]);

  // Load factory fee
  useEffect(() => {
    const loadFee = async () => {
      try {
        const config = await getFactoryConfig();
        if (config) {
          setFee(Number(config.fee_amount) || 0);
        }
      } catch {
        setFee(0);
      }
    };
    if (isOpen) {
      loadFee();
    }
  }, [isOpen]);

  const handleAddSigner = () => {
    const trimmed = newSigner.trim();
    if (!trimmed) return;
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
    setError(null);
  };

  const handleAddContactAsSigner = (contact: Contact) => {
    if (signers.includes(contact.address)) {
      setError('Signer already added');
      return;
    }
    setSigners([...signers, contact.address]);
    setShowContactPicker(false);
    setError(null);
  };

  const handleRemoveSigner = (address: string) => {
    if (address === userAddress) return;
    const newSigners = signers.filter((s) => s !== address);
    setSigners(newSigners);
    if (threshold > newSigners.length) {
      setThreshold(newSigners.length);
    }
  };

  const handleCreateVault = async () => {
    if (signers.length < threshold) {
      setError('Number of signers must be at least equal to threshold');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const factoryId = getFactoryId();
      if (!factoryId) throw new Error('Factory not configured');

      // Clean vault name
      let cleanName = (vaultName.trim() || defaultName)
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .substring(0, 32);

      // Build transaction
      const builtTx = await buildCreateVaultTx(
        userAddress,
        cleanName,
        signers,
        threshold
      );

      // Convert to XDR for signing
      const txXdr = builtTx.toXDR();

      // Sign with Freighter
      const signResult = await signTransaction(txXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const signedXdr = typeof signResult === 'string' ? signResult : signResult.signedTxXdr;

      // Submit transaction
      const server = new rpc.Server(getRpcUrl());
      const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const sendResult = await server.sendTransaction(tx);

      // Poll for result
      let getResult: rpc.Api.GetTransactionResponse;
      let attempts = 0;
      const maxAttempts = 30;

      do {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResult = await server.getTransaction(sendResult.hash);
        attempts++;
      } while (getResult.status === 'NOT_FOUND' && attempts < maxAttempts);

      if (getResult.status !== 'SUCCESS') {
        throw new Error('Transaction failed');
      }

      // Extract vault address from result
      const resultXdr = (getResult as rpc.Api.GetSuccessfulTransactionResponse).returnValue;
      if (!resultXdr) {
        throw new Error('No return value from transaction');
      }
      const vaultAddressRaw = scValToNative(resultXdr);
      console.log('vaultAddressRaw:', vaultAddressRaw, 'type:', typeof vaultAddressRaw);

      let vaultAddress: string;

      if (typeof vaultAddressRaw === 'string') {
        vaultAddress = vaultAddressRaw;
      } else if (vaultAddressRaw && typeof vaultAddressRaw === 'object') {
        // Handle Address object from Stellar SDK
        if (vaultAddressRaw.constructor?.name === 'Address' || vaultAddressRaw._type === 'address') {
          // Try to get the string representation
          vaultAddress = vaultAddressRaw.toString();
        } else if (Buffer.isBuffer(vaultAddressRaw) || vaultAddressRaw instanceof Uint8Array) {
          // If it's a buffer, encode it
          const { StrKey } = require('@stellar/stellar-sdk');
          vaultAddress = StrKey.encodeContract(vaultAddressRaw);
        } else {
          // Try JSON stringify to see what we have
          console.error('Unknown vault address format:', JSON.stringify(vaultAddressRaw), vaultAddressRaw);
          throw new Error('Could not parse vault address from result');
        }
      } else {
        throw new Error('Could not get vault address from result');
      }

      // Validate the address looks correct (starts with C for contract or G for account)
      if (!vaultAddress || (!vaultAddress.startsWith('C') && !vaultAddress.startsWith('G'))) {
        console.error('Invalid vault address format:', vaultAddress);
        throw new Error('Invalid vault address format');
      }

      console.log('Parsed vault address:', vaultAddress);

      // Save to database
      await insertVault({
        address: vaultAddress,
        factory_address: factoryId,
        name: cleanName,
        creator_address: userAddress,
        threshold: threshold,
        signer_count: signers.length,
        is_active: true,
      });

      await insertVaultSigners(
        signers.map((s, i) => ({
          vault_address: vaultAddress,
          signer_address: s,
          role: i === 0 ? 'SuperAdmin' : 'Executor',
          is_active: true,
        }))
      );

      // Notify parent and close immediately
      onVaultCreated(vaultAddress);
      handleClose();

    } catch (err: any) {
      console.error('Create vault error:', err);
      setError(err.message || 'Failed to create vault');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVaultName('');
    setSigners([userAddress]);
    setNewSigner('');
    setThreshold(1);
    setError(null);
    setLoading(false);
    setShowContactPicker(false);
    onClose();
  };

  if (!isOpen) return null;

  const availableContacts = contacts.filter((c) => !signers.includes(c.address));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Create New Vault</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Vault Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Vault Name
            </label>
            <input
              type="text"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              placeholder={defaultName}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              maxLength={32}
            />
          </div>

          {/* Signers */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Signers ({signers.length})
            </label>
            
            <div className="space-y-2 mb-3">
              {signers.map((signer, index) => (
                <div
                  key={signer}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-sm">
                      {signer.slice(0, 8)}...{signer.slice(-8)}
                    </span>
                    {index === 0 && (
                      <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                        You (Owner)
                      </span>
                    )}
                  </div>
                  {index !== 0 && (
                    <button
                      onClick={() => handleRemoveSigner(signer)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã¢â‚¬Å“ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSigner}
                onChange={(e) => setNewSigner(e.target.value)}
                placeholder="Add signer address (G...)"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
              />
              <button
                onClick={handleAddSigner}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm"
              >
                Add
              </button>
            </div>

            {availableContacts.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowContactPicker(!showContactPicker)}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  {showContactPicker ? 'Hide contacts' : 'Add from contacts'}
                </button>
                {showContactPicker && (
                  <div className="mt-2 p-2 bg-gray-800 rounded-lg max-h-32 overflow-y-auto">
                    {availableContacts.map((contact) => (
                      <button
                        key={contact.address}
                        onClick={() => handleAddContactAsSigner(contact)}
                        className="w-full text-left p-2 hover:bg-gray-700 rounded text-sm"
                      >
                        <span className="text-white">{contact.name}</span>
                        <span className="text-gray-400 ml-2 font-mono text-xs">
                          {contact.address.slice(0, 8)}...
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Threshold */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Approval Threshold: {threshold} of {signers.length}
            </label>
            <input
              type="range"
              min={1}
              max={signers.length}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {threshold} signature{threshold > 1 ? 's' : ''} required to approve transactions
            </p>
          </div>

          {/* Fee */}
          {fee > 0 && (
            <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm">
                Vault creation fee: <strong>{fee / 10000000} XLM</strong>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateVault}
              disabled={loading || signers.length === 0}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 rounded-xl text-white font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Vault'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateVaultModal;
