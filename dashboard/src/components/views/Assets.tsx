import React from 'react';
import { TokenBalance } from '../../types';
import { formatAmount, formatUSD, truncateAddress } from '../../lib/stellar';

interface AssetsProps {
  vaultBalance: TokenBalance[];
  remainingSpend: bigint | null;
  isSigner: boolean;
  onDeposit: () => void;
}

export const Assets: React.FC<AssetsProps> = ({
  vaultBalance,
  remainingSpend,
  isSigner,
  onDeposit,
}) => {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
        <div className="p-6 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold">Vault Assets</h2>
        </div>

        <div className="p-6">
          {vaultBalance.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No assets in vault</p>
              {isSigner && (
                <button
                  onClick={onDeposit}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Deposit your first asset →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {vaultBalance.map((token) => (
                <div
                  key={token.address}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold">{token.symbol}</p>
                      <p className="text-sm text-gray-400">{truncateAddress(token.address)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatAmount(token.balance, token.decimals)}</p>
                    <p className="text-sm text-gray-400">{formatUSD(token.balance)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {remainingSpend !== null && (
        <div className="rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold mb-4">Daily Spend Limit</h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Remaining today</span>
            <span className="text-xl font-bold">{formatAmount(remainingSpend)} XLM</span>
          </div>
        </div>
      )}
    </div>
  );
};
