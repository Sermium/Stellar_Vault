import { useState, useEffect, useCallback } from 'react';
import freighter from '@stellar/freighter-api';
import { VaultConfig, Proposal, TokenBalance } from '../types';
import * as stellar from '../lib/stellar';

export const useStellarVault = () => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);

  const [vaultConfig, setVaultConfig] = useState<VaultConfig | null>(null);
  const [signers, setSigners] = useState<string[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [vaultBalance, setVaultBalance] = useState<TokenBalance[]>([]);
  const [remainingSpend, setRemainingSpend] = useState<bigint | null>(null);

  const isSigner = publicKey ? signers.includes(publicKey) : false;
  const pendingCount = proposals.filter((p) => p.status === 'Pending').length;
  const approvedCount = proposals.filter((p) => p.status === 'Approved').length;

  useEffect(() => {
    checkFreighterInstalled();
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      loadVaultData();
    }
  }, [connected, publicKey]);

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
    setVaultConfig(null);
    setSigners([]);
    setProposals([]);
    setIsInitialized(false);
    setVaultBalance([]);
  };

  const loadVaultData = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);

      const config = await stellar.loadVaultConfig(publicKey);
      if (config) {
        setVaultConfig(config);
        setIsInitialized(true);

        const [loadedSigners, loadedProposals, balance, spend] = await Promise.all([
          stellar.loadSigners(publicKey),
          stellar.loadProposals(publicKey),
          stellar.loadVaultBalance(publicKey),
          stellar.loadRemainingSpend(publicKey),
        ]);

        setSigners(loadedSigners);
        setProposals(loadedProposals);
        setVaultBalance(balance);
        setRemainingSpend(spend);
      } else {
        setIsInitialized(false);
      }
    } catch (err: any) {
      console.error('Failed to load vault data:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  const initialize = async (name: string, signersList: string, threshold: number) => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);

      const signerAddresses = signersList
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);

      await stellar.initializeVault(publicKey, name, signerAddresses, threshold);
      setSuccess('Vault created successfully!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize vault');
    } finally {
      setLoading(false);
    }
  };

  const propose = async (token: string, to: string, amount: string) => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);

      await stellar.proposeTransfer(publicKey, token, to, amount);
      setSuccess('Transaction proposed successfully!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const approve = async (proposalId: number) => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);

      await stellar.approveProposal(publicKey, proposalId);
      setSuccess(`Transaction #${proposalId} approved!`);
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const execute = async (proposalId: number) => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);

      await stellar.executeProposal(publicKey, proposalId);
      setSuccess(`Transaction #${proposalId} executed!`);
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute');
    } finally {
      setLoading(false);
    }
  };

  const deposit = async (token: string, amount: string) => {
    if (!publicKey) return;

    try {
      setLoading(true);
      setError(null);

      await stellar.depositToVault(publicKey, token, amount);
      setSuccess('Deposit successful!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to deposit');
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    connected,
    publicKey,
    loading,
    error,
    success,
    freighterInstalled,
    vaultConfig,
    signers,
    proposals,
    isInitialized,
    vaultBalance,
    remainingSpend,
    isSigner,
    pendingCount,
    approvedCount,

    // Actions
    connectWallet,
    disconnectWallet,
    loadVaultData,
    initialize,
    propose,
    approve,
    execute,
    deposit,
    setError,
    setSuccess,
  };
};
