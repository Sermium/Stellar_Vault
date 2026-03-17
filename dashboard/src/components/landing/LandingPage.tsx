import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  loading: boolean;
  error: string | null;
  onConnect: () => void;
  onDismissError: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  loading,
  error,
  onConnect,
  onDismissError,
}) => {
  return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Stellar Vault</h1>
          <p className="text-gray-400">Multi-signature wallet for Stellar</p>
        </div>

        {/* Connect Button */}
        <button
          onClick={onConnect}
          disabled={loading}
          className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 transition font-medium text-lg flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <span>🔗</span>
              Connect Wallet
            </>
          )}
        </button>

        {/* Supported Wallets */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-3">Supported wallets</p>
          <div className="flex justify-center gap-4">
            <div className="text-center">
              <span className="text-2xl">🚀</span>
              <p className="text-xs text-gray-400 mt-1">Freighter</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">🐂</span>
              <p className="text-xs text-gray-400 mt-1">xBull</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">🌟</span>
              <p className="text-xs text-gray-400 mt-1">Albedo</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">🦞</span>
              <p className="text-xs text-gray-400 mt-1">LOBSTR</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex justify-between items-center">
            <span className="text-sm">{error}</span>
            <button onClick={onDismissError} className="hover:text-red-300">×</button>
          </div>
        )}
      </div>
    </div>
  );
};