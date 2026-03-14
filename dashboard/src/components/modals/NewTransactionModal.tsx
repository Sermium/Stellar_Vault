import React, { useState } from 'react';
import { XIcon } from '../icons';
import { NATIVE_TOKEN } from '../../config/constants';

interface NewTransactionModalProps {
  loading: boolean;
  onClose: () => void;
  onSubmit: (token: string, to: string, amount: string) => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  loading,
  onClose,
  onSubmit,
}) => {
  const [token, setToken] = useState(NATIVE_TOKEN);
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    onSubmit(token, to, amount);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0e12] border border-gray-700 rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold">New Transaction</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg">
            <XIcon />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Recipient Address</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="G..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Amount (stroops)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10000000"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">1 XLM = 10,000,000 stroops</p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !to || !amount}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 rounded-xl transition font-medium"
          >
            {loading ? 'Creating...' : 'Create Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
};
