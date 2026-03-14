import React from 'react';
import { StellarLogo, WalletIcon, ShieldIcon, ClockIcon, UsersIcon, ExternalLinkIcon, XIcon } from '../icons';
import { CONTRACT_ID } from '../../config/constants';

interface LandingPageProps {
  freighterInstalled: boolean | null;
  loading: boolean;
  error: string | null;
  onConnect: () => void;
  onDismissError: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  freighterInstalled,
  loading,
  error,
  onConnect,
  onDismissError,
}) => {
  const features = [
    {
      icon: <ShieldIcon />,
      title: 'Multi-Signature Security',
      description: 'Require multiple approvals before any transaction executes. Protect against single points of failure.',
    },
    {
      icon: <ClockIcon />,
      title: 'Spending Limits',
      description: 'Set daily spending limits to control outflows. Automatic resets every 24 hours.',
    },
    {
      icon: <UsersIcon />,
      title: 'Team Management',
      description: 'Add or remove signers as your team evolves. Flexible threshold configurations.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StellarLogo className="w-10 h-10" />
            <span className="text-xl font-bold">Stellar Vault</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
              Docs
            </a>
            <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition">
              Explorer
            </a>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10 px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-8">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            Built on Stellar Network
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Multi-signature
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Treasury Management
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            The most secure way to manage your organization's digital assets on Stellar.
            Multi-sig protection, spending limits, and complete transparency.
          </p>

          {freighterInstalled === false ? (
            <div className="space-y-4">
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-semibold text-lg transition-all transform hover:scale-105"
              >
                Install Freighter Wallet
                <ExternalLinkIcon />
              </a>
              <p className="text-gray-500 text-sm">Required to interact with Stellar</p>
            </div>
          ) : (
            <button
              onClick={onConnect}
              disabled={loading}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 rounded-xl font-semibold text-lg transition-all transform hover:scale-105"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <WalletIcon />
                  Connect Wallet
                </>
              )}
            </button>
          )}
        </div>

        {/* Features */}
        <div className="max-w-6xl mx-auto mt-32 grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-gradient-to-b from-gray-800/50 to-gray-900/50 border border-gray-700/50 hover:border-cyan-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <StellarLogo className="w-6 h-6" />
            <span>Stellar Vault • Testnet</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
              Stellar.org
            </a>
            <a href="https://soroban.stellar.org" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
              Soroban Docs
            </a>
          </div>
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
          {error}
          <button onClick={onDismissError}><XIcon /></button>
        </div>
      )}
    </div>
  );
};
