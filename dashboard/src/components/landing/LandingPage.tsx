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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    {
      icon: '🛡️',
      title: 'Multi-Signature Security',
      description: 'Require multiple approvals for transactions with customizable thresholds',
    },
    {
      icon: '⏰',
      title: 'Time-Locked Assets',
      description: 'Create vesting schedules and time-locked token releases',
    },
    {
      icon: '📊',
      title: 'Spend Limits',
      description: 'Set daily, weekly, or monthly spending limits for enhanced control',
    },
    {
      icon: '👥',
      title: 'Role-Based Access',
      description: 'Assign Admin, Executor, or Viewer roles to team members',
    },
    {
      icon: '🔗',
      title: 'Multi-Asset Support',
      description: 'Manage XLM and any Stellar asset in one secure vault',
    },
    {
      icon: '📱',
      title: 'Public Sharing',
      description: 'Share read-only vault views for transparency and auditing',
    },
  ];

  const stats = [
    { value: '100%', label: 'On-Chain' },
    { value: 'Soroban', label: 'Powered' },
    { value: 'Multi-Sig', label: 'Security' },
    { value: 'Open', label: 'Source' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b0f] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-20 blur-[120px] transition-transform duration-1000"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
            left: mousePosition.x / 20 - 400,
            top: mousePosition.y / 20 - 400,
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
            right: '-200px',
            top: '20%',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-[80px]"
          style={{
            background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
            left: '10%',
            bottom: '-100px',
          }}
        />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-500/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-4">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <span className="text-xl">🔐</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Stellar Vault
            </span>
          </div>
          <div className="flex items-center space-x-6">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">
              GitHub
            </a>
            <a href="https://docs.stellar.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">
              Docs
            </a>
            <button
              onClick={onConnect}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium transition-all hover:scale-105"
            >
              Connect
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className={`max-w-7xl mx-auto px-6 pt-20 pb-32 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-8">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm text-purple-300">Live on Stellar Testnet</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                Secure Multi-Sig
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Treasury Management
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              The most advanced multi-signature vault on Stellar. Protect your assets with 
              customizable approval thresholds, time locks, vesting schedules, and role-based access control.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={onConnect}
                disabled={loading}
                className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 transition-all duration-300 font-semibold text-lg shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 w-full sm:w-auto"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Launch App
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
              </button>
              <a
                href="#features"
                className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 font-semibold text-lg w-full sm:w-auto text-center"
              >
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={`text-center transition-all duration-500 delay-${index * 100}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="relative py-24 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Enterprise-Grade Security
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Built on Soroban smart contracts with battle-tested security patterns
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="text-2xl">{feature.icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-purple-300 transition-colors">
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

        {/* Wallets Section */}
        <section className="relative py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Connect Your Favorite Wallet
              </h2>
              <p className="text-gray-400">
                Seamless integration with all major Stellar wallets
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-8">
              {[
                { name: 'Freighter', icon: '🚀', color: 'from-purple-500 to-indigo-500' },
                { name: 'xBull', icon: '🐂', color: 'from-orange-500 to-red-500' },
                { name: 'Albedo', icon: '🌟', color: 'from-blue-500 to-cyan-500' },
                { name: 'LOBSTR', icon: '🦞', color: 'from-red-500 to-pink-500' },
              ].map((wallet, index) => (
                <div
                  key={index}
                  className="group flex flex-col items-center p-6 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/20 transition-all duration-300 cursor-pointer hover:scale-105"
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${wallet.color} flex items-center justify-center mb-3 shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <span className="text-3xl">{wallet.icon}</span>
                  </div>
                  <span className="text-gray-300 font-medium">{wallet.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24">
          <div className="max-w-4xl mx-auto px-6">
            <div className="relative rounded-3xl bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/20 p-12 text-center overflow-hidden">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-3xl"></div>
              
              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Secure Your Assets?
                </h2>
                <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                  Create your first multi-signature vault in minutes. No coding required.
                </p>
                <button
                  onClick={onConnect}
                  disabled={loading}
                  className="px-8 py-4 rounded-xl bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 transition-all duration-300 font-semibold text-lg shadow-xl hover:scale-105"
                >
                  {loading ? 'Connecting...' : 'Get Started Free'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <span className="text-sm">🔐</span>
              </div>
              <span className="text-gray-400">Stellar Vault</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>Built on Stellar & Soroban</span>
              <span>•</span>
              <span>Open Source</span>
              <span>•</span>
              <span>2024</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-slide-up">
          <div className="p-4 rounded-xl bg-red-500/10 backdrop-blur-xl border border-red-500/20 text-red-400 flex items-center gap-3 shadow-xl">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm flex-1">{error}</span>
            <button 
              onClick={onDismissError} 
              className="p-1 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Custom styles for animations */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};