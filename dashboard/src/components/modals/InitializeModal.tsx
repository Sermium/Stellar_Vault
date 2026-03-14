import React, { useState } from 'react';
import { XIcon } from '../icons';

interface InitializeModalProps {
  loading: boolean;
  publicKey: string | null;
  onClose: () => void;
  onInitialize: (name: string, signers: string, threshold: number) => void;
}

export const InitializeModal: React.FC<InitializeModalProps> = ({
  loading,
  publicKey,
  onClose,
  onInitialize,
}) => {
  const [name, setName] = useState('');
  const [signers, setSigners] = useState('');
  const [threshold, setThreshold] = useState(2);

  const handleSubmit = () => {
    onInitialize(name, signers, threshold);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0e12] border border-gray-700 rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Create Your Vault</h2>
          <p className="text-gray-400 text-sm mt-1">Set up your multi-signature treasury</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Vault Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Treasury"
              maxLength={32}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Additional Signers (comma-separated)</label>
            <textarea
              value={signers}
              onChange={(e) => setSigners(e.target.value)}
              placeholder="G..., G..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none h-24 font-mono text-sm resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">Your address ({publicKey?.slice(0, 8)}...) will be added automatically</p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Approval Threshold</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
              min="1"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Number of signatures required</p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-700">
          <button
            onClick={handleSubmit}
            disabled={loading || !name}
            className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 rounded-xl transition font-medium"
          >
            {loading ? 'Creating Vault...' : 'Create Vault'}
          </button>
        </div>
      </div>
    </div>
  );
};
