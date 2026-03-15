import React, { useState, useEffect } from 'react';
import { CopyIcon } from '../icons';
import { truncateAddress } from '../../lib/stellar';
import { 
  FACTORY_CONTRACT_ID, 
  VAULT_WASM_HASH, 
  FEE_RECIPIENT,
  VAULT_CREATION_FEE,
  DEFAULT_TX_FEE 
} from '../../config';
import { getFactoryConfig, VaultInfo } from '../../services/factoryService';

interface AdminProps {
  publicKey: string | null;
  onCopy: (text: string) => void;
}

interface FactoryConfig {
  admin: string;
  vault_wasm_hash: string;
  fee_token: string;
  fee_amount: bigint;
  fee_recipient: string;
  total_vaults_created: number;
}

export const Admin: React.FC<AdminProps> = ({ publicKey, onCopy }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'fees' | 'vaults' | 'settings'>('overview');
  const [factoryConfig, setFactoryConfig] = useState<FactoryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fee management
  const [newCreationFee, setNewCreationFee] = useState('');
  const [newTxFee, setNewTxFee] = useState('');
  const [newFeeRecipient, setNewFeeRecipient] = useState('');
  const [newWasmHash, setNewWasmHash] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadFactoryConfig();
  }, []);

  const loadFactoryConfig = async () => {
    setLoading(true);
    try {
      const config = await getFactoryConfig();
      if (config) {
        setFactoryConfig({
          admin: config.admin,
          vault_wasm_hash: config.vault_wasm_hash,
          fee_token: config.fee_token,
          fee_amount: BigInt(config.fee_amount || 0),
          fee_recipient: config.fee_recipient,
          total_vaults_created: config.total_vaults_created || 0,
        });
      }
    } catch (err: any) {
      setError('Failed to load factory config');
    } finally {
      setLoading(false);
    }
  };

  const isFactoryAdmin = publicKey && factoryConfig?.admin === publicKey;

  const formatFee = (fee: bigint) => {
    return (Number(fee) / 10000000).toFixed(2);
  };

  const handleSetCreationFee = async () => {
    if (!newCreationFee) return;
    setActionLoading(true);
    setError('');
    try {
      // This would call the factory contract's set_fee function
      // For now, show instructions
      const feeInStroops = Math.floor(parseFloat(newCreationFee) * 10000000);
      alert(`Run this command:\nstellar contract invoke --id ${FACTORY_CONTRACT_ID} --network testnet --source alice -- set_fee --admin ${publicKey} --new_fee_amount ${feeInStroops}`);
      setSuccess('Command copied - run in terminal');
      setNewCreationFee('');
    } catch (err: any) {
      setError(err.message || 'Failed to set fee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetFeeRecipient = async () => {
    if (!newFeeRecipient) return;
    setActionLoading(true);
    setError('');
    try {
      alert(`Run this command:\nstellar contract invoke --id ${FACTORY_CONTRACT_ID} --network testnet --source alice -- set_fee_recipient --admin ${publicKey} --new_recipient ${newFeeRecipient}`);
      setSuccess('Command copied - run in terminal');
      setNewFeeRecipient('');
    } catch (err: any) {
      setError(err.message || 'Failed to set recipient');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetWasmHash = async () => {
    if (!newWasmHash) return;
    setActionLoading(true);
    setError('');
    try {
      alert(`Run this command:\nstellar contract invoke --id ${FACTORY_CONTRACT_ID} --network testnet --source alice -- set_vault_wasm_hash --admin ${publicKey} --new_hash ${newWasmHash}`);
      setSuccess('Command copied - run in terminal');
      setNewWasmHash('');
    } catch (err: any) {
      setError(err.message || 'Failed to set WASM hash');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'fees' as const, label: 'Fee Management', icon: '💰' },
    { id: 'vaults' as const, label: 'All Vaults', icon: '🏦' },
    { id: 'settings' as const, label: 'Factory Settings', icon: '⚙️' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Factory Admin</h1>
          <p className="text-gray-400 mt-1">Manage the Stellar Vault factory contract</p>
        </div>
        {isFactoryAdmin ? (
          <span className="px-4 py-2 rounded-full bg-green-500/20 text-green-400 font-medium">
            ✓ Factory Admin
          </span>
        ) : (
          <span className="px-4 py-2 rounded-full bg-red-500/20 text-red-400 font-medium">
            ✗ Not Admin
          </span>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Not Admin Warning */}
      {!isFactoryAdmin && (
        <div className="p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
          <h3 className="text-yellow-400 font-semibold mb-2">⚠️ Access Restricted</h3>
          <p className="text-gray-400">
            You are not the factory admin. Only the admin wallet can modify factory settings.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Factory Admin: {truncateAddress(factoryConfig?.admin || '')}
          </p>
        </div>
      )}

      {/* Tabs */}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-6">
              <p className="text-sm text-gray-400">Total Vaults Created</p>
              <p className="text-3xl font-bold mt-2">{factoryConfig?.total_vaults_created || 0}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6">
              <p className="text-sm text-gray-400">Creation Fee</p>
              <p className="text-3xl font-bold mt-2">{formatFee(factoryConfig?.fee_amount || BigInt(0))} XLM</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6">
              <p className="text-sm text-gray-400">Transaction Fee</p>
              <p className="text-3xl font-bold mt-2">{(DEFAULT_TX_FEE / 10000000).toFixed(2)} XLM</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-6">
              <p className="text-sm text-gray-400">Network</p>
              <p className="text-3xl font-bold mt-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                Testnet
              </p>
            </div>
          </div>

          {/* Contract Info */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Factory Contract</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <div>
                  <p className="text-sm text-gray-400">Contract ID</p>
                  <p className="font-mono text-sm">{FACTORY_CONTRACT_ID}</p>
                </div>
                <button
                  onClick={() => onCopy(FACTORY_CONTRACT_ID)}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                >
                  <CopyIcon />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <div>
                  <p className="text-sm text-gray-400">Admin Wallet</p>
                  <p className="font-mono text-sm">{factoryConfig?.admin || 'Unknown'}</p>
                </div>
                <button
                  onClick={() => onCopy(factoryConfig?.admin || '')}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                >
                  <CopyIcon />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <div>
                  <p className="text-sm text-gray-400">Fee Recipient</p>
                  <p className="font-mono text-sm">{factoryConfig?.fee_recipient || FEE_RECIPIENT}</p>
                </div>
                <button
                  onClick={() => onCopy(factoryConfig?.fee_recipient || FEE_RECIPIENT)}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                >
                  <CopyIcon />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50">
                <div>
                  <p className="text-sm text-gray-400">Vault WASM Hash</p>
                  <p className="font-mono text-sm truncate max-w-md">{factoryConfig?.vault_wasm_hash || VAULT_WASM_HASH}</p>
                </div>
                <button
                  onClick={() => onCopy(factoryConfig?.vault_wasm_hash || VAULT_WASM_HASH)}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => window.open(`https://stellar.expert/explorer/testnet/contract/${FACTORY_CONTRACT_ID}`, '_blank')}
              className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 transition text-left"
            >
              <p className="font-semibold">View Factory on Explorer</p>
              <p className="text-sm text-gray-400 mt-1">Open in Stellar Expert</p>
            </button>
            <button
              onClick={() => onCopy(`stellar contract invoke --id ${FACTORY_CONTRACT_ID} --network testnet --source alice -- get_config`)}
              className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 transition text-left"
            >
              <p className="font-semibold">Copy CLI Command</p>
              <p className="text-sm text-gray-400 mt-1">Get factory config via CLI</p>
            </button>
          </div>
        </div>
      )}

      {/* Fee Management Tab */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {/* Current Fees */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Current Fee Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-800/50">
                <p className="text-sm text-gray-400">Vault Creation Fee</p>
                <p className="text-2xl font-bold mt-1">{formatFee(factoryConfig?.fee_amount || BigInt(0))} XLM</p>
                <p className="text-xs text-gray-500 mt-1">Charged when creating a new vault</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-800/50">
                <p className="text-sm text-gray-400">Transaction Fee</p>
                <p className="text-2xl font-bold mt-1">{(DEFAULT_TX_FEE / 10000000).toFixed(2)} XLM</p>
                <p className="text-xs text-gray-500 mt-1">Charged on transaction execution</p>
              </div>
            </div>
          </div>

          {/* Update Fees */}
          {isFactoryAdmin && (
            <>
              <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-6">
                <h3 className="text-lg font-semibold mb-4">Update Vault Creation Fee</h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={newCreationFee}
                      onChange={(e) => setNewCreationFee(e.target.value)}
                      placeholder="Amount in XLM"
                      className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSetCreationFee}
                    disabled={actionLoading || !newCreationFee}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition font-medium"
                  >
                    {actionLoading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6">
                <h3 className="text-lg font-semibold mb-4">Update Fee Recipient</h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newFeeRecipient}
                      onChange={(e) => setNewFeeRecipient(e.target.value)}
                      placeholder="Stellar address (G...)"
                      className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-green-500 focus:outline-none font-mono text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSetFeeRecipient}
                    disabled={actionLoading || !newFeeRecipient}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition font-medium"
                  >
                    {actionLoading ? 'Updating...' : 'Update'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Fee History / Info */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Fee Distribution</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-3 rounded-lg bg-gray-800/50">
                <span className="text-gray-400">Fee Recipient</span>
                <span className="font-mono">{truncateAddress(factoryConfig?.fee_recipient || FEE_RECIPIENT)}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-gray-800/50">
                <span className="text-gray-400">Fee Token</span>
                <span>XLM (Native)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Vaults Tab */}
      {activeTab === 'vaults' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">All Created Vaults</h3>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">
                {factoryConfig?.total_vaults_created || 0} vaults
              </span>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              View all vaults created through the factory. Use the CLI to fetch the full list:
            </p>
            
            <div className="p-4 rounded-xl bg-gray-800 font-mono text-sm overflow-x-auto">
              <code className="text-green-400">
                stellar contract invoke --id {FACTORY_CONTRACT_ID} --network testnet --source alice -- get_all_vaults
              </code>
            </div>

            <button
              onClick={() => onCopy(`stellar contract invoke --id ${FACTORY_CONTRACT_ID} --network testnet --source alice -- get_all_vaults`)}
              className="mt-4 px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 transition text-sm"
            >
              Copy Command
            </button>
          </div>
        </div>
      )}

      {/* Factory Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Update WASM Hash */}
          {isFactoryAdmin && (
            <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6">
              <h3 className="text-lg font-semibold mb-2">Update Vault WASM Hash</h3>
              <p className="text-gray-400 text-sm mb-4">
                Update the WASM hash used for deploying new vaults. This should be done after uploading a new vault contract.
              </p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newWasmHash}
                    onChange={(e) => setNewWasmHash(e.target.value)}
                    placeholder="New WASM hash (64 hex characters)"
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-cyan-500 focus:outline-none font-mono text-sm"
                  />
                </div>
                <button
                  onClick={handleSetWasmHash}
                  disabled={actionLoading || !newWasmHash}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition font-medium"
                >
                  {actionLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          )}

          {/* CLI Commands Reference */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">CLI Commands Reference</h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-800">
                <p className="text-sm text-gray-400 mb-2">Get Factory Config</p>
                <code className="text-green-400 text-sm font-mono">
                  stellar contract invoke --id {FACTORY_CONTRACT_ID} --network testnet --source alice -- get_config
                </code>
              </div>

              <div className="p-4 rounded-xl bg-gray-800">
                <p className="text-sm text-gray-400 mb-2">Set Creation Fee</p>
                <code className="text-green-400 text-sm font-mono">
                  stellar contract invoke --id {FACTORY_CONTRACT_ID} --network testnet --source alice -- set_fee --admin YOUR_ADDRESS --new_fee_amount AMOUNT_IN_STROOPS
                </code>
              </div>

              <div className="p-4 rounded-xl bg-gray-800">
                <p className="text-sm text-gray-400 mb-2">Set Fee Recipient</p>
                <code className="text-green-400 text-sm font-mono">
                  stellar contract invoke --id {FACTORY_CONTRACT_ID} --network testnet --source alice -- set_fee_recipient --admin YOUR_ADDRESS --new_recipient RECIPIENT_ADDRESS
                </code>
              </div>

              <div className="p-4 rounded-xl bg-gray-800">
                <p className="text-sm text-gray-400 mb-2">Update Vault WASM</p>
                <code className="text-green-400 text-sm font-mono">
                  stellar contract invoke --id {FACTORY_CONTRACT_ID} --network testnet --source alice -- set_vault_wasm_hash --admin YOUR_ADDRESS --new_hash NEW_WASM_HASH
                </code>
              </div>
            </div>
          </div>

          {/* Deployment Info */}
          <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Deployment Workflow</h3>
            
            <div className="space-y-4 text-sm text-gray-400">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <div>
                  <p className="text-white font-medium">Build the contract</p>
                  <code className="text-gray-500">stellar contract build</code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <div>
                  <p className="text-white font-medium">Upload the WASM</p>
                  <code className="text-gray-500">stellar contract upload --wasm target/wasm32v1-none/release/stellar_vault.wasm --network testnet --source alice</code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <div>
                  <p className="text-white font-medium">Update factory WASM hash</p>
                  <code className="text-gray-500">Use the returned hash with set_vault_wasm_hash</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
