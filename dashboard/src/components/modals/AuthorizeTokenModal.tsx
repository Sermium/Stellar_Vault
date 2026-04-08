import React, { useState, useEffect } from 'react';
import { SUPPORTED_TOKENS } from '../../config';
import { hasTrustline, ensureTrustline, isSACToken } from '../../lib/stellar';

interface TrustlineModalProps {
  isOpen: boolean;
  userAddress: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface TokenTrustStatus {
  address: string;
  symbol: string;
  name: string;
  color: string;
  issuer: string | null;
  isSAC: boolean;
  hasTrustline: boolean;
  loading: boolean;
}

const TokenIcon: React.FC<{ symbol: string; size?: string }> = ({ symbol, size = 'w-10 h-10' }) => {
  const colors: Record<string, string> = {
    'XLM': 'from-blue-400 to-cyan-400',
    'USDC': 'from-blue-500 to-blue-600',
    'EURC': 'from-blue-700 to-indigo-600',
  };
  const gradient = colors[symbol] || 'from-purple-500 to-blue-500';
  
  return (
    <div className={`${size} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold`}>
      {symbol.charAt(0)}
    </div>
  );
};

export const TrustlineModal: React.FC<TrustlineModalProps> = ({
  isOpen,
  userAddress,
  onClose,
  onSuccess,
}) => {
  const [tokens, setTokens] = useState<TokenTrustStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTrustline, setCreatingTrustline] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && userAddress) {
      checkAllTrustlines();
    }
  }, [isOpen, userAddress]);

  const checkAllTrustlines = async () => {
    if (!userAddress) return;

    setLoading(true);
    const tokenStatuses: TokenTrustStatus[] = [];

    for (const token of SUPPORTED_TOKENS) {
      if (token.isNative) continue;

      const isSAC = token.isSAC !== undefined ? token.isSAC : await isSACToken(token.address);
      
      let hasTrust = true;
      if (isSAC) {
        hasTrust = await hasTrustline(userAddress, token.address);
      }

      tokenStatuses.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        color: token.color || '#8B5CF6',
        issuer: token.issuer || null,
        isSAC,
        hasTrustline: hasTrust,
        loading: false,
      });
    }

    setTokens(tokenStatuses);
    setLoading(false);
  };

  const handleCreateTrustline = async (token: TokenTrustStatus) => {
    if (!userAddress || !token.issuer) return;

    setCreatingTrustline(token.address);
    setError('');

    try {
      await ensureTrustline(userAddress, token.address, token.symbol, token.issuer);
      
      setTokens(prev => prev.map(t => 
        t.address === token.address 
          ? { ...t, hasTrustline: true }
          : t
      ));

      const updatedTokens = tokens.map(t => 
        t.address === token.address ? { ...t, hasTrustline: true } : t
      );
      
      const sacTokens = updatedTokens.filter(t => t.isSAC);
      if (sacTokens.every(t => t.hasTrustline)) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create trustline');
    } finally {
      setCreatingTrustline(null);
    }
  };

  const handleCreateAll = async () => {
    for (const token of tokens) {
      if (token.isSAC && !token.hasTrustline) {
        await handleCreateTrustline(token);
      }
    }
  };

  if (!isOpen) return null;

  const sacTokens = tokens.filter(t => t.isSAC);
  const sorobanTokens = tokens.filter(t => !t.isSAC);
  const missingTrustlines = sacTokens.filter(t => !t.hasTrustline);
  const allAuthorized = missingTrustlines.length === 0 && !loading;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12131a] rounded-2xl border border-gray-700 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Manage Tokens</h3>
            <p className="text-gray-400 text-sm mt-1">
              Authorize tokens to receive them in your vault
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              {/* Token List */}
              <div className="space-y-3">
                {sacTokens.map((token) => (
                  <div
                    key={token.address}
                    className={`p-4 rounded-xl border transition ${
                      token.hasTrustline
                        ? 'bg-green-500/5 border-green-500/30'
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={token.symbol} />
                        <div>
                          <p className="font-semibold">{token.symbol}</p>
                          <p className="text-sm text-gray-400">{token.name}</p>
                        </div>
                      </div>

                      {token.hasTrustline ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-medium">Ready</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCreateTrustline(token)}
                          disabled={creatingTrustline === token.address}
                          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                          {creatingTrustline === token.address ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                              Adding...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Authorize All Button */}
              {missingTrustlines.length > 1 && (
                <button
                  onClick={handleCreateAll}
                  disabled={!!creatingTrustline}
                  className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add All Tokens ({missingTrustlines.length})
                </button>
              )}

              {allAuthorized && (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-green-400 font-medium">All tokens ready!</p>
                  <p className="text-sm text-gray-400 mt-1">
                    You can now receive and send all supported tokens.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
