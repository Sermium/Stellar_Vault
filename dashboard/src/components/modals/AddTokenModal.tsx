import React, { useState, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from '../../config';

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToken: (token: { address: string; symbol: string; name: string; decimals: number }) => void;
}

interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
}

export const AddTokenModal: React.FC<AddTokenModalProps> = ({ isOpen, onClose, onAddToken }) => {
  const [address, setAddress] = useState('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  
  const [manualSymbol, setManualSymbol] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualDecimals, setManualDecimals] = useState(7);

  useEffect(() => {
    if (address.length === 56 && address.startsWith('C')) {
      fetchTokenInfo(address);
    } else {
      setTokenInfo(null);
      setError('');
    }
  }, [address]);

  const fetchTokenInfo = async (contractAddress: string) => {
    setLoading(true);
    setError('');
    setTokenInfo(null);
    setManualMode(false);

    try {
      const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
      const contract = new StellarSdk.Contract(contractAddress);
      
      const tempKeypair = StellarSdk.Keypair.random();
      const tempAccount = new StellarSdk.Account(tempKeypair.publicKey(), '0');

      // Fetch symbol
      const symbolTx = new StellarSdk.TransactionBuilder(tempAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('symbol'))
        .setTimeout(30)
        .build();

      const symbolResult = await server.simulateTransaction(symbolTx);

      // Fetch name
      const nameTx = new StellarSdk.TransactionBuilder(tempAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('name'))
        .setTimeout(30)
        .build();

      const nameResult = await server.simulateTransaction(nameTx);

      // Fetch decimals
      const decimalsTx = new StellarSdk.TransactionBuilder(tempAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('decimals'))
        .setTimeout(30)
        .build();

      const decimalsResult = await server.simulateTransaction(decimalsTx);

      // Parse results
      let symbol = 'UNKNOWN';
      let name = 'Unknown Token';
      let decimals = 7;

      if (StellarSdk.rpc.Api.isSimulationSuccess(symbolResult) && symbolResult.result?.retval) {
        const val = StellarSdk.scValToNative(symbolResult.result.retval);
        symbol = typeof val === 'string' ? val : String(val);
      }

      if (StellarSdk.rpc.Api.isSimulationSuccess(nameResult) && nameResult.result?.retval) {
        const val = StellarSdk.scValToNative(nameResult.result.retval);
        name = typeof val === 'string' ? val : String(val);
      }

      if (StellarSdk.rpc.Api.isSimulationSuccess(decimalsResult) && decimalsResult.result?.retval) {
        const val = StellarSdk.scValToNative(decimalsResult.result.retval);
        decimals = typeof val === 'number' ? val : Number(val);
      }

      setTokenInfo({ symbol, name, decimals });
    } catch (err: any) {
      console.error('Error fetching token info:', err);
      setError('Could not auto-detect token info. Enter manually.');
      setManualMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!address || address.length !== 56) {
      setError('Please enter a valid 56-character contract address');
      return;
    }

    if (manualMode) {
      if (!manualSymbol) {
        setError('Please enter a symbol');
        return;
      }
      onAddToken({
        address,
        symbol: manualSymbol.toUpperCase(),
        name: manualName || manualSymbol,
        decimals: manualDecimals,
      });
    } else if (tokenInfo) {
      onAddToken({
        address,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        decimals: tokenInfo.decimals,
      });
    } else {
      setError('Please wait for token info to load or enter manually');
      return;
    }

    setAddress('');
    setTokenInfo(null);
    setManualSymbol('');
    setManualName('');
    setManualDecimals(7);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12131a] rounded-2xl border border-gray-700 w-full max-w-md">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold">Add Custom Token</h3>
          <p className="text-gray-400 text-sm mt-1">Enter the contract address to auto-detect token info</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Contract Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              placeholder="CXXXX...XXXX"
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none font-mono text-sm"
            />
          </div>

          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="animate-spin w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              <span className="text-blue-400">Detecting token info...</span>
            </div>
          )}

          {tokenInfo && !loading && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-400 font-medium">Token Detected!</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Symbol</p>
                  <p className="font-bold text-lg">{tokenInfo.symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Name</p>
                  <p className="font-medium text-sm truncate">{tokenInfo.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Decimals</p>
                  <p className="font-bold text-lg">{tokenInfo.decimals}</p>
                </div>
              </div>
            </div>
          )}

          {manualMode && !loading && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-yellow-400 text-sm">Auto-detection failed. Please enter token info manually.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Symbol *</label>
                  <input
                    type="text"
                    value={manualSymbol}
                    onChange={(e) => setManualSymbol(e.target.value.toUpperCase())}
                    placeholder="TOKEN"
                    maxLength={12}
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Decimals</label>
                  <input
                    type="number"
                    value={manualDecimals}
                    onChange={(e) => setManualDecimals(parseInt(e.target.value) || 7)}
                    min={0}
                    max={18}
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Token Name</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="My Token"
                  className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {tokenInfo && !manualMode && (
            <button
              onClick={() => setManualMode(true)}
              className="text-sm text-gray-500 hover:text-gray-300 transition"
            >
              Edit manually instead
            </button>
          )}

          {error && !manualMode && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button 
            onClick={() => {
              setAddress('');
              setTokenInfo(null);
              setError('');
              setManualMode(false);
              onClose();
            }} 
            className="flex-1 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (!tokenInfo && !manualMode) || (manualMode && !manualSymbol)}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            Add Token
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTokenModal;
