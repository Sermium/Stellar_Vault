import React, { useState, useEffect } from 'react';
import { useStellarVault } from './hooks/useStellarVault';
import { ActiveView } from './types';
import { Admin } from './components/views/Admin';
import { getFactoryConfig } from './services/factoryService';
import { initConfig } from './config';
import { supabase } from './lib/supabase';
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
import Locks from './components/views/Locks';
import Vesting from './components/views/Vesting';
import { NewTransactionModal } from './components/modals/NewTransactionModal';
import { DepositModal } from './components/modals/DepositModal';
import CreateVaultModal from './components/CreateVaultModal';
import { XIcon } from './components/icons';
import { saveCustomToken, getCustomTokens, CustomToken } from './services/tokensService';
import { getVaultsByOwner, getVaultsBySigner, getVaultInfo, VaultInfo, isBeneficiary } from './services/factoryService';
import { TrustlineModal } from './components/modals/TrustlineModal';
import { AddTokenModal } from './components/modals/AddTokenModal';
import ConnectWalletModal from './components/modals/ConnectWalletModal';
import PublicVaultView from './components/views/PublicVaultView';
import ClaimPage from './components/views/ClaimPage';

function App() {
  const vault = useStellarVault();
  const [isFactoryAdmin, setIsFactoryAdmin] = useState(false);
  const [configReady, setConfigReady] = useState(false);

  // UI state
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [showNewTxModal, setShowNewTxModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showCreateVaultModal, setShowCreateVaultModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasBeneficiaryLocks, setHasBeneficiaryLocks] = useState(false);

  // Custom tokens (using tokensService)
  const [customTokens, setCustomTokens] = useState<CustomToken[]>(getCustomTokens);

  const handleAddToken = (token: {address: string; symbol: string; name: string; decimals: number}) => {
    const customToken: CustomToken = {
      ...token,
      addedAt: Date.now()
    };
    saveCustomToken(customToken);
    setCustomTokens(getCustomTokens());
    if (vault.vaultAddress) {
      vault.loadVaultData();
    }
  };

  const [showClaimPage, setShowClaimPage] = useState(false);
  const [claimVaultAddress, setClaimVaultAddress] = useState<string | null>(null);

  // Vault selection state
  const [userVaults, setUserVaults] = useState<VaultInfo[]>([]);
  const [loadingVaults, setLoadingVaults] = useState(false);
  const [showTrustlineModal, setShowTrustlineModal] = useState(false);
  const [showAddTokenModal, setShowAddTokenModal] = useState(false);
  const [showConnectWalletModal, setShowConnectWalletModal] = useState(false);

  // Token preselection for modals
  const [selectedTokenForTx, setSelectedTokenForTx] = useState<string | null>(null);
  const [selectedTokenForLock, setSelectedTokenForLock] = useState<string | null>(null);
  
  // Public view
  const [publicViewVault, setPublicViewVault] = useState<string | null>(null);

  // URL vault parameter
  const [urlVaultParam, setUrlVaultParam] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Initialize dynamic config on mount
  useEffect(() => {
    initConfig().then((cfg) => {
      console.log('Config initialized:', cfg);
      setConfigReady(true);
    });
  }, []);

  // Check for URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vaultParam = params.get('vault');
    const viewParam = params.get('view');
    
    if (vaultParam) {
      setUrlVaultParam(vaultParam);
      
      if (viewParam === 'public') {
        setPublicViewVault(vaultParam);
      } else if (viewParam === 'claim') {
        setClaimVaultAddress(vaultParam);
        setShowClaimPage(true);
      }
    }
  }, []);

  // Load user's vaults when connected AND config is ready
  useEffect(() => {
    if (vault.connected && vault.publicKey && configReady) {
      loadUserVaults();
    }
  }, [vault.connected, vault.publicKey, configReady]);

  // Check if user is beneficiary on a specific vault
  const isBeneficiaryOnVault = async (vaultAddress: string, userAddress: string): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { data, error } = await supabase
        .from('locks')
        .select('id')
        .eq('vault_address', vaultAddress)
        .eq('beneficiary_address', userAddress)
        .eq('is_active', true)
        .limit(1);
      
      if (error) return false;
      return (data?.length || 0) > 0;
    } catch {
      return false;
    }
  };

  const loadUserVaults = async () => {
    if (!vault.publicKey) return;
    
    console.log('=== loadUserVaults ===');
    console.log('publicKey:', vault.publicKey);
    setLoadingVaults(true);
    
    try {
      const vaultInfos: VaultInfo[] = [];
      const loadedAddresses = new Set<string>();
      
      // Load vaults owned by user
      const ownedVaults = await getVaultsByOwner(vault.publicKey);
      console.log('ownedVaults:', ownedVaults);
      for (const addr of ownedVaults) {
        if (!loadedAddresses.has(addr)) {
          console.log('Loading vault info for:', addr);
          const info = await getVaultInfo(addr);
          console.log('Vault info result:', info);
          if (info) {
            vaultInfos.push(info);
            loadedAddresses.add(addr);
          }
        }
      }
      
      // Load vaults where user is a signer (but not owner)
      const signerVaults = await getVaultsBySigner(vault.publicKey);
      console.log('signerVaults:', signerVaults);
      for (const addr of signerVaults) {
        if (!loadedAddresses.has(addr)) {
          console.log('Loading signer vault info for:', addr);
          const info = await getVaultInfo(addr);
          console.log('Signer vault info result:', info);
          if (info) {
            vaultInfos.push(info);
            loadedAddresses.add(addr);
          }
        }
      }
      
      console.log('Total vaults loaded:', vaultInfos.length, vaultInfos);
      setUserVaults(vaultInfos);
      
      // Check if user has any beneficiary locks (for sidebar button)
      const isBeneficiaryUser = await isBeneficiary(vault.publicKey);
      setHasBeneficiaryLocks(isBeneficiaryUser);

      // Handle URL vault parameter
      if (urlVaultParam) {
        const isSignerOnUrlVault = vaultInfos.some(v => v.vault_address === urlVaultParam);
        
        if (isSignerOnUrlVault) {
          // User is signer on this vault - select it and show dashboard
          console.log('User is signer on URL vault, selecting:', urlVaultParam);
          vault.selectVault(urlVaultParam);
        } else {
          // User is NOT a signer - check if they're a beneficiary on this vault
          console.log('User is not signer on URL vault, checking beneficiary status...');
          const isBeneficiaryOnUrlVault = await isBeneficiaryOnVault(urlVaultParam, vault.publicKey);
          
          if (isBeneficiaryOnUrlVault) {
            console.log('User is beneficiary on URL vault, showing claim page');
            setClaimVaultAddress(urlVaultParam);
            setShowClaimPage(true);
            return; // Exit early - show claim page
          } else {
            console.log('User has no access to URL vault');
            // Could show an error message here
          }
        }
      }
      
      // Auto-select first vault if available and none selected (and not showing claim page)
      if (vaultInfos.length > 0 && !vault.vaultAddress && !showClaimPage) {
        const savedVaultAddress = localStorage.getItem('selectedVaultAddress');
        const vaultToSelect = savedVaultAddress && vaultInfos.some(v => v.vault_address === savedVaultAddress)
          ? savedVaultAddress
          : vaultInfos[0].vault_address;
        console.log('Auto-selecting vault:', vaultToSelect);
        vault.selectVault(vaultToSelect);
      }
      
      // If no vaults and no URL param, check if beneficiary globally
      if (vaultInfos.length === 0 && !urlVaultParam) {
        console.log('No vaults found, checking if beneficiary...');
        console.log('Checking beneficiary for publicKey:', vault.publicKey);
        const hasBeneficiaryLocks = await isBeneficiary(vault.publicKey);
        console.log('isBeneficiary result:', hasBeneficiaryLocks);
        if (hasBeneficiaryLocks) {
          console.log('Setting showClaimPage to true');
          setShowClaimPage(true);
        } else {
          console.log('No beneficiary locks found');
        }
      }
    } catch (err) {
      console.error('Failed to load vaults:', err);
    } finally {
      setLoadingVaults(false);
    }
  };

  useEffect(() => {
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

  const handleVaultCreated = async (vaultAddress: string) => {
    await loadUserVaults();
    vault.selectVault(vaultAddress);
    setActiveView('dashboard');
    setShowCreateVaultModal(false);
  };

  const handleWalletConnect = (publicKey: string, walletId: string) => {
    vault.connect(publicKey, walletId);
    setShowConnectWalletModal(false);
  };

  const handleCloseClaimPage = () => {
    setShowClaimPage(false);
    setClaimVaultAddress(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  // CLAIM PAGE - Show if user is beneficiary
  if (showClaimPage) {
    return (
      <ClaimPage
        onClose={handleCloseClaimPage}
        initialPublicKey={vault.publicKey}
        initialWalletId={vault.walletId}
        vaultAddress={claimVaultAddress}
      />
    );
  }

  // PUBLIC VIEW - Check this FIRST before wallet connection
  if (publicViewVault) {
    return (
      <PublicVaultView
        vaultAddress={publicViewVault}
        onClose={() => {
          setPublicViewVault(null);
          window.history.pushState({}, '', window.location.pathname);
        }}
      />
    );
  }

  // Landing page for non-connected users
  if (!vault.connected) {
    return (
      <>
        <LandingPage
          loading={vault.loading}
          error={vault.error}
          onConnect={() => setShowConnectWalletModal(true)}
          onDismissError={() => vault.setError(null)}
        />
        <ConnectWalletModal
          isOpen={showConnectWalletModal}
          onClose={() => setShowConnectWalletModal(false)}
          onConnect={handleWalletConnect}
        />
      </>
    );
  }

  // Get current vault info for display
  const hasVaults = userVaults.length > 0;
  const hasSelectedVault = !!vault.vaultAddress;

  // Main app
  return (
    <div className="min-h-screen bg-[#060a12] text-white flex">
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
        onDisconnect={vault.disconnect}
        walletId={vault.walletId || null}
        onSelectVault={(address) => vault.selectVault(address)}
        onCreateVault={() => setShowCreateVaultModal(true)}
        hasBeneficiaryLocks={hasBeneficiaryLocks}
        onShowClaimPage={() => setShowClaimPage(true)}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden pt-14 lg:pt-0">
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
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                  <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-3">Welcome to Orion Safe</h2>
                <p className="text-gray-400 mb-8">
                  {hasVaults 
                    ? 'Select a vault from the sidebar or create a new one to get started.'
                    : 'Create your first multi-signature vault to securely manage your assets with multiple approvers.'}
                </p>
                <button
                  onClick={() => setShowCreateVaultModal(true)}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center gap-3 mx-auto"
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
              <p className="text-gray-400">Loading your vaults...</p>
            </div>
          )}

          {/* Vault Selected - Show Normal Views */}
          {hasSelectedVault && (
            <>
              {/* Show loading while vault data loads */}
              {vault.loading && !vault.isInitialized && (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
                  <p className="text-gray-400">Loading vault data...</p>
                </div>
              )}

              {/* Show views once initialized */}
              {vault.isInitialized && (
                <>
                  {activeView === 'dashboard' && (
                    <Dashboard
                      vaultConfig={vault.vaultConfig}
                      vaultBalance={vault.vaultBalance}
                      proposals={vault.proposals}
                      pendingCount={vault.pendingCount}
                      approvedCount={vault.approvedCount}
                      isSigner={vault.isSigner}
                      onViewTransactions={() => setActiveView('transactions')}
                      onNewTransaction={() => setShowNewTxModal(true)}
                      onSelectProposal={() => setActiveView('transactions')}
                    />
                  )}

                  {activeView === 'assets' && (
                    <Assets
                      vaultAddress={vault.vaultAddress}
                      vaultBalance={vault.vaultBalance}
                      remainingSpend={vault.remainingSpend ?? BigInt(0)}
                      isSigner={vault.isSigner}
                      userRole={vault.userRole || undefined}
                      onDeposit={() => setShowDepositModal(true)}
                      onRefresh={() => vault.loadVaultData()}
                      onManageTokens={() => setShowTrustlineModal(true)}
                      onAddToken={() => setShowAddTokenModal(true)}
                      onSend={(tokenAddress) => {
                        setSelectedTokenForTx(tokenAddress);
                        setShowNewTxModal(true);
                      }}
                      onLock={(tokenAddress) => {
                        setSelectedTokenForLock(tokenAddress);
                        setActiveView('locks');
                      }}
                      onVesting={(tokenAddress) => {
                        setSelectedTokenForLock(tokenAddress);
                        setActiveView('vesting');
                      }}
                    />
                  )}

                  {activeView === 'transactions' && (
                    <Transactions
                      vaultAddress={vault.vaultAddress}
                      proposals={vault.proposals}
                      publicKey={vault.publicKey}
                      isSigner={vault.isSigner}
                      userRole={vault.userRole as any}
                      threshold={vault.vaultConfig?.threshold || 1}
                      onApprove={vault.approve}
                      onExecute={vault.execute}
                      onRequestCancel={vault.requestCancel}
                      onApproveCancel={vault.approveCancel}
                      onExecuteCancel={vault.executeCancel}
                      onNewTransaction={() => setShowNewTxModal(true)}
                      onRefreshProposals={() => vault.loadVaultData()}
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
                    />
                  )}

                  {activeView === 'contacts' && (
                    <Contacts onCopy={copyToClipboard} />
                  )}

                  {activeView === 'admin' && isFactoryAdmin && (
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
                      onLeaveVault={vault.leaveVault}
                    />
                  )}

                  {activeView === 'locks' && (
                    <Locks
                      vaultAddress={vault.vaultAddress}
                      locks={vault.locks}
                      vaultBalance={vault.vaultBalance}
                      proposals={vault.proposals}
                      userRole={vault.userRole || undefined}
                      publicKey={vault.publicKey}
                      onCreateTimeLock={vault.createTimeLock}
                      onClaimLock={vault.claimLock}
                      onCancelLock={vault.cancelLock}
                      onRefresh={() => vault.loadVaultData()}
                      preselectedToken={selectedTokenForLock}
                    />
                  )}

                  {activeView === 'vesting' && (
                    <Vesting
                      vaultAddress={vault.vaultAddress}
                      locks={vault.locks}
                      vaultBalance={vault.vaultBalance}
                      proposals={vault.proposals}
                      userRole={vault.userRole || undefined}
                      publicKey={vault.publicKey}
                      onCreateVestingLock={vault.createVestingLock}
                      onClaimLock={vault.claimLock}
                      onCancelLock={vault.cancelLock}
                      onRefresh={() => vault.loadVaultData()}
                      preselectedToken={selectedTokenForLock}
                    />
                  )}
                </>
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
          isOpen={showNewTxModal}
          onClose={() => {
            setShowNewTxModal(false);
            setSelectedTokenForTx(null);
          }}
          onSubmit={async (token, recipient, amount) => {
            await vault.propose(token, recipient, amount.toString());
            setShowNewTxModal(false);
            setSelectedTokenForTx(null);
          }}
          preselectedToken={selectedTokenForTx}
          vaultAddress={vault.vaultAddress ?? undefined}
          vaultBalance={vault.vaultBalance}
          proposals={vault.proposals}
        />
      )}

      {showDepositModal && (
        <DepositModal
          vaultAddress={vault.vaultAddress}
          userAddress={vault.publicKey}
          loading={vault.loading}
          onClose={() => setShowDepositModal(false)}
          onSubmit={(token, amount) => {
            vault.deposit(token, amount);
            setShowDepositModal(false);
          }}
        />
      )}

      {showTrustlineModal && (
        <TrustlineModal
          isOpen={showTrustlineModal}
          userAddress={vault.publicKey}
          onClose={() => setShowTrustlineModal(false)}
          onSuccess={() => {
            setShowTrustlineModal(false);
            vault.loadVaultData();
          }}
        />
      )}

      {showAddTokenModal && (
        <AddTokenModal
          isOpen={showAddTokenModal}
          onClose={() => setShowAddTokenModal(false)}
          onAddToken={handleAddToken}
        />
      )}

      {showCreateVaultModal && (
        <CreateVaultModal
          isOpen={showCreateVaultModal}
          onClose={() => setShowCreateVaultModal(false)}
          userAddress={vault.publicKey || ''}
          onVaultCreated={handleVaultCreated}
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
