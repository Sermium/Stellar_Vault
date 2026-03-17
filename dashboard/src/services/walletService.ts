import { NETWORK_PASSPHRASE } from '../config';

// Storage keys
const STORAGE_KEY_WALLET = 'stellar_vault_wallet';
const STORAGE_KEY_ADDRESS = 'stellar_vault_address';

// Wallet types
export type WalletType = 'freighter' | 'xbull' | 'albedo' | 'lobstr';

export interface WalletInfo {
  id: WalletType;
  name: string;
  icon: string;
  isAvailable: () => boolean;
}

let selectedWalletId: WalletType | null = null;
let currentAddress: string | null = null;

// Initialize from storage
const initFromStorage = () => {
  if (typeof window === 'undefined') return;
  
  const storedWallet = localStorage.getItem(STORAGE_KEY_WALLET);
  const storedAddress = localStorage.getItem(STORAGE_KEY_ADDRESS);
  
  if (storedWallet && storedAddress) {
    selectedWalletId = storedWallet as WalletType;
    currentAddress = storedAddress;
  }
};

// Save to storage
const saveToStorage = (walletId: WalletType, address: string) => {
  localStorage.setItem(STORAGE_KEY_WALLET, walletId);
  localStorage.setItem(STORAGE_KEY_ADDRESS, address);
};

// Clear storage
const clearStorage = () => {
  localStorage.removeItem(STORAGE_KEY_WALLET);
  localStorage.removeItem(STORAGE_KEY_ADDRESS);
};

// Initialize on load
initFromStorage();

// Check if Freighter is installed - multiple detection methods
const isFreighterInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Method 1: Check window.freighter
  if ((window as any).freighter) return true;
  
  // Method 2: Check window.stellar
  if ((window as any).stellar?.isFreighter) return true;
  
  // Method 3: Check for the Freighter API injection
  if ((window as any).freighterApi) return true;
  
  return false;
};

const isXBullInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).xBullSDK;
};

const isAlbedoAvailable = (): boolean => true;
const isLobstrAvailable = (): boolean => true;

export const SUPPORTED_WALLETS: WalletInfo[] = [
  { id: 'freighter', name: 'Freighter', icon: '🚀', isAvailable: isFreighterInstalled },
  { id: 'xbull', name: 'xBull', icon: '🐂', isAvailable: isXBullInstalled },
  { id: 'albedo', name: 'Albedo', icon: '🌟', isAvailable: isAlbedoAvailable },
  { id: 'lobstr', name: 'LOBSTR', icon: '🦞', isAvailable: isLobstrAvailable },
];

// Connect to Freighter using the @stellar/freighter-api package
const connectFreighter = async (): Promise<string> => {
  try {
    // Import the Freighter API
    const freighterApi = await import('@stellar/freighter-api');
    
    // Check if installed
    const installed = await freighterApi.isConnected();
    if (!installed) {
      throw new Error('Freighter is not installed. Please install the Freighter extension.');
    }
    
    // Request access
    const accessObj = await freighterApi.requestAccess();
    if (accessObj.error) {
      throw new Error(accessObj.error);
    }
    
    // Get address
    const addressObj = await freighterApi.getAddress();
    if (addressObj.error) {
      throw new Error(addressObj.error);
    }
    
    return addressObj.address;
  } catch (err: any) {
    console.error('Freighter connection error:', err);
    throw new Error(err.message || 'Failed to connect to Freighter');
  }
};

// Connect to xBull
const connectXBull = async (): Promise<string> => {
  const xBull = (window as any).xBullSDK;
  if (!xBull) throw new Error('xBull not installed');
  
  const { publicKey } = await xBull.connect();
  return publicKey;
};

// Connect to Albedo
const connectAlbedo = async (): Promise<string> => {
  const { default: albedo } = await import('@albedo-link/intent');
  const result = await albedo.publicKey({});
  return result.pubkey;
};

// Connect to LOBSTR
const connectLobstr = async (): Promise<string> => {
  const lobstr = (window as any).lobstr;
  if (lobstr) {
    const { publicKey } = await lobstr.getPublicKey();
    return publicKey;
  }
  throw new Error('LOBSTR wallet not available. Please install the LOBSTR extension or use another wallet.');
};

export const setWalletConnection = (walletId: WalletType, address: string): void => {
  console.log('setWalletConnection called with:', walletId, address);
  selectedWalletId = walletId;
  currentAddress = address;
  saveToStorage(walletId, address);
  console.log('After set - selectedWalletId:', selectedWalletId, 'currentAddress:', currentAddress);
};

// Main connect function
export const connectWallet = async (walletId: WalletType): Promise<string> => {
  let address: string;
  
  switch (walletId) {
    case 'freighter':
      address = await connectFreighter();
      break;
    case 'xbull':
      address = await connectXBull();
      break;
    case 'albedo':
      address = await connectAlbedo();
      break;
    case 'lobstr':
      address = await connectLobstr();
      break;
    default:
      throw new Error(`Unknown wallet: ${walletId}`);
  }
  
  selectedWalletId = walletId;
  currentAddress = address;
  saveToStorage(walletId, address);
  return address;
};

// Sign transaction
export const signTransaction = async (xdr: string): Promise<string> => {
  console.log('signTransaction called');
  console.log('selectedWalletId:', selectedWalletId);
  console.log('currentAddress:', currentAddress);
  if (!selectedWalletId || !currentAddress) {
    throw new Error('No wallet connected');
  }
  
  switch (selectedWalletId) {
    case 'freighter': {
      const freighterApi = await import('@stellar/freighter-api');
      const result = await freighterApi.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      if (result.error) {
        throw new Error(result.error);
      }
      return result.signedTxXdr;
    }
    
    case 'xbull': {
      const xBull = (window as any).xBullSDK;
      const { signedXDR } = await xBull.signXDR(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
      });
      return signedXDR;
    }
    
    case 'albedo': {
      const { default: albedo } = await import('@albedo-link/intent');
      const result = await albedo.tx({
        xdr,
        network: NETWORK_PASSPHRASE.includes('Test') ? 'testnet' : 'public',
      });
      return result.signed_envelope_xdr;
    }
    
    case 'lobstr': {
      const lobstr = (window as any).lobstr;
      if (lobstr) {
        const { signedXDR } = await lobstr.signTransaction(xdr);
        return signedXDR;
      }
      throw new Error('LOBSTR not available');
    }
    
    default:
      throw new Error('Unknown wallet');
  }
};

// Getters
export const getSelectedWalletId = (): WalletType | null => selectedWalletId;
export const getCurrentAddress = (): string | null => currentAddress;

// Check if already connected (for auto-reconnect)
export const getStoredConnection = (): { walletId: WalletType; address: string } | null => {
  const storedWallet = localStorage.getItem(STORAGE_KEY_WALLET);
  const storedAddress = localStorage.getItem(STORAGE_KEY_ADDRESS);
  
  if (storedWallet && storedAddress) {
    return {
      walletId: storedWallet as WalletType,
      address: storedAddress,
    };
  }
  return null;
};

// Disconnect
export const disconnectWallet = (): void => {
  selectedWalletId = null;
  currentAddress = null;
  clearStorage();
};

// For backward compatibility
export const openWalletModal = async (): Promise<{ publicKey: string; walletId: string } | null> => {
  return null;
};
