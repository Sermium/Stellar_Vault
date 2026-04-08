import React, { useState, useEffect, useCallback } from 'react';

interface LandingPageProps {
  loading: boolean;
  error: string | null;
  onConnect: () => void;
  onDismissError: () => void;
}

const features = [
  {
    icon: '🔐',
    title: 'Multi-Signature Security',
    description: 'Require multiple approvals for transactions. Set custom thresholds like 2-of-3 or 3-of-5 to ensure no single point of failure.',
  },
  {
    icon: '⏰',
    title: 'Time-Locked Assets',
    description: 'Lock tokens until a specific date. Perfect for savings goals, escrow arrangements, or preventing impulsive decisions.',
  },
  {
    icon: '📈',
    title: 'Vesting Schedules',
    description: 'Create vesting schedules with cliff periods for team tokens, investor allocations, or gradual fund release over time.',
  },
  {
    icon: '💰',
    title: 'Spend Limits',
    description: 'Set daily spending limits per asset. Transactions exceeding limits require additional approvals for extra security.',
  },
  {
    icon: '👥',
    title: 'Role-Based Access',
    description: 'Assign SuperAdmin, Admin, or Executor roles to team members. Control who can propose, approve, or execute transactions.',
  },
  {
    icon: '🌍',
    title: 'Public Claim Access',
    description: 'Beneficiaries can claim their vested or unlocked tokens directly via a public link—no wallet connection to your vault required.',
  },
  {
    icon: '🔗',
    title: 'Public Sharing',
    description: 'Share a read-only public view of your vault with anyone. Perfect for transparency, audits, or investor reporting.',
  },
  {
    icon: '💎',
    title: 'Multi-Asset Support',
    description: 'Manage XLM, USDC, EURC, and any Stellar token in one vault. Full control over all your digital assets.',
  },
];

const stats = [
  { value: '100%', label: 'On-Chain' },
  { value: 'Soroban', label: 'Powered' },
  { value: 'Multi-Sig', label: 'Security' },
  { value: 'Open', label: 'Source' },
];

