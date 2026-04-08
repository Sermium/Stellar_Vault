import React, { useState } from 'react';
import { ActiveView, VaultConfig } from '../../types';
import { VaultInfo } from '../../services/factoryService';

interface SidebarProps {
  collapsed: boolean;
  activeView: ActiveView;
  vaultConfig: VaultConfig | null;
  vaultAddress: string | null;
  userVaults: VaultInfo[];
  isInitialized: boolean;
  publicKey: string | null;
  isSigner: boolean;
  userRole?: string;
  isFactoryAdmin: boolean;
  pendingCount: number;
  approvedCount: number;
  onViewChange: (view: ActiveView) => void;
  onCopy: (text: string) => void;
  onDisconnect: () => void;
  walletId: string | null;
  onSelectVault: (address: string) => void;
  onCreateVault: () => void;
  hasBeneficiaryLocks?: boolean;
  onShowClaimPage?: () => void;
}

// Icons
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const AssetsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TransactionsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const MembersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const ContactsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const LocksIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const VestingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const AdminIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ClaimIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  activeView,
  vaultConfig,
  vaultAddress,
  userVaults,
  isInitialized,
  publicKey,
  isSigner,
  userRole,
  isFactoryAdmin,
  pendingCount,
  approvedCount,
  onViewChange,
  onCopy,
  onDisconnect,
  walletId,
  onSelectVault,
  onCreateVault,
  hasBeneficiaryLocks = false,
  onShowClaimPage,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showVaultDropdown, setShowVaultDropdown] = useState(false);

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const sharePublicView = () => {
    if (!vaultAddress) return;
    const url = `${window.location.origin}?vault=${vaultAddress}&view=public`;
    navigator.clipboard.writeText(url);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  const navItems = [
    { id: 'dashboard' as ActiveView, label: 'Dashboard', icon: <HomeIcon /> },
    { id: 'assets' as ActiveView, label: 'Assets', icon: <AssetsIcon /> },
    { id: 'transactions' as ActiveView, label: 'Transactions', icon: <TransactionsIcon />, badge: pendingCount + approvedCount },
    { id: 'locks' as ActiveView, label: 'Locks', icon: <LocksIcon /> },
    { id: 'vesting' as ActiveView, label: 'Vesting', icon: <VestingIcon /> },
    { id: 'members' as ActiveView, label: 'Members', icon: <MembersIcon /> },
    { id: 'contacts' as ActiveView, label: 'Contacts', icon: <ContactsIcon /> },
    { id: 'settings' as ActiveView, label: 'Settings', icon: <SettingsIcon /> },
  ];

  const handleNavClick = (view: ActiveView) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  const handleClaimClick = () => {
    if (onShowClaimPage) {
      onShowClaimPage();
      setMobileMenuOpen(false);
    }
  };

  // Mobile Header Bar
  const MobileHeader = () => (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0a0e1a] border-b border-blue-900/30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <img 
            src="/logovault.png" 
            alt="Orion Safe" 
            className="w-8 h-auto"
          />
          <div className="flex items-center space-x-1">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Orion
            </span>
            <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              Safe
            </span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-blue-900/30 transition-colors text-blue-400"
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
    </div>
  );

  // Mobile Menu Overlay
  const MobileMenu = () => (
    <>
      {/* Backdrop */}
      <div 
        className={`lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />
      
      {/* Slide-in Menu */}
      <div 
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-[#0a0e1a] z-50 transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="p-4 border-b border-blue-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logovault.png" 
                alt="Orion Safe" 
                className="w-10 h-auto"
              />
              <div className="leading-tight">
                <p className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Orion
                </p>
                <p className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  Safe
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-blue-900/30 transition-colors text-blue-400"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Vault Selector */}
        {userVaults.length > 0 && (
          <div className="p-4 border-b border-blue-900/30">
            <p className="text-xs text-blue-400/60 mb-2">Current Vault</p>
            <button
              onClick={() => setShowVaultDropdown(!showVaultDropdown)}
              className="w-full flex items-center justify-between p-3 bg-blue-900/20 rounded-lg hover:bg-blue-900/30 transition-colors border border-blue-800/30"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-white">{vaultConfig?.name || 'Select Vault'}</p>
                {vaultAddress && (
                  <p className="text-xs text-blue-400/60 font-mono">{truncateAddress(vaultAddress)}</p>
                )}
              </div>
              <ChevronDownIcon />
            </button>
            
            {showVaultDropdown && (
              <div className="mt-2 bg-blue-900/30 rounded-lg overflow-hidden border border-blue-800/30">
                {userVaults.map((v) => (
                  <button
                    key={v.vault_address}
                    onClick={() => {
                      onSelectVault(v.vault_address);
                      setShowVaultDropdown(false);
                    }}
                    className={`w-full p-3 text-left hover:bg-blue-800/30 transition-colors ${
                      v.vault_address === vaultAddress ? 'bg-blue-600/20 border-l-2 border-cyan-400' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-white">{v.name}</p>
                    <p className="text-xs text-blue-400/60 font-mono">{truncateAddress(v.vault_address)}</p>
                  </button>
                ))}
                <button
                  onClick={() => {
                    onCreateVault();
                    setShowVaultDropdown(false);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full p-3 text-left hover:bg-blue-800/30 transition-colors border-t border-blue-800/30 flex items-center space-x-2 text-cyan-400"
                >
                  <PlusIcon />
                  <span className="text-sm">Create New Vault</span>
                </button>
              </div>
            )}

            {vaultAddress && (
              <div className="flex items-center space-x-2 mt-3">
                <button
                  onClick={() => onCopy(vaultAddress)}
                  className="flex-1 flex items-center justify-center space-x-2 p-2 bg-blue-900/20 rounded-lg hover:bg-blue-900/30 transition-colors text-blue-400 text-sm border border-blue-800/30"
                >
                  <CopyIcon />
                  <span>Copy</span>
                </button>
                <button
                  onClick={sharePublicView}
                  className="flex-1 flex items-center justify-center space-x-2 p-2 bg-blue-900/20 rounded-lg hover:bg-blue-900/30 transition-colors text-blue-400 text-sm border border-blue-800/30"
                >
                  <ShareIcon />
                  <span>Share</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-350px)]">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                activeView === item.id
                  ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-blue-300/70 hover:bg-blue-900/30 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-xs text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Admin Link */}
          {isFactoryAdmin && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                activeView === 'admin'
                  ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-blue-300/70 hover:bg-blue-900/30 hover:text-white'
              }`}
            >
              <AdminIcon />
              <span className="font-medium">Admin</span>
            </button>
          )}

          {/* Claim Tokens Link */}
          {hasBeneficiaryLocks && onShowClaimPage && (
            <button
              onClick={handleClaimClick}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all text-green-400 hover:bg-green-900/30 hover:text-green-300 border border-green-500/30 bg-green-900/20"
            >
              <ClaimIcon />
              <span className="font-medium">Claim Tokens</span>
            </button>
          )}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-900/30 bg-[#0a0e1a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                {publicKey?.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{truncateAddress(publicKey || '')}</p>
                <p className="text-xs text-blue-400/60">{walletId || 'Connected'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                onDisconnect();
                setMobileMenuOpen(false);
              }}
              className="p-2 hover:bg-blue-900/30 rounded-lg transition-colors text-blue-400 hover:text-red-400"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Desktop Sidebar
  const DesktopSidebar = () => (
    <aside 
      className={`hidden lg:flex flex-col h-screen bg-[#0a0e1a] border-r border-blue-900/30 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-blue-900/30">
        <div className="flex items-center justify-center">
          {collapsed ? (
            <div className="flex flex-col items-center">
              <img 
                src="/logovault.png" 
                alt="Orion Safe" 
                className="w-10 h-auto mb-1"
              />
              <div className="text-center leading-none">
                <p className="text-[10px] font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Orion
                </p>
                <p className="text-[10px] font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  Safe
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <img 
                src="/logovault.png" 
                alt="Orion Safe" 
                className="w-14 h-auto"
              />
              <div className="leading-tight">
                <p className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Orion
                </p>
                <p className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  Safe
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vault Selector - Desktop */}
      {!collapsed && userVaults.length > 0 && (
        <div className="p-4 border-b border-blue-900/30">
          <p className="text-xs text-blue-400/60 mb-2">Current Vault</p>
          <button
            onClick={() => setShowVaultDropdown(!showVaultDropdown)}
            className="w-full flex items-center justify-between p-3 bg-blue-900/20 rounded-lg hover:bg-blue-900/30 transition-colors border border-blue-800/30"
          >
            <div className="text-left truncate">
              <p className="text-sm font-medium text-white truncate">{vaultConfig?.name || 'Select Vault'}</p>
              {vaultAddress && (
                <p className="text-xs text-blue-400/60 font-mono">{truncateAddress(vaultAddress)}</p>
              )}
            </div>
            <ChevronDownIcon />
          </button>
          
          {showVaultDropdown && (
            <div className="mt-2 bg-blue-900/30 rounded-lg overflow-hidden max-h-48 overflow-y-auto border border-blue-800/30">
              {userVaults.map((v) => (
                <button
                  key={v.vault_address}
                  onClick={() => {
                    onSelectVault(v.vault_address);
                    setShowVaultDropdown(false);
                  }}
                  className={`w-full p-3 text-left hover:bg-blue-800/30 transition-colors ${
                    v.vault_address === vaultAddress ? 'bg-blue-600/20 border-l-2 border-cyan-400' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate">{v.name}</p>
                  <p className="text-xs text-blue-400/60 font-mono">{truncateAddress(v.vault_address)}</p>
                </button>
              ))}
              <button
                onClick={() => {
                  onCreateVault();
                  setShowVaultDropdown(false);
                }}
                className="w-full p-3 text-left hover:bg-blue-800/30 transition-colors border-t border-blue-800/30 flex items-center space-x-2 text-cyan-400"
              >
                <PlusIcon />
                <span className="text-sm">Create New Vault</span>
              </button>
            </div>
          )}

          {vaultAddress && (
            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={() => onCopy(vaultAddress)}
                className="flex-1 flex items-center justify-center space-x-2 p-2 bg-blue-900/20 rounded-lg hover:bg-blue-900/30 transition-colors text-blue-400 text-xs border border-blue-800/30"
              >
                <CopyIcon />
                <span>Copy</span>
              </button>
              <button
                onClick={sharePublicView}
                className="flex-1 flex items-center justify-center space-x-2 p-2 bg-blue-900/20 rounded-lg hover:bg-blue-900/30 transition-colors text-blue-400 text-xs border border-blue-800/30"
              >
                <ShareIcon />
                <span>Share</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collapsed Vault Indicator */}
      {collapsed && vaultAddress && (
        <div className="p-2 border-b border-blue-900/30 flex flex-col items-center space-y-2">
          <button
            onClick={() => onCopy(vaultAddress)}
            className="p-2 hover:bg-blue-900/30 rounded-lg transition-colors text-blue-400"
            title={vaultAddress}
          >
            <CopyIcon />
          </button>
          <button
            onClick={sharePublicView}
            className="p-2 hover:bg-blue-900/30 rounded-lg transition-colors text-blue-400"
            title="Share Public View"
          >
            <ShareIcon />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl transition-all ${
              activeView === item.id
                ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                : 'text-blue-300/70 hover:bg-blue-900/30 hover:text-white'
            }`}
            title={collapsed ? item.label : undefined}
          >
            <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
              {item.icon}
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </div>
            {!collapsed && item.badge && item.badge > 0 && (
              <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-xs text-white">
                {item.badge}
              </span>
            )}
          </button>
        ))}

        {/* Admin Link */}
        {isFactoryAdmin && (
          <button
            onClick={() => onViewChange('admin')}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all ${
              activeView === 'admin'
                ? 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                : 'text-blue-300/70 hover:bg-blue-900/30 hover:text-white'
            }`}
            title={collapsed ? 'Admin' : undefined}
          >
            <AdminIcon />
            {!collapsed && <span className="font-medium">Admin</span>}
          </button>
        )}

        {/* Claim Tokens Link */}
        {hasBeneficiaryLocks && onShowClaimPage && (
          <button
            onClick={handleClaimClick}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-xl transition-all text-green-400 hover:bg-green-900/30 hover:text-green-300 border border-green-500/30 bg-green-900/20`}
            title={collapsed ? 'Claim Tokens' : undefined}
          >
            <ClaimIcon />
            {!collapsed && <span className="font-medium">Claim Tokens</span>}
          </button>
        )}
      </nav>

      {/* User Section - Desktop */}
      <div className="p-4 border-t border-blue-900/30">
        {collapsed ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
              {publicKey?.slice(0, 2)}
            </div>
            <button
              onClick={onDisconnect}
              className="p-2 hover:bg-blue-900/30 rounded-lg transition-colors text-blue-400 hover:text-red-400"
              title="Disconnect"
            >
              <LogoutIcon />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                {publicKey?.slice(0, 2)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{truncateAddress(publicKey || '')}</p>
                <p className="text-xs text-blue-400/60">{walletId || 'Connected'}</p>
              </div>
            </div>
            <button
              onClick={onDisconnect}
              className="p-2 hover:bg-blue-900/30 rounded-lg transition-colors text-blue-400 hover:text-red-400"
              title="Disconnect"
            >
              <LogoutIcon />
            </button>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile Components */}
      <MobileHeader />
      <MobileMenu />

      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Public link copied!
        </div>
      )}
    </>
  );
};

export default Sidebar;
