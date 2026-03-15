import { useState, useEffect, useCallback } from 'react';
import freighter from '@stellar/freighter-api';
import { VaultConfig, Proposal, TokenBalance, Role, SignerWithRole } from '../types';
import * as stellar from '../lib/stellar';

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
        }
      }
    } catch {
      setFreighterInstalled(false);
    }
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      const accessResult = await freighter.requestAccess();
      if (accessResult.error) throw new Error(accessResult.error);

      const addressResult = await freighter.getAddress();
      if (addressResult.error) throw new Error(addressResult.error);

      if (addressResult.address) {
        setPublicKey(addressResult.address);
        setConnected(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setPublicKey(null);
    setVaultAddress(null);
    setVaultConfig(null);
    setSigners([]);
    setSignersWithRoles([]);
    setProposals([]);
    setIsInitialized(false);
    setVaultBalance([]);
    setUserRole(null);
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
    }
  };

  const loadVaultData = useCallback(async () => {
    if (!publicKey || !vaultAddress) return;

    try {
      setLoading(true);

      const config = await stellar.loadVaultConfig(vaultAddress);
      if (config) {
        setVaultConfig(config);
        setIsInitialized(true);

        const [loadedSigners, loadedProposals, balance, spend, roles] = await Promise.all([
          stellar.loadSigners(vaultAddress),
          stellar.loadProposals(vaultAddress),
          stellar.loadVaultBalance(vaultAddress),
          stellar.loadRemainingSpend(vaultAddress),
          stellar.getAllRoles(vaultAddress),
        ]);

        setSigners(loadedSigners);
        setProposals(loadedProposals);
        setVaultBalance(balance);
        setRemainingSpend(spend);

        // Set signers with roles
        const swRoles: SignerWithRole[] = loadedSigners.map(addr => {
          const roleInfo = roles.find(r => r.address === addr);
          return {
            address: addr,
            role: (roleInfo?.role as Role) || 'Viewer',
          };
        });
        setSignersWithRoles(swRoles);

        // Get current user's role
        const myRole = roles.find(r => r.address === publicKey);
        setUserRole((myRole?.role as Role) || null);
      } else {
        setIsInitialized(false);
      }
    } catch (err: any) {
      console.error('Failed to load vault data:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, vaultAddress]);

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

    // Actions
    connectWallet,
    disconnectWallet,
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
  };
};
