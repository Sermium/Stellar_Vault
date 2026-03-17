import React, { useState, useEffect } from 'react';
import { SUPPORTED_WALLETS, connectWallet, WalletType } from '../../services/walletService';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (publicKey: string, walletId: string) => void;
}

const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({ isOpen, onClose, onConnect }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletsAvailability, setWalletsAvailability] = useState<Record<string, boolean>>({});

  // Check wallet availability after component mounts (gives extensions time to inject)
  useEffect(() => {
    if (isOpen) {
      // Small delay to let extensions inject
      const timer = setTimeout(() => {
        const availability: Record<string, boolean> = {};
        SUPPORTED_WALLETS.forEach(wallet => {
          availability[wallet.id] = wallet.isAvailable();
        });
        setWalletsAvailability(availability);
        console.log('Wallet availability:', availability);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (walletId: WalletType) => {
    setLoading(walletId);
    setError(null);
    
    try {
      const publicKey = await connectWallet(walletId);
      onConnect(publicKey, walletId);
      onClose();
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || `Failed to connect to ${walletId}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Wallet options */}
        <div className="space-y-3">
          {SUPPORTED_WALLETS.map((wallet) => {
            const isAvailable = walletsAvailability[wallet.id] ?? wallet.isAvailable();
            const isLoading = loading === wallet.id;
            
            // Always allow clicking - will show error if not available
            return (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={loading !== null}
                className={`
                  w-full flex items-center gap-4 p-4 rounded-xl transition-all
                  bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-500 cursor-pointer
                  ${isLoading ? 'ring-2 ring-purple-500' : ''}
                  ${loading !== null && !isLoading ? 'opacity-50' : ''}
                `}
              >
                <span className="text-3xl">{wallet.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">{wallet.name}</div>
                  <div className="text-slate-400 text-sm">
                    {isAvailable ? 'Click to connect' : 'Click to connect (may need install)'}
                  </div>
                </div>
                {isLoading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent" />
                )}
                {!isAvailable && !isLoading && (
                  <span className="text-xs text-yellow-500 bg-yellow-500/20 px-2 py-1 rounded">
                    ?
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-slate-500 text-sm">
          New to Stellar? 
          <a 
            href="https://www.stellar.org/learn/intro-to-stellar" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 ml-1"
          >
            Learn more
          </a>
        </p>
      </div>
    </div>
  );
};

export default ConnectWalletModal;
