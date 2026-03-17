import React, { useState } from 'react';
import { StellarLogo, HomeIcon, WalletIcon, SendIcon, UsersIcon, SettingsIcon, CopyIcon } from '../icons';
import { VaultConfig, ActiveView } from '../../types';
import { truncateAddress } from '../../lib/stellar';
import { VaultInfo } from '../../services/factoryService';

// Contact Book Icon
const ContactBookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 4v16M4 4v16" />
  </svg>
);

// Admin Icon
const AdminIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// Share Icon
const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

interface SidebarProps {
  collapsed: boolean;
  activeView: ActiveView;
  vaultConfig: VaultConfig | null;
  vaultAddress: string | null;
  userVaults: VaultInfo[];
  isInitialized: boolean;
  publicKey: string | null;
  walletId?: string | null;
  isSigner: boolean;
  userRole?: 'Admin' | 'Executor' | 'Viewer';
  isFactoryAdmin?: boolean;
  pendingCount: number;
  approvedCount: number;
  onViewChange: (view: ActiveView) => void;
  onCopy: (text: string) => void;
  onDisconnect: () => void;
  onSelectVault: (address: string) => void;
  onCreateVault: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  activeView,
  vaultConfig,
  vaultAddress,
  userVaults,
  isInitialized,
  publicKey,
  walletId,
  isSigner,
  userRole,
  isFactoryAdmin,
  pendingCount,
  approvedCount,
  onViewChange,
  onCopy,
  onDisconnect,
  onSelectVault,
  onCreateVault,
}) => {
  const [vaultDropdownOpen, setVaultDropdownOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  const navItems = [
    { id: 'home' as ActiveView, icon: <HomeIcon />, label: 'Dashboard' },
    { id: 'assets' as ActiveView, icon: <WalletIcon />, label: 'Assets' },
    {
      id: 'locks' as ActiveView,
      label: 'Locks',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    { id: 'transactions' as ActiveView, icon: <SendIcon />, label: 'Transactions', badge: pendingCount + approvedCount },
    { id: 'members' as ActiveView, icon: <UsersIcon />, label: 'Members' },
    { id: 'contacts' as ActiveView, icon: <ContactBookIcon />, label: 'Contacts' },
    { id: 'settings' as ActiveView, icon: <SettingsIcon />, label: 'Settings' },
  ];

  const currentVault = userVaults.find(v => v.vault_address === vaultAddress);

  // Get role badge color
  const getRoleBadge = () => {
    if (isFactoryAdmin) {
      return { color: 'text-yellow-400 bg-yellow-500/20', label: 'Factory Admin' };
    }
    switch (userRole) {
      case 'Admin':
        return { color: 'text-purple-400 bg-purple-500/20', label: 'Vault Admin' };
      case 'Executor':
        return { color: 'text-blue-400 bg-blue-500/20', label: 'Executor' };
      case 'Viewer':
        return { color: 'text-gray-400 bg-gray-500/20', label: 'Viewer' };
      default:
        return { color: 'text-gray-400 bg-gray-500/20', label: isSigner ? 'Signer' : 'Viewer' };
    }
  };

  const roleBadge = getRoleBadge();

  // Share public view link
  const sharePublicView = () => {
    if (!vaultAddress) return;
    const url = `${window.location.origin}?vault=${vaultAddress}&view=public`;
    navigator.clipboard.writeText(url);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
  };

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-[#0d0e12] border-r border-gray-800 flex flex-col transition-all duration-300 relative`}>
      {/* Share Toast */}
      {showShareToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-lg text-sm z-50 whitespace-nowrap">
          Public link copied!
        </div>
      )}

      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-center">
          <img 
            src="/stellarvault.png" 
            alt="Stellar Vault" 
            className={collapsed ? "w-10 h-auto" : "w-48 h-auto max-h-20"}
          />
        </div>
      </div>

      {/* Vault Selector */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <button
              onClick={() => setVaultDropdownOpen(!vaultDropdownOpen)}
              className="w-full p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">Active Vault</p>
                  <p className="font-semibold truncate">
                    {currentVault ? String(currentVault.name) : vaultConfig?.name || 'Select Vault'}
                  </p>
                  {vaultAddress && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
                    </p>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${vaultDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Dropdown */}
            {vaultDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#12131a] border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {userVaults.map((vault) => (
                    <button
                      key={vault.vault_address}
                      onClick={() => {
                        onSelectVault(vault.vault_address);
                        setVaultDropdownOpen(false);
                      }}
                      className={`w-full p-3 text-left hover:bg-gray-800/50 transition-colors border-b border-gray-800 last:border-b-0 ${
                        vault.vault_address === vaultAddress ? 'bg-purple-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{String(vault.name)}</p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {vault.vault_address.slice(0, 8)}...{vault.vault_address.slice(-4)}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-xs text-purple-400">{vault.threshold}/{vault.signers?.length || 0}</p>
                          {vault.vault_address === vaultAddress && (
                            <span className="text-xs text-green-400">●</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Create New Vault */}
                <button
                  onClick={() => {
                    onCreateVault();
                    setVaultDropdownOpen(false);
                  }}
                  className="w-full p-3 text-left hover:bg-purple-500/10 transition-colors border-t border-gray-700 flex items-center gap-2 text-purple-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-medium">Create New Vault</span>
                </button>
              </div>
            )}
          </div>

          {/* Copy Address & Share Buttons */}
          {vaultAddress && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => onCopy(vaultAddress)}
                className="flex-1 flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors py-1.5 rounded-lg hover:bg-gray-800/50"
              >
                <CopyIcon />
                <span>Copy Address</span>
              </button>
              <button
                onClick={sharePublicView}
                className="flex-1 flex items-center justify-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors py-1.5 rounded-lg hover:bg-purple-500/10"
                title="Share public view link"
              >
                <ShareIcon />
                <span>Share View</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Collapsed Vault Indicator */}
      {collapsed && vaultAddress && (
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={() => setVaultDropdownOpen(!vaultDropdownOpen)}
            className="w-full aspect-square rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex items-center justify-center text-lg font-bold"
            title={currentVault ? String(currentVault.name) : 'Select Vault'}
          >
            {currentVault ? String(currentVault.name).charAt(0).toUpperCase() : '?'}
          </button>
          {/* Share button for collapsed mode */}
          <button
            onClick={sharePublicView}
            className="w-full mt-2 aspect-square rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center hover:bg-purple-500/20 transition-colors"
            title="Share public view"
          >
            <ShareIcon />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeView === item.id
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {item.icon}
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}

        {/* Admin Link - Only show for factory admin */}
        {isFactoryAdmin && (
          <>
            <div className="border-t border-gray-700 my-2"></div>
            <button
              onClick={() => onViewChange('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeView === 'admin'
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'text-yellow-400/70 hover:text-yellow-400 hover:bg-yellow-500/10'
              }`}
            >
              <AdminIcon />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Factory Admin</span>
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
                    ⚡
                  </span>
                </>
              )}
            </button>
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
            isFactoryAdmin 
              ? 'bg-gradient-to-br from-yellow-500 to-orange-600' 
              : 'bg-gradient-to-br from-purple-500 to-blue-600'
          }`}>
            {publicKey?.slice(0, 2)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{truncateAddress(publicKey!)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
              {walletId && (
                <p className="text-xs text-gray-500 mt-1">
                  via {walletId}
                </p>
              )}
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onDisconnect}
            className="w-full mt-3 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            Disconnect
          </button>
        )}
      </div>
    </aside>
  );
};
