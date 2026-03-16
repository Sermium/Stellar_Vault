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
  icon: string;
  issuer: string | null;
  isSAC: boolean;
  hasTrustline: boolean;
  loading: boolean;
}

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
      if (token.isNative) continue; // Skip XLM

      // Check if it's a SAC token (needs trustline)
      const isSAC = token.isSAC !== undefined ? token.isSAC : await isSACToken(token.address);
      
      let hasTrust = true;
      if (isSAC) {
        hasTrust = await hasTrustline(userAddress, token.address);
      }

      tokenStatuses.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        icon: token.icon,
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
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold">Manage Token Authorizations</h3>
          <p className="text-gray-400 text-sm mt-1">
            Some tokens require authorization before you can receive them
          </p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Explanation */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <p className="text-blue-400 text-sm">
              ℹ️ <strong>SAC tokens</strong> (like USDC, EURC) are wrapped classic Stellar assets and require trustlines. <strong>Soroban tokens</strong> don't need authorization.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              {/* SAC Tokens (Need Trustlines) */}
              {sacTokens.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Classic Assets (Require Trustline)
                  </h4>
                  <div className="space-y-3">
                    {sacTokens.map((token) => (
                      <div
                        key={token.address}
                        className={`p-4 rounded-xl border ${
                          token.hasTrustline
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-gray-800/50 border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{token.icon}</span>
                            <div>
                              <p className="font-semibold">{token.symbol}</p>
                              <p className="text-sm text-gray-400">{token.name}</p>
                            </div>
                          </div>

                          {token.hasTrustline ? (
                            <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                              ✓ Authorized
                            </span>
                          ) : (
                            <button
                              onClick={() => handleCreateTrustline(token)}
                              disabled={creatingTrustline === token.address}
                              className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition text-sm font-medium disabled:opacity-50"
                            >
                              {creatingTrustline === token.address ? (
                                <span className="flex items-center gap-2">
                                  <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                                  Authorizing...
                                </span>
                              ) : (
                                'Authorize'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Soroban Tokens (No Trustlines) */}
              {sorobanTokens.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Soroban Tokens (No Authorization Needed)
                  </h4>
                  <div className="space-y-3">
                    {sorobanTokens.map((token) => (
                      <div
                        key={token.address}
                        className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{token.icon}</span>
                            <div>
                              <p className="font-semibold">{token.symbol}</p>
                              <p className="text-sm text-gray-400">{token.name}</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                            ✓ Ready
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {/* Authorize All Button */}
          {missingTrustlines.length > 1 && (
            <button
              onClick={handleCreateAll}
              disabled={!!creatingTrustline}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition font-medium"
            >
              Authorize All ({missingTrustlines.length} tokens)
            </button>
          )}

          {allAuthorized && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
              <p className="text-green-400 font-medium">
                ✓ All tokens ready!
              </p>
              <p className="text-sm text-gray-400 mt-1">
                You can now receive and send all supported tokens.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
          >
            {allAuthorized ? 'Done' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
