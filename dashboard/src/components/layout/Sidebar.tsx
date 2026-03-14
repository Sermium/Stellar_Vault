import React from 'react';
import { StellarLogo, HomeIcon, WalletIcon, SendIcon, UsersIcon, SettingsIcon, CopyIcon } from '../icons';
import { CONTRACT_ID } from '../../config/constants';
import { VaultConfig, ActiveView } from '../../types';
import { truncateAddress } from '../../lib/stellar';

interface SidebarProps {
  collapsed: boolean;
  activeView: ActiveView;
  vaultConfig: VaultConfig | null;
  isInitialized: boolean;
  publicKey: string | null;
  isSigner: boolean;
  pendingCount: number;
  approvedCount: number;
  onViewChange: (view: ActiveView) => void;
  onCopy: (text: string) => void;
  onDisconnect: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  activeView,
  vaultConfig,
  isInitialized,
  publicKey,
  isSigner,
  pendingCount,
  approvedCount,
  onViewChange,
  onCopy,
  onDisconnect,
}) => {
  const navItems = [
    { id: 'home' as ActiveView, icon: <HomeIcon />, label: 'Dashboard' },
    { id: 'assets' as ActiveView, icon: <WalletIcon />, label: 'Assets' },
    { id: 'transactions' as ActiveView, icon: <SendIcon />, label: 'Transactions', badge: pendingCount + approvedCount },
    { id: 'members' as ActiveView, icon: <UsersIcon />, label: 'Members' },
    { id: 'settings' as ActiveView, icon: <SettingsIcon />, label: 'Settings' },
  ];

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-[#0d0e12] border-r border-gray-800 flex flex-col transition-all duration-300`}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <StellarLogo className="w-10 h-10 flex-shrink-0" />
          {!collapsed && <span className="text-lg font-bold">Stellar Vault</span>}
        </div>
      </div>

      {/* Vault Info */}
      {isInitialized && !collapsed && (
        <div className="p-4 border-b border-gray-800">
          <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
            <p className="text-xs text-gray-400 mb-1">Active Vault</p>
            <p className="font-semibold truncate">{vaultConfig?.name}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">{truncateAddress(CONTRACT_ID)}</span>
              <button onClick={() => onCopy(CONTRACT_ID)} className="text-gray-400 hover:text-white">
                <CopyIcon />
              </button>
            </div>
          </div>
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
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {item.icon}
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {publicKey?.slice(0, 2)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{truncateAddress(publicKey!)}</p>
              <p className="text-xs text-gray-500">{isSigner ? 'Signer' : 'Viewer'}</p>
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
