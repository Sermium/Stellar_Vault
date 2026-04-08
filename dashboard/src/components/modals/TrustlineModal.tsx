import React, { useState, useEffect } from 'react';
import { SUPPORTED_TOKENS } from '../../config';
import { hasTrustline, ensureTrustline, isSACToken } from '../../lib/stellar';
import { TokenIcon } from '../common/TokenIcon';

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
  issuer: string | null;
  isSAC: boolean;
  hasTrustline: boolean;
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
        issuer: token.issuer || null,
        isSAC,
        hasTrustline: hasTrust,
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
      
      if (updatedTokens.filter(t => t.isSAC).every(t => t.hasTrustline)) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create trustline');
    } finally {
      setCreatingTrustline(null);
    }
  };

  if (!isOpen) return null;

  const sacTokens = tokens.filter(t => t.isSAC);
  const missingTrustlines = sacTokens.filter(t => !t.hasTrustline);
  const allAuthorized = missingTrustlines.length === 0 && !loading;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#12131a] rounded-2xl border border-gray-700 w-full max-w-md">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Authorize Tokens</h3>
            <p className="text-gray-400 text-sm mt-1">Enable tokens for your vault</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {sacTokens.map((token) => (
                <div
                  key={token.address}
                  className={`p-4 rounded-xl border ${
                    token.hasTrustline
                      ? 'bg-green-500/5 border-green-500/30'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={token.symbol} size="w-10 h-10" />
                      <div>
                        <p className="font-semibold">{token.symbol}</p>
                        <p className="text-sm text-gray-400">{token.name}</p>
                      </div>
                    </div>

                    {token.hasTrustline ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Ready
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCreateTrustline(token)}
                        disabled={creatingTrustline === token.address}
                        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition text-sm font-medium disabled:opacity-50"
                      >
                        {creatingTrustline === token.address ? 'Adding...' : 'Authorize'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {allAuthorized && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
              <p className="text-green-400 font-medium">All tokens authorized!</p>
            </div>
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
