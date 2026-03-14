import React from 'react';
import { ChevronRightIcon, RefreshIcon, PlusIcon, SendIcon } from '../icons';
import { ActiveView } from '../../types';

interface HeaderProps {
  activeView: ActiveView;
  loading: boolean;
  sidebarCollapsed: boolean;
  isSigner: boolean;
  isInitialized: boolean;
  onToggleSidebar: () => void;
  onRefresh: () => void;
  onDeposit: () => void;
  onNewTransaction: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  loading,
  sidebarCollapsed,
  isSigner,
  isInitialized,
  onToggleSidebar,
  onRefresh,
  onDeposit,
  onNewTransaction,
}) => {
  return (
    <header className="h-16 border-b border-gray-800 px-6 flex items-center justify-between bg-[#0d0e12]/80 backdrop-blur sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
        >
          <ChevronRightIcon className={`transform transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
        <h1 className="text-xl font-semibold capitalize">{activeView}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </button>
        {isSigner && isInitialized && (
          <>
            <button
              onClick={onDeposit}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              <PlusIcon />
              <span className="hidden sm:inline">Deposit</span>
            </button>
            <button
              onClick={onNewTransaction}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg transition"
            >
              <SendIcon />
              <span className="hidden sm:inline">New Transaction</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
