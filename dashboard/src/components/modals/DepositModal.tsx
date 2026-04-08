import React, { useState, useEffect } from 'react';
import { SUPPORTED_TOKENS, NATIVE_TOKEN } from '../../config';
import { hasTrustline, ensureTrustline } from '../../lib/stellar';
import * as StellarSdk from '@stellar/stellar-sdk';
import { TokenIcon } from '../common/TokenIcon';

interface DepositModalProps {
  vaultAddress: string | null;
  userAddress: string | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (token: string, amount: string) => void;
}

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  vaultAddress,
  userAddress,
  loading,
  onClose,
  onSubmit,
}) => {
  const [selectedToken, setSelectedToken] = useState(NATIVE_TOKEN);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [checkingTrustline, setCheckingTrustline] = useState(false);
  const [needsUserTrustline, setNeedsUserTrustline] = useState(false);
  const [needsVaultTrustline, setNeedsVaultTrustline] = useState(false);
  const [creatingTrustline, setCreatingTrustline] = useState(false);
  const [userBalances, setUserBalances] = useState<TokenBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const selectedTokenInfo = SUPPORTED_TOKENS.find(t => t.address === selectedToken);
  const selectedBalance = userBalances.find(b => b.address === selectedToken);

  useEffect(() => {
    if (userAddress) {
      loadUserBalances();
    }
  }, [userAddress]);

  const loadUserBalances = async () => {
    if (!userAddress) return;
    
    setLoadingBalances(true);
    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(userAddress);
      
      const balances: TokenBalance[] = [];
      
      for (const balance of account.balances) {
        if (balance.asset_type === 'native') {
          balances.push({
            address: NATIVE_TOKEN,
            symbol: 'XLM',
            balance: balance.balance,
            decimals: 7,
          });
        } else if (balance.asset_type === 'credit_alphanum4' || balance.asset_type === 'credit_alphanum12') {
          const token = SUPPORTED_TOKENS.find(t => 
            t.symbol === balance.asset_code && t.issuer === balance.asset_issuer
          );
          if (token) {
            balances.push({
              address: token.address,
              symbol: token.symbol,
              balance: balance.balance,
              decimals: token.decimals,
            });
          }
        }
      }
      
      setUserBalances(balances);
    } catch (err) {
      console.error('Error loading user balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  };

  useEffect(() => {
    checkTrustlines();
  }, [selectedToken, vaultAddress, userAddress]);

  const checkTrustlines = async () => {
    if (!vaultAddress || !userAddress) {
      setNeedsUserTrustline(false);
      setNeedsVaultTrustline(false);
      return;
    }

    if (selectedToken === NATIVE_TOKEN || !selectedTokenInfo?.isSAC) {
      setNeedsUserTrustline(false);
      setNeedsVaultTrustline(false);
      return;
    }

    setCheckingTrustline(true);
    try {
      const [userHasTrust, vaultHasTrust] = await Promise.all([
        hasTrustline(userAddress, selectedToken),
        hasTrustline(vaultAddress, selectedToken),
      ]);
      setNeedsUserTrustline(!userHasTrust);
      setNeedsVaultTrustline(!vaultHasTrust);
    } catch (err) {
      console.error('Error checking trustlines:', err);
    } finally {
      setCheckingTrustline(false);
    }
  };

  const handleCreateUserTrustline = async () => {
    if (!userAddress || !selectedTokenInfo?.issuer) return;
    
    setCreatingTrustline(true);
    setError('');
    try {
      await ensureTrustline(userAddress, selectedToken, selectedTokenInfo.symbol, selectedTokenInfo.issuer);
      setNeedsUserTrustline(false);
      await checkTrustlines();
    } catch (err: any) {
      setError(err.message || 'Failed to create trustline');
    } finally {
      setCreatingTrustline(false);
    }
  };

  const handleSetMax = () => {
    if (selectedBalance) {
      if (selectedToken === NATIVE_TOKEN) {
        const max = Math.max(0, parseFloat(selectedBalance.balance) - 2);
        setAmount(max.toFixed(7));
      } else {
        setAmount(selectedBalance.balance);
      }
    }
  };

  const handleSubmit = () => {
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (needsUserTrustline) {
      setError('You need to authorize this token first');
      return;
    }

    if (selectedBalance && parseFloat(amount) > parseFloat(selectedBalance.balance)) {
      setError('Insufficient balance');
      return;
    }

    const decimals = selectedTokenInfo?.decimals || 7;
    const amountInStroops = (parseFloat(amount) * Math.pow(10, decimals)).toString();

    onSubmit(selectedToken, amountInStroops);
  };

  const formatBalance = (balance: string): string => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12131a] rounded-2xl border border-gray-700 w-full max-w-md">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold">Deposit to Vault</h3>
          <p className="text-gray-400 text-sm mt-1">Transfer tokens into the vault</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Token</label>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_TOKENS.map((token) => {
                const balance = userBalances.find(b => b.address === token.address);
                return (
                  <button
                    key={token.address}
                    onClick={() => setSelectedToken(token.address)}
                    className={`p-3 rounded-xl border transition flex flex-col items-center gap-1 ${
                      selectedToken === token.address
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <TokenIcon symbol={token.symbol} size="w-8 h-8" />
                    <div className="text-center">
                      <p className="font-semibold text-sm">{token.symbol}</p>
                      {loadingBalances ? (
                        <p className="text-xs text-gray-500">...</p>
                      ) : balance ? (
                        <p className="text-xs text-gray-400">{formatBalance(balance.balance)}</p>
                      ) : (
                        <p className="text-xs text-gray-600">0</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {checkingTrustline && (
            <div className="p-3 rounded-xl bg-gray-800/50 text-gray-400 text-sm flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
              Checking authorization...
            </div>
          )}

          {needsUserTrustline && !checkingTrustline && (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-400 text-sm mb-3">
                You need to authorize {selectedTokenInfo?.symbol} before you can use it
              </p>
              <button
                onClick={handleCreateUserTrustline}
                disabled={creatingTrustline}
                className="w-full px-4 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition text-sm font-medium"
              >
                {creatingTrustline ? 'Creating trustline...' : `Authorize ${selectedTokenInfo?.symbol}`}
              </button>
            </div>
          )}

          {needsVaultTrustline && !needsUserTrustline && !checkingTrustline && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-blue-400 text-sm">
                The vault needs a trustline for {selectedTokenInfo?.symbol}. This will be created with the deposit.
              </p>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-400">
                Amount ({selectedTokenInfo?.symbol})
              </label>
              {selectedBalance && (
                <button
                  onClick={handleSetMax}
                  className="text-xs text-purple-400 hover:text-purple-300 transition"
                >
                  Max: {formatBalance(selectedBalance.balance)}
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.0000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none text-xl font-bold"
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <p className="text-sm text-gray-400">You will deposit</p>
              <p className="text-xl font-bold mt-1 text-green-400">
                +{amount} {selectedTokenInfo?.symbol}
              </p>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || needsUserTrustline || checkingTrustline}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 transition font-medium"
          >
            {loading ? 'Depositing...' : 'Deposit'}
          </button>
        </div>
      </div>
    </div>
  );
};
