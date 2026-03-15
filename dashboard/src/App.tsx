import React, { useState } from 'react';
import { useStellarVault } from './hooks/useStellarVault';
import { ActiveView } from './types';
import { Admin } from './components/views/Admin';
import { FACTORY_CONTRACT_ID } from './config';
import { getFactoryConfig } from './services/factoryService';
// Components
import { LandingPage } from './components/landing/LandingPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/views/Dashboard';
import { Assets } from './components/views/Assets';
import { Transactions } from './components/views/Transactions';
import { Members } from './components/views/Members';
import { Settings } from './components/views/Settings';
import { Contacts } from './components/views/Contacts';
import { NewTransactionModal } from './components/modals/NewTransactionModal';
import { DepositModal } from './components/modals/DepositModal';
import { CreateVaultModal } from './components/CreateVaultModal';
import { XIcon } from './components/icons';
import { getVaultsByOwner, getVaultInfo, VaultInfo } from './services/factoryService';

function App() {
  const vault = useStellarVault();
  const [isFactoryAdmin, setIsFactoryAdmin] = useState(false);

  // UI state
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showCreateVaultModal, setShowCreateVaultModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Vault selection state
  const [userVaults, setUserVaults] = useState<VaultInfo[]>([]);
  const [loadingVaults, setLoadingVaults] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load user's vaults when connected
  React.useEffect(() => {
    if (vault.connected && vault.publicKey) {
      loadUserVaults();
    }
  }, [vault.connected, vault.publicKey]);

  const loadUserVaults = async () => {
    if (!vault.publicKey) return;
    
    setLoadingVaults(true);
    try {
      const vaultAddresses = await getVaultsByOwner(vault.publicKey);
      const vaultInfos: VaultInfo[] = [];
      
      for (const addr of vaultAddresses) {
        const info = await getVaultInfo(addr);
        if (info) {
          vaultInfos.push(info);
        }
      }
      
      setUserVaults(vaultInfos);
      
      // Auto-select first vault if available and none selected
      if (vaultInfos.length > 0 && !vault.vaultAddress) {
        vault.selectVault(vaultInfos[0].vault_address);
      }
    } catch (err) {
      console.error('Failed to load vaults:', err);
    } finally {
      setLoadingVaults(false);
    }
  };

  React.useEffect(() => {
    const checkFactoryAdmin = async () => {
      if (!vault.publicKey) {
        setIsFactoryAdmin(false);
        return;
      }
      try {
        const config = await getFactoryConfig();
        setIsFactoryAdmin(config?.admin === vault.publicKey);
      } catch {
        setIsFactoryAdmin(false);
      }
    };
    checkFactoryAdmin();
  }, [vault.publicKey]);

  const handleVaultCreated = async () => {
    await loadUserVaults();
    setShowCreateVaultModal(false);
  };

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

  // Get current vault info for display
  const currentVaultInfo = userVaults.find(v => v.vault_address === vault.vaultAddress);
  const hasVaults = userVaults.length > 0;
  const hasSelectedVault = !!vault.vaultAddress;

  // Main app
  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        activeView={activeView}
        vaultConfig={vault.vaultConfig}
        vaultAddress={vault.vaultAddress}
        userVaults={userVaults}
        isInitialized={vault.isInitialized}
        publicKey={vault.publicKey}
        isSigner={vault.isSigner}
        userRole={vault.userRole || undefined}
        isFactoryAdmin={isFactoryAdmin}
        pendingCount={vault.pendingCount}
        approvedCount={vault.approvedCount}
        onViewChange={setActiveView}
        onCopy={copyToClipboard}
        onDisconnect={vault.disconnectWallet}
        onSelectVault={(address) => vault.selectVault(address)}
        onCreateVault={() => setShowCreateVaultModal(true)}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Header
          activeView={activeView}
          loading={vault.loading || loadingVaults}
          sidebarCollapsed={sidebarCollapsed}
          isSigner={vault.isSigner}
          isInitialized={vault.isInitialized && hasSelectedVault}
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

          {/* No Vault State - Show Create Vault CTA */}
          {!hasSelectedVault && !loadingVaults && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                  <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-3">Welcome to Stellar Vault</h2>
                <p className="text-gray-400 mb-8">
                  {hasVaults 
                    ? 'Select a vault from the sidebar or create a new one to get started.'
                    : 'Create your first multi-signature vault to securely manage your assets with multiple approvers.'}
                </p>
                <button
                  onClick={() => setShowCreateVaultModal(true)}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-3 mx-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Vault
                </button>

                {hasVaults && (
                  <p className="text-sm text-gray-500 mt-6">
                    Or select an existing vault from the sidebar
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loadingVaults && !hasSelectedVault && (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-gray-400">Loading your vaults...</p>
            </div>
          )}

          {/* Vault Selected - Show Normal Views */}
          {hasSelectedVault && (
            <>
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
                  vaultAddress={vault.vaultAddress}
                  vaultBalance={vault.vaultBalance}
                  remainingSpend={vault.remainingSpend}
                  isSigner={vault.isSigner}
                  userRole={vault.userRole || undefined}
                  onDeposit={() => setShowDepositModal(true)}
                  onRefresh={vault.loadVaultData}
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
                  signersWithRoles={vault.signersWithRoles}
                  vaultConfig={vault.vaultConfig}
                  publicKey={vault.publicKey}
                  userRole={vault.userRole || undefined}
                  onCopy={copyToClipboard}
                  onAddSigner={vault.addSigner}
                  onRemoveSigner={vault.removeSigner}
                  onSetRole={vault.setMemberRole}
                  onSetThreshold={vault.setThreshold}
                />
              )}

              {activeView === 'contacts' && (
                <Contacts onCopy={copyToClipboard} />
              )}

              {activeView === 'admin' && isFactoryAdmin &&  (
                <Admin
                  publicKey={vault.publicKey}
                  onCopy={copyToClipboard}
                />
              )}

              {activeView === 'settings' && (
                  <Settings
                    vaultAddress={vault.vaultAddress}
                    vaultConfig={vault.vaultConfig}
                    signers={vault.signers}
                    signersWithRoles={vault.signersWithRoles}
                    userRole={vault.userRole || undefined}
                    publicKey={vault.publicKey}
                    onCopy={copyToClipboard}
                    onAddSigner={vault.addSigner}
                    onRemoveSigner={vault.removeSigner}
                    onSetRole={vault.setMemberRole}
                    onSetThreshold={vault.setThreshold}
                  />
                )}
            </>
          )}

          {/* Contacts view is available even without vault */}
          {!hasSelectedVault && activeView === 'contacts' && (
            <Contacts onCopy={copyToClipboard} />
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

      <CreateVaultModal
        isOpen={showCreateVaultModal}
        onClose={() => setShowCreateVaultModal(false)}
        userAddress={vault.publicKey || ''}
        onVaultCreated={handleVaultCreated}
      />

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
