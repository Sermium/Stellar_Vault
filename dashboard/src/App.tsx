import React, { useState } from 'react';
import { useStellarVault } from './hooks/useStellarVault';
import { ActiveView } from './types';
import { NATIVE_TOKEN } from './config/constants';

// Components
import { LandingPage } from './components/landing/LandingPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/views/Dashboard';
import { Assets } from './components/views/Assets';
import { Transactions } from './components/views/Transactions';
import { Members } from './components/views/Members';
import { Settings } from './components/views/Settings';
import { InitializeModal } from './components/modals/InitializeModal';
import { NewTransactionModal } from './components/modals/NewTransactionModal';
import { DepositModal } from './components/modals/DepositModal';
import { XIcon } from './components/icons';

function App() {
  const vault = useStellarVault();

  // UI state
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showInitModal, setShowInitModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show init modal when vault is not initialized
  React.useEffect(() => {
    if (vault.connected && !vault.isInitialized && !vault.loading) {
      setShowInitModal(true);
    }
  }, [vault.connected, vault.isInitialized, vault.loading]);

  // Landing page for non-connected users
  if (!vault.connected) {
    return (
      <LandingPage
        freighterInstalled={vault.freighterInstalled}
        loading={vault.loading}
        error={vault.error}
        onConnect={vault.connectWallet}
        onDismissError={() => vault.setError(null)}
      />
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        activeView={activeView}
        vaultConfig={vault.vaultConfig}
        isInitialized={vault.isInitialized}
        publicKey={vault.publicKey}
        isSigner={vault.isSigner}
        pendingCount={vault.pendingCount}
        approvedCount={vault.approvedCount}
        onViewChange={setActiveView}
        onCopy={copyToClipboard}
        onDisconnect={vault.disconnectWallet}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Header
          activeView={activeView}
          loading={vault.loading}
          sidebarCollapsed={sidebarCollapsed}
          isSigner={vault.isSigner}
          isInitialized={vault.isInitialized}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onRefresh={vault.loadVaultData}
          onDeposit={() => setShowDepositModal(true)}
          onNewTransaction={() => setShowNewTxModal(true)}
        />

        <div className="flex-1 overflow-auto p-6">
          {/* Toast Messages */}
          {(vault.error || vault.success) && (
            <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
              vault.error ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'
            }`}>
              <span>{vault.error || vault.success}</span>
              <button onClick={() => { vault.setError(null); vault.setSuccess(null); }}>
                <XIcon />
              </button>
            </div>
          )}

          {/* Views */}
          {activeView === 'home' && (
            <Dashboard
              vaultConfig={vault.vaultConfig}
              vaultBalance={vault.vaultBalance}
              proposals={vault.proposals}
              pendingCount={vault.pendingCount}
              approvedCount={vault.approvedCount}
              isSigner={vault.isSigner}
              onViewTransactions={() => setActiveView('transactions')}
              onNewTransaction={() => setShowNewTxModal(true)}
            />
          )}

          {activeView === 'assets' && (
            <Assets
              vaultBalance={vault.vaultBalance}
              remainingSpend={vault.remainingSpend}
              isSigner={vault.isSigner}
              onDeposit={() => setShowDepositModal(true)}
            />
          )}

          {activeView === 'transactions' && (
            <Transactions
              proposals={vault.proposals}
              vaultConfig={vault.vaultConfig}
              publicKey={vault.publicKey}
              isSigner={vault.isSigner}
              loading={vault.loading}
              onApprove={vault.approve}
              onExecute={vault.execute}
            />
          )}

          {activeView === 'members' && (
            <Members
              signers={vault.signers}
              vaultConfig={vault.vaultConfig}
              publicKey={vault.publicKey}
              onCopy={copyToClipboard}
            />
          )}

          {activeView === 'settings' && (
            <Settings
              vaultConfig={vault.vaultConfig}
              onCopy={copyToClipboard}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      {showNewTxModal && (
        <NewTransactionModal
          loading={vault.loading}
          onClose={() => setShowNewTxModal(false)}
          onSubmit={(token, to, amount) => {
            vault.propose(token, to, amount);
            setShowNewTxModal(false);
          }}
        />
      )}

      {showDepositModal && (
        <DepositModal
          loading={vault.loading}
          onClose={() => setShowDepositModal(false)}
          onSubmit={(token, amount) => {
            vault.deposit(token, amount);
            setShowDepositModal(false);
          }}
        />
      )}

      {showInitModal && !vault.isInitialized && (
        <InitializeModal
          loading={vault.loading}
          publicKey={vault.publicKey}
          onClose={() => setShowInitModal(false)}
          onInitialize={(name, signers, threshold) => {
            vault.initialize(name, signers, threshold);
            setShowInitModal(false);
          }}
        />
      )}

      {/* Copy Toast */}
      {copied && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}

export default App;