const wallets = [
  { name: 'Freighter', icon: '🦊', description: 'Browser extension', recommended: true },
  { name: 'xBull', icon: '🐂', description: 'Mobile & Desktop' },
  { name: 'Albedo', icon: '🌟', description: 'Web-based signer' },
  { name: 'LOBSTR', icon: '🦞', description: 'Mobile wallet' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  loading,
  error,
  onConnect,
  onDismissError,
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div 
      className="min-h-screen bg-[#060a12] text-white overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-[800px] h-[800px] rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 70%)',
            left: mousePosition.x - 400,
            top: mousePosition.y - 400,
            transition: 'left 0.3s ease-out, top 0.3s ease-out',
          }}
        />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logovault.png" alt="Orion Safe" className="w-10 h-10 rounded-xl" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="text-xl font-bold">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">Orion</span>
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent ml-1">Safe</span>
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-cyan-400 transition">Features</a>
            <a href="#locks" className="text-gray-400 hover:text-cyan-400 transition">Locks & Vesting</a>
            <a href="#public" className="text-gray-400 hover:text-cyan-400 transition">Public Access</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition">GitHub</a>
            <a href="https://docs.stellar.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition">Docs</a>
          </nav>

          <button
            onClick={onConnect}
            disabled={loading}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg font-medium transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div 
            className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm mb-8">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              Built on Stellar Soroban
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 bg-clip-text text-transparent">
                Secure Multi-Sig
              </span>
              <br />
              <span className="text-white">Treasury Management</span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Protect your digital assets with multi-signature security, time locks, vesting schedules, 
              and granular access controls. Your keys, your rules, complete transparency.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={onConnect}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-semibold text-lg transition shadow-xl shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Launch App
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
              <a
                href="#features"
                className="px-8 py-4 border border-gray-700 hover:border-cyan-500/50 hover:bg-cyan-500/5 rounded-xl font-semibold text-lg transition"
              >
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div 
                  key={index}
                  className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-gray-500 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Everything you need to manage your treasury securely and transparently
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 bg-gray-900/50 border border-gray-800 hover:border-cyan-500/50 rounded-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-cyan-400 transition">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Locks & Vesting Section */}
      <section id="locks" className="relative z-10 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm mb-4">
                ⏰ Time Controls
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Locks & Vesting
                </span>
              </h2>
              <p className="text-gray-400 mb-6">
                Take control of when and how your assets become available. Whether you're managing team tokens, 
                investor allocations, or personal savings—our time-based controls have you covered.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Time Locks</strong>
                    <p className="text-gray-500 text-sm">Lock tokens until a specific date. Perfect for escrow, savings goals, or commitment devices.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Vesting Schedules</strong>
                    <p className="text-gray-500 text-sm">Create linear vesting with cliff periods. Tokens unlock gradually over time.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Batch Creation</strong>
                    <p className="text-gray-500 text-sm">Create up to 50 locks at once via CSV upload. Ideal for team token distributions.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Admin Controls</strong>
                    <p className="text-gray-500 text-sm">Admins can cancel locks if needed, returning funds to the vault.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400">⏰</div>
                    <div>
                      <div className="font-medium">Team Allocation</div>
                      <div className="text-sm text-gray-500">1,000,000 XLM</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 text-sm">Vesting</div>
                    <div className="text-xs text-gray-500">12 months</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">🔒</div>
                    <div>
                      <div className="font-medium">Escrow Deposit</div>
                      <div className="text-sm text-gray-500">50,000 USDC</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-400 text-sm">Time Lock</div>
                    <div className="text-xs text-gray-500">Until Dec 2025</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400">📈</div>
                    <div>
                      <div className="font-medium">Advisor Tokens</div>
                      <div className="text-sm text-gray-500">250,000 XLM</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-teal-400 text-sm">Vesting</div>
                    <div className="text-xs text-gray-500">6 mo cliff + 24 mo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Access Section */}
      <section id="public" className="relative z-10 py-24 bg-gradient-to-b from-transparent via-gray-900/50 to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
              <div className="space-y-6">
                <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">🔗</div>
                    <span className="font-medium">Public Vault View</span>
                  </div>
                  <div className="text-sm text-gray-400 font-mono bg-gray-800/50 p-2 rounded break-all">
                    https://orionsafe.app/?vault=CABC...XYZ&view=public
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Anyone with this link can view vault balances, transactions, and lock status</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center text-teal-400">🎁</div>
                    <span className="font-medium">Claim Link</span>
                  </div>
                  <div className="text-sm text-gray-400 font-mono bg-gray-800/50 p-2 rounded break-all">
                    https://orionsafe.app/?vault=CABC...XYZ&view=claim
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Beneficiaries can claim their vested/unlocked tokens directly</p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-400 text-sm mb-4">
                🌍 Transparency
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  Public Access & Sharing
                </span>
              </h2>
              <p className="text-gray-400 mb-6">
                Orion Safe is built for transparency. Share your vault with stakeholders, enable beneficiaries 
                to claim directly, and maintain complete auditability.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Public Vault View</strong>
                    <p className="text-gray-500 text-sm">Share a read-only link for investors, auditors, or anyone who needs visibility into your vault.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Direct Claim Access</strong>
                    <p className="text-gray-500 text-sm">Beneficiaries connect their own wallet and claim unlocked tokens—no vault access needed.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">Complete Audit Trail</strong>
                    <p className="text-gray-500 text-sm">All transactions, approvals, and claims are recorded on-chain for full transparency.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-teal-400 mt-1">✓</span>
                  <div>
                    <strong className="text-white">No Trust Required</strong>
                    <p className="text-gray-500 text-sm">Everything is verifiable on the Stellar blockchain. Don't trust—verify.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Wallets Section */}
      <section className="relative z-10 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Supported Wallets
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Connect with your favorite Stellar wallet
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {wallets.map((wallet, index) => (
              <div
                key={index}
                className={`relative p-6 bg-gray-900/50 border rounded-xl text-center transition-all hover:-translate-y-1 ${
                  wallet.recommended ? 'border-cyan-500/50' : 'border-gray-800 hover:border-cyan-500/30'
                }`}
              >
                {wallet.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-500 text-xs font-medium rounded-full">
                    Recommended
                  </div>
                )}
                <div className="text-4xl mb-3">{wallet.icon}</div>
                <h3 className="font-semibold mb-1">{wallet.name}</h3>
                <p className="text-gray-500 text-sm">{wallet.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="p-12 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-teal-500/10 border border-cyan-500/20 rounded-3xl backdrop-blur">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Secure Your Assets?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Create your first vault in minutes. Multi-sig security, time locks, vesting—all on Stellar.
            </p>
            <button
              onClick={onConnect}
              disabled={loading}
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl font-semibold text-lg transition shadow-xl shadow-cyan-500/20 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Get Started Free'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logovault.png" alt="Orion Safe" className="w-8 h-8 rounded-lg" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <span className="font-bold">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">Orion</span>
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent ml-1">Safe</span>
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              Built with Soroban on Stellar. Open source and free to use.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition">
                GitHub
              </a>
              <a href="https://docs.stellar.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-cyan-400 transition">
                Docs
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur">
            <span className="text-red-400">{error}</span>
            <button onClick={onDismissError} className="text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
