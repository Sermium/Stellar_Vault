import { useState, useEffect } from 'react';
import freighter from '@stellar/freighter-api';
import { VaultConfig, Proposal, TokenBalance, Role, SignerWithRole } from '../types';
import * as stellar from '../lib/stellar';
import { 
  disconnectWallet as disconnectWalletService, 
  getStoredConnection, 
  WalletType,
  setWalletConnection 
} from '../services/walletService';

export const useStellarVault = () => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);

  const [vaultConfig, setVaultConfig] = useState<VaultConfig | null>(null);
  const [signers, setSigners] = useState<string[]>([]);
  const [signersWithRoles, setSignersWithRoles] = useState<SignerWithRole[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [vaultBalance, setVaultBalance] = useState<TokenBalance[]>([]);
  const [remainingSpend, setRemainingSpend] = useState<bigint | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [locks, setLocks] = useState<any[]>([]);
  const [lockedAmounts, setLockedAmounts] = useState<Record<string, bigint>>({});

  // Computed values
  const isSigner = publicKey ? signers.includes(publicKey) : false;
  const isAdmin = userRole === 'Admin';
  const canExecute = userRole === 'Admin' || userRole === 'Executor';
  const pendingCount = proposals.filter((p) => p.status === 'Pending').length;
  const approvedCount = proposals.filter((p) => p.status === 'Approved').length;

  useEffect(() => {
    checkFreighterInstalled();
  }, []);

  useEffect(() => {
    if (connected && publicKey && vaultAddress) {
      loadVaultData();
    }
  }, [connected, publicKey, vaultAddress]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const stored = getStoredConnection();
    if (stored) {
      setPublicKey(stored.address);
      setWalletId(stored.walletId);
      setConnected(true);
      setWalletConnection(stored.walletId, stored.address);
    }
}, []);

  const checkFreighterInstalled = async () => {
    try {
      await freighter.isConnected();
      setFreighterInstalled(true);

      const isAllowed = await freighter.isAllowed();
      if (isAllowed.isAllowed) {
        const addressResult = await freighter.getAddress();
        if (addressResult.address) {
          setPublicKey(addressResult.address);
          setConnected(true);
          setWalletId('freighter');
          // Important: Update the wallet service!
          setWalletConnection('freighter', addressResult.address);
        }
      }
    } catch {
      setFreighterInstalled(false);
    }
  };

  const connect = (pubKey: string, walletId: string) => {
    setPublicKey(pubKey);
    setConnected(true);
    setWalletId(walletId);
    // Update the wallet service so signTransaction works
    setWalletConnection(walletId as WalletType, pubKey);
  };

  const disconnect = () => {
    disconnectWalletService();
    setPublicKey(null);
    setConnected(false);
    setWalletId(null);
    setVaultAddress(null);
    setVaultConfig(null);
    setSigners([]);
    setSignersWithRoles([]);
    setProposals([]);
    setVaultBalance([]);
    setLocks([]);
    setUserRole(null);
    setIsInitialized(false);
  };

  const selectVault = (address: string | null) => {
    setVaultAddress(address);
    if (!address) {
      setVaultConfig(null);
      setSigners([]);
      setSignersWithRoles([]);
      setProposals([]);
      setIsInitialized(false);
      setVaultBalance([]);
      setRemainingSpend(null);
      setUserRole(null);
      setLocks([]);
    }
  };

  const loadVaultData = async () => {
    if (!vaultAddress) return;
    
    try {
      setLoading(true);
      setError(null);

      // Load config
      const config = await stellar.loadVaultConfig(vaultAddress);
      setVaultConfig(config);

      // Load signers
      const signerList = await stellar.loadSigners(vaultAddress);
      setSigners(signerList);

      // Load all roles at once
      let signersRoles: SignerWithRole[] = [];
        for (const signer of signerList) {
          try {
            const role = await stellar.getRole(vaultAddress, signer);
            signersRoles.push({ 
              address: signer, 
              role: (role || 'Viewer') as Role 
            });
          } catch {
            signersRoles.push({ address: signer, role: 'Viewer' as Role });
          }
        }
      setSignersWithRoles(signersRoles);

      // Set user role if user is a signer
      if (publicKey && signerList.includes(publicKey)) {
        const myRole = signersRoles.find(s => s.address === publicKey);
        if (myRole) {
          setUserRole(myRole.role);
        }
      } else {
        setUserRole(null);
      }

      // Load proposals
      try {
        const proposalList = await stellar.loadProposals(vaultAddress);
        setProposals(proposalList);
      } catch {
        setProposals([]);
      }

      // Load balances
      try {
        const balances = await stellar.loadVaultBalance(vaultAddress);
        setVaultBalance(balances);
      } catch {
        setVaultBalance([]);
      }

      // Load locks
      try {
        const lockList = await stellar.getLocks(vaultAddress, 0, 100);
        setLocks(lockList || []);
      } catch (err) {
        console.error('Failed to load locks:', err);
        setLocks([]);
      }

      setIsInitialized(true);
    } catch (err: any) {
      console.error('Failed to load vault data:', err);
      setError(err.message || 'Failed to load vault data');
    } finally {
      setLoading(false);
    }
  };

  const initialize = async (name: string, signersList: string, threshold: number) => {
    if (!publicKey || !vaultAddress) return;

    try {
      setLoading(true);
      setError(null);

      const signerAddresses = signersList
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);

      await stellar.initializeVault(publicKey, vaultAddress, name, signerAddresses, threshold);
      setSuccess('Vault initialized successfully!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize vault');
    } finally {
      setLoading(false);
    }
  };

  const propose = async (token: string, to: string, amount: string) => {
    if (!publicKey || !vaultAddress) return;
    if (!canExecute) {
      setError('You do not have permission to create proposals');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stellar.proposeTransfer(publicKey, vaultAddress, token, to, amount);
      setSuccess('Transaction proposed successfully!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const approve = async (proposalId: number) => {
    if (!publicKey || !vaultAddress) return;
    if (!canExecute) {
      setError('You do not have permission to approve proposals');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stellar.approveProposal(publicKey, vaultAddress, proposalId);
      setSuccess(`Transaction #${proposalId} approved!`);
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const execute = async (proposalId: number) => {
    if (!publicKey || !vaultAddress) return;
    if (!canExecute) {
      setError('You do not have permission to execute proposals');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stellar.executeProposal(publicKey, vaultAddress, proposalId);
      setSuccess(`Transaction #${proposalId} executed!`);
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute');
    } finally {
      setLoading(false);
    }
  };

  const deposit = async (token: string, amount: string) => {
    if (!publicKey || !vaultAddress) return;

    try {
      setLoading(true);
      setError(null);

      await stellar.depositToVault(publicKey, vaultAddress, token, amount);
      setSuccess('Deposit successful!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to deposit');
    } finally {
      setLoading(false);
    }
  };

  const addSigner = async (newSigner: string, role: Role = 'Executor') => {
    if (!publicKey || !vaultAddress) return;
    if (!isAdmin) {
      setError('Only admins can add signers');
      return;
    }

    const roleNum = role === 'Admin' ? 0 : role === 'Executor' ? 1 : 2;

    try {
      setLoading(true);
      setError(null);

      await stellar.addSignerWithRole(publicKey, vaultAddress, newSigner, roleNum);
      setSuccess('Signer added successfully!');
      await loadVaultData();
    } catch (err: any) {
      console.error('Add signer error:', err);
      setError(err.message || 'Failed to add signer');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeSigner = async (signerToRemove: string) => {
    if (!publicKey || !vaultAddress) return;
    if (!isAdmin) {
      setError('Only admins can remove signers');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stellar.removeSigner(publicKey, vaultAddress, signerToRemove);
      setSuccess('Signer removed successfully!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove signer');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setThreshold = async (newThreshold: number) => {
    if (!publicKey || !vaultAddress) return;
    if (!isAdmin) {
      setError('Only admins can change threshold');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stellar.setThreshold(publicKey, vaultAddress, newThreshold);
      setSuccess('Threshold updated successfully!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to update threshold');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setMemberRole = async (member: string, role: Role) => {
    if (!publicKey || !vaultAddress) return;
    if (!isAdmin) {
      setError('Only admins can change roles');
      return;
    }

    const roleNum = role === 'Admin' ? 0 : role === 'Executor' ? 1 : 2;

    try {
      setLoading(true);
      setError(null);

      await stellar.setRole(publicKey, vaultAddress, member, roleNum);
      setSuccess('Role updated successfully!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const leaveVault = async () => {
    if (!publicKey || !vaultAddress) return;

    try {
      setLoading(true);
      setError(null);

      await stellar.leaveVault(publicKey, vaultAddress);
      
      setVaultAddress(null);
      setVaultConfig(null);
      setSigners([]);
      setSignersWithRoles([]);
      setProposals([]);
      setVaultBalance([]);
      setLocks([]);
      
      setSuccess('You have left the vault successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to leave vault');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setSpendLimit = async (token: string, limit: bigint, period: number) => {
    if (!publicKey || !vaultAddress) return;
    if (!isAdmin) {
      setError('Only admins can set spend limits');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stellar.setSpendLimit(publicKey, vaultAddress, token, limit);
      setSuccess('Spend limit updated successfully!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to set spend limit');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Lock functions
  const createTimeLock = async (
    beneficiary: string,
    token: string,
    amount: string,
    unlockTime: number,
    revocable: boolean,
    description: string
  ) => {
    if (!publicKey || !vaultAddress) return;
    try {
      setLoading(true);
      setError(null);
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10_000_000));
      const lockId = await stellar.createTimeLock(
        publicKey,
        vaultAddress,
        beneficiary,
        token,
        amountBigInt,
        unlockTime,
        revocable,
        description
      );
      setSuccess(`Time lock #${lockId} created successfully!`);
      await loadVaultData();
      return lockId;
    } catch (err: any) {
      setError(err.message || 'Failed to create time lock');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createVestingLock = async (
    beneficiary: string,
    token: string,
    amount: string,
    startTime: number,
    cliffDuration: number,
    totalDuration: number,
    releaseIntervals: number,
    revocable: boolean,
    description: string
  ) => {
    if (!publicKey || !vaultAddress) return;
    try {
      setLoading(true);
      setError(null);
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 10_000_000));
      const lockId = await stellar.createVestingLock(
        publicKey,
        vaultAddress,
        beneficiary,
        token,
        amountBigInt,
        startTime,
        cliffDuration,
        totalDuration,
        releaseIntervals,
        revocable,
        description
      );
      setSuccess(`Vesting lock #${lockId} created successfully!`);
      await loadVaultData();
      return lockId;
    } catch (err: any) {
      setError(err.message || 'Failed to create vesting lock');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const claimLock = async (lockId: number) => {
    if (!publicKey || !vaultAddress) return;
    try {
      setLoading(true);
      setError(null);
      const claimed = await stellar.claimLock(publicKey, vaultAddress, lockId);
      const claimedXLM = Number(claimed) / 10_000_000;
      setSuccess(`Claimed ${claimedXLM.toFixed(7)} XLM from lock #${lockId}`);
      await loadVaultData();
      return claimed;
    } catch (err: any) {
      setError(err.message || 'Failed to claim lock');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelLock = async (lockId: number) => {
    if (!publicKey || !vaultAddress) return;
    try {
      setLoading(true);
      setError(null);
      const reclaimed = await stellar.cancelLock(publicKey, vaultAddress, lockId);
      const reclaimedXLM = Number(reclaimed) / 10_000_000;
      setSuccess(`Lock #${lockId} cancelled. ${reclaimedXLM.toFixed(7)} XLM returned to vault.`);
      await loadVaultData();
      return reclaimed;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel lock');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    connected,
    publicKey,
    vaultAddress,
    loading,
    error,
    success,
    freighterInstalled,
    vaultConfig,
    signers,
    signersWithRoles,
    proposals,
    isInitialized,
    vaultBalance,
    remainingSpend,
    isSigner,
    isAdmin,
    canExecute,
    userRole,
    pendingCount,
    approvedCount,
    walletId,
    locks,
    lockedAmounts,
    // Actions
    connect,
    disconnect,
    selectVault,
    loadVaultData,
    initialize,
    propose,
    approve,
    execute,
    deposit,
    addSigner,
    removeSigner,
    setThreshold,
    setMemberRole,
    setError,
    setSuccess,
    setSpendLimit,
    leaveVault,
    createTimeLock,
    createVestingLock,
    claimLock,
    cancelLock,
  };
};
