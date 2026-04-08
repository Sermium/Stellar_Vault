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
import {
  insertProposal,
  updateProposalStatus,
  insertLock,
  insertTransaction,
  updateTransactionStatus,
  logActivity,
  notifyVaultSigners,
  updateLockClaim,
  deactivateLock,
  addSigner as dbAddSigner,
  deactivateSigner,
  updateSignerRole,
  updateVaultActivity,
} from '../lib/supabase';

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
  const isAdmin = userRole === 'Admin' || userRole === 'SuperAdmin';
  const canExecute = userRole === 'Admin' || userRole === 'Executor' || userRole === 'SuperAdmin';
  const pendingCount = proposals.filter((p) => p.status === 0).length;
  const approvedCount = proposals.filter((p) => p.status === 1).length;

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

  const selectVault = async (address: string | null) => {
    setVaultAddress(address);
    // Persist selected vault to localStorage
    if (address) {
      localStorage.setItem('selectedVaultAddress', address);
    } else {
      localStorage.removeItem('selectedVaultAddress');
    }
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
    } else if (connected && publicKey) {
      setTimeout(() => loadVaultData(address), 0);
    }
  };

  const loadVaultData = async (addressOverride?: string) => {
    const targetAddress = addressOverride || vaultAddress;
    if (!targetAddress) return;
    
    try {
      setLoading(true);
      setError(null);

      const config = await stellar.loadVaultConfig(targetAddress);
      setVaultConfig(config);

      const signerList = await stellar.loadSigners(targetAddress);
      setSigners(signerList);

      let signersRoles: SignerWithRole[] = [];
      for (const signer of signerList) {
        try {
          const role = await stellar.getRole(targetAddress, signer);
          signersRoles.push({ 
            address: signer, 
            role: (role || 'Executor') as Role 
          });
        } catch {
          signersRoles.push({ address: signer, role: 'Executor' as Role });
        }
      }
      setSignersWithRoles(signersRoles);

      if (publicKey && signerList.includes(publicKey)) {
        const myRole = signersRoles.find(s => s.address === publicKey);
        if (myRole) {
          setUserRole(myRole.role);
        }
      } else {
        setUserRole(null);
      }

      try {
        const proposalList = await stellar.loadProposals(targetAddress);
        setProposals(proposalList);
      } catch {
        setProposals([]);
      }

      try {
        const balances = await stellar.loadVaultBalance(targetAddress);
        setVaultBalance(balances);
      } catch {
        setVaultBalance([]);
      }

      try {
        const lockList = await stellar.loadLocks(targetAddress);
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
      
      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'vault_initialized',
        details: { name, threshold, signers: signerAddresses },
      });

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
      
      const proposalId = proposals.length + 1;
      
      // Save proposal to DB
      await insertProposal({
        vault_address: vaultAddress,
        proposal_id: proposalId,
        proposal_type: 0,
        proposer_address: publicKey,
        token_address: token,
        recipient_address: to,
        amount: amount,
        status: 'Pending',
        approval_count: 1,
        approvals: [publicKey],
        cancel_approvals: [],
        rejection_count: 0,
      });

      // Log transaction
      await insertTransaction({
        vault_address: vaultAddress,
        proposal_id: proposalId,
        tx_type: 'transfer_proposal',
        from_address: vaultAddress,
        to_address: to,
        token_address: token,
        amount: amount,
        status: 'pending',
        created_by: publicKey,
        metadata: { proposal_id: proposalId },
      });

      // Log activity
      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'proposal_created',
        details: { proposal_id: proposalId, token, to, amount },
      });

      // Notify other signers
      await notifyVaultSigners(
        vaultAddress,
        'approval_needed',
        'New proposal needs approval',
        `A transfer of ${amount} to ${to.slice(0, 8)}... requires your approval.`,
        publicKey
      );

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
      
      const proposal = proposals.find(p => p.id === proposalId);
      const currentApprovals = proposal?.approvals || [];
      const newApprovals = [...currentApprovals, publicKey];
      const newApprovalCount = newApprovals.length;
      
      await updateProposalStatus(
        vaultAddress, 
        proposalId, 
        newApprovalCount >= (vaultConfig?.threshold || 1) ? 'Approved' : 'Pending',
        newApprovalCount,
        undefined,
        newApprovals
      );

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'proposal_approved',
        details: { proposal_id: proposalId, approval_count: newApprovalCount },
      });

      // Check if threshold reached, notify for execution
      if (vaultConfig && newApprovalCount >= vaultConfig.threshold) {
        await notifyVaultSigners(
          vaultAddress,
          'ready_to_execute',
          'Proposal ready for execution',
          `Proposal #${proposalId} has reached threshold and can be executed.`,
          publicKey
        );
      }

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

      const proposal = proposals.find(p => p.id === proposalId);

      // ==================== VALIDATION ====================
      if (!proposal) {
        setError('Proposal not found');
        setLoading(false);
        return;
      }

      const now = Math.floor(Date.now() / 1000);

      // Validate TimeLock proposals
      if (proposal.proposal_type === 1) {
        if (!proposal.lock_end_time || proposal.lock_end_time <= 0) {
          setError('Cannot execute: TimeLock is missing unlock time. Please recreate this proposal.');
          setLoading(false);
          return;
        }
        if (proposal.lock_end_time <= now) {
          if (!window.confirm('Warning: Unlock time has already passed. The lock will be immediately claimable by the beneficiary. Continue anyway?')) {
            setLoading(false);
            return;
          }
        }
      }

      // Validate Vesting proposals
      if (proposal.proposal_type === 2) {
        if (!proposal.lock_start_time || proposal.lock_start_time <= 0) {
          setError('Cannot execute: Vesting is missing start time. Please recreate this proposal.');
          setLoading(false);
          return;
        }
        if (!proposal.lock_end_time || proposal.lock_end_time <= 0) {
          setError('Cannot execute: Vesting is missing end time. Please recreate this proposal.');
          setLoading(false);
          return;
        }
        if (proposal.lock_end_time <= proposal.lock_start_time) {
          setError('Cannot execute: Vesting end time must be after start time.');
          setLoading(false);
          return;
        }
        if (proposal.lock_cliff_time && proposal.lock_cliff_time > proposal.lock_end_time) {
          setError('Cannot execute: Cliff time cannot be after end time.');
          setLoading(false);
          return;
        }
      }

      // Validate Transfer proposals
      if (proposal.proposal_type === 0) {
        if (!proposal.recipient) {
          setError('Cannot execute: Transfer is missing recipient address.');
          setLoading(false);
          return;
        }
        if (!proposal.amount || proposal.amount <= 0n) {
          setError('Cannot execute: Transfer has invalid amount.');
          setLoading(false);
          return;
        }
      }
      // ==================== END VALIDATION ====================

      const result = await stellar.executeProposal(publicKey, vaultAddress, proposalId, proposal);
      const txHash = 'hash' in result ? (result as any).hash : undefined;

      // The result contains the lock_id if it was a TimeLock or Vesting proposal
      const lockId = typeof result === 'number' ? result :
        (typeof result === 'object' && 'result' in result) ? Number(result.result) : 0;

      await updateProposalStatus(vaultAddress, proposalId, 'Executed');

      // If this was a TimeLock or Vesting proposal, insert into locks table
      if (proposal.proposal_type === 1 || proposal.proposal_type === 2) {
        await insertLock({
          vault_address: vaultAddress,
          lock_id: lockId || proposalId,
          lock_type: proposal.proposal_type === 1 ? 0 : 1,
          beneficiary_address: proposal.recipient,
          token_address: proposal.token,
          total_amount: proposal.amount.toString(),
          released_amount: '0',
          start_time: new Date(proposal.lock_start_time * 1000).toISOString(),
          end_time: new Date(proposal.lock_end_time * 1000).toISOString(),
          cliff_time: proposal.lock_cliff_time ? new Date(proposal.lock_cliff_time * 1000).toISOString() : new Date(proposal.lock_start_time * 1000).toISOString(),
          release_intervals: proposal.lock_release_intervals || 0,
          revocable: proposal.lock_revocable || false,
          is_active: true,
          name: proposal.lock_description || (proposal.proposal_type === 1 ? 'Time Lock' : 'Vesting'),
          created_by: proposal.proposer,
        });

        await logActivity({
          vault_address: vaultAddress,
          actor_address: publicKey,
          action: proposal.proposal_type === 1 ? 'timelock_created' : 'vesting_created',
          details: { proposal_id: proposalId, lock_id: lockId, beneficiary: proposal.recipient },
          tx_hash: txHash,
        });

        setSuccess(`${proposal.proposal_type === 1 ? 'Time Lock' : 'Vesting'} #${lockId || proposalId} created!`);
      } else {
        await logActivity({
          vault_address: vaultAddress,
          actor_address: publicKey,
          action: 'proposal_executed',
          details: { proposal_id: proposalId },
          tx_hash: txHash,
        });

        setSuccess(`Transaction #${proposalId} executed!`);
      }

      await notifyVaultSigners(
        vaultAddress,
        'proposal_executed',
        'Proposal executed',
        `Proposal #${proposalId} has been executed successfully.`,
        publicKey
      );

      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute');
    } finally {
      setLoading(false);
    }
  };

  const requestCancel = async (proposalId: number) => {
    if (!publicKey || !vaultAddress) return;
    if (!canExecute) {
      setError('You do not have permission to reject proposals');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stellar.requestCancelProposal(publicKey, vaultAddress, proposalId);
      
      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'cancel_requested',
        details: { proposal_id: proposalId },
      });

      await notifyVaultSigners(
        vaultAddress,
        'cancel_requested',
        'Cancellation requested',
        `A request to cancel proposal #${proposalId} needs your vote.`,
        publicKey
      );

      setSuccess(`Rejection requested for proposal #${proposalId}`);
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to request cancellation');
    } finally {
      setLoading(false);
    }
  };

  const approveCancel = async (proposalId: number) => {
    if (!publicKey || !vaultAddress) return;
    if (!canExecute) {
      setError('You do not have permission to approve cancellation');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stellar.approveCancelProposal(publicKey, vaultAddress, proposalId);
      
      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'cancel_approved',
        details: { proposal_id: proposalId },
      });

      setSuccess(`Cancellation approved for proposal #${proposalId}`);
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve cancellation');
    } finally {
      setLoading(false);
    }
  };

  const executeCancel = async (proposalId: number) => {
    if (!publicKey || !vaultAddress) return;
    if (!canExecute) {
      setError('You do not have permission to execute cancellation');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await stellar.executeCancelProposal(publicKey, vaultAddress, proposalId);
      
      await updateProposalStatus(vaultAddress, proposalId, 'Rejected');

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'proposal_rejected',
        details: { proposal_id: proposalId },
      });

      await notifyVaultSigners(
        vaultAddress,
        'proposal_rejected',
        'Proposal rejected',
        `Proposal #${proposalId} has been rejected.`,
        publicKey
      );

      setSuccess(`Proposal #${proposalId} rejected!`);
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute cancellation');
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
      
      await insertTransaction({
        vault_address: vaultAddress,
        tx_type: 'deposit',
        from_address: publicKey,
        to_address: vaultAddress,
        token_address: token,
        amount: amount,
        status: 'executed',
        created_by: publicKey,
      });

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'deposit',
        details: { token, amount },
      });

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

    const roleNum = role === 'SuperAdmin' ? 0 : role === 'Admin' ? 1 : 2;

    try {
      setLoading(true);
      setError(null);

      await stellar.addSignerWithRole(publicKey, vaultAddress, newSigner, roleNum);
      
      // Save to DB
      await dbAddSigner(vaultAddress, newSigner, role, publicKey);

      await insertTransaction({
        vault_address: vaultAddress,
        tx_type: 'add_signer',
        to_address: newSigner,
        status: 'executed',
        created_by: publicKey,
        metadata: { role },
      });

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
      
      await deactivateSigner(vaultAddress, signerToRemove);

      await insertTransaction({
        vault_address: vaultAddress,
        tx_type: 'remove_signer',
        to_address: signerToRemove,
        status: 'executed',
        created_by: publicKey,
      });

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'signer_removed',
        details: { removed_signer: signerToRemove },
      });

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

      const oldThreshold = vaultConfig?.threshold;
      await stellar.setThreshold(publicKey, vaultAddress, newThreshold);
      
      await insertTransaction({
        vault_address: vaultAddress,
        tx_type: 'set_threshold',
        status: 'executed',
        created_by: publicKey,
        metadata: { old_threshold: oldThreshold, new_threshold: newThreshold },
      });

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'threshold_changed',
        details: { old_threshold: oldThreshold, new_threshold: newThreshold },
      });

      await notifyVaultSigners(
        vaultAddress,
        'threshold_changed',
        'Vault threshold changed',
        `Approval threshold changed from ${oldThreshold} to ${newThreshold}.`,
        publicKey
      );

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

    const roleNum = role === 'SuperAdmin' ? 0 : role === 'Admin' ? 1 : 2;

    try {
      setLoading(true);
      setError(null);

      await stellar.setRole(publicKey, vaultAddress, member, roleNum);
      
      await updateSignerRole(vaultAddress, member, role);

      await insertTransaction({
        vault_address: vaultAddress,
        tx_type: 'set_role',
        to_address: member,
        status: 'executed',
        created_by: publicKey,
        metadata: { new_role: role },
      });

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
      
      await deactivateSigner(vaultAddress, publicKey);

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'member_left',
        details: {},
      });

      await notifyVaultSigners(
        vaultAddress,
        'member_left',
        'Member left vault',
        `A member has left the vault.`,
        publicKey
      );
      
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
      
      await insertTransaction({
        vault_address: vaultAddress,
        tx_type: 'set_spend_limit',
        token_address: token,
        amount: limit.toString(),
        status: 'executed',
        created_by: publicKey,
        metadata: { period },
      });

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'spend_limit_set',
        details: { token, limit: limit.toString(), period },
      });

      setSuccess('Spend limit updated successfully!');
      await loadVaultData();
    } catch (err: any) {
      setError(err.message || 'Failed to set spend limit');
      throw err;
    } finally {
      setLoading(false);
    }
  };

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
      
      // This returns a PROPOSAL ID, not a lock ID
      const proposalId = await stellar.createTimeLock(
        publicKey,
        vaultAddress,
        beneficiary,
        token,
        amountBigInt,
        unlockTime,
        revocable,
        description
      );

      const now = new Date();

      // Insert into PROPOSALS table, not locks
      await insertProposal({
        vault_address: vaultAddress,
        proposal_id: proposalId,
        proposal_type: 1, // TimeLock
        proposer_address: publicKey,
        token_address: token,
        recipient_address: beneficiary,
        amount: amountBigInt.toString(),
        start_time: now.toISOString(),
        end_time: new Date(unlockTime * 1000).toISOString(),
        revocable,
        description,
        status: 'Pending',
        approval_count: 1,
        approvals: [publicKey],
        cancel_approvals: [],
      });

      await insertTransaction({
        vault_address: vaultAddress,
        proposal_id: proposalId,
        tx_type: 'timelock_proposal',
        to_address: beneficiary,
        token_address: token,
        amount: amountBigInt.toString(),
        status: 'pending',
        created_by: publicKey,
        metadata: { proposal_id: proposalId, unlock_time: unlockTime, revocable },
      });

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'timelock_proposed',
        details: { proposal_id: proposalId, beneficiary, amount: amountBigInt.toString(), unlock_time: unlockTime },
      });

      await notifyVaultSigners(
        vaultAddress,
        'new_proposal',
        'New Time Lock Proposal',
        `A new time lock proposal #${proposalId} requires approval.`,
        publicKey
      );

      setSuccess(`Time Lock proposal #${proposalId} created! Needs ${vaultConfig?.threshold || 1} approvals.`);
      await loadVaultData();
      return proposalId;
    } catch (err: any) {
      setError(err.message || 'Failed to create time lock proposal');
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
      
      // This returns a PROPOSAL ID, not a lock ID
      const proposalId = await stellar.createVestingLock(
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

      const endTime = startTime + totalDuration;
      const cliffTime = startTime + cliffDuration;

      // Insert into PROPOSALS table, not locks
      await insertProposal({
        vault_address: vaultAddress,
        proposal_id: proposalId,
        proposal_type: 2, // Vesting
        proposer_address: publicKey,
        token_address: token,
        recipient_address: beneficiary,
        amount: amountBigInt.toString(),
        start_time: new Date(startTime * 1000).toISOString(),
        end_time: new Date(endTime * 1000).toISOString(),
        cliff_time: new Date(cliffTime * 1000).toISOString(),
        release_intervals: releaseIntervals,
        revocable,
        description,
        status: 'Pending',
        approval_count: 1,
        approvals: [publicKey],
        cancel_approvals: [],
      });

      await insertTransaction({
        vault_address: vaultAddress,
        proposal_id: proposalId,
        tx_type: 'vesting_proposal',
        to_address: beneficiary,
        token_address: token,
        amount: amountBigInt.toString(),
        status: 'pending',
        created_by: publicKey,
        metadata: {
          proposal_id: proposalId,
          start_time: startTime,
          cliff_duration: cliffDuration,
          total_duration: totalDuration,
          release_intervals: releaseIntervals,
          revocable,
        },
      });

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'vesting_proposed',
        details: {
          proposal_id: proposalId,
          beneficiary,
          amount: amountBigInt.toString(),
          start_time: startTime,
          cliff_duration: cliffDuration,
          total_duration: totalDuration,
        },
      });

      await notifyVaultSigners(
        vaultAddress,
        'new_proposal',
        'New Vesting Proposal',
        `A new vesting proposal #${proposalId} requires approval.`,
        publicKey
      );

      setSuccess(`Vesting proposal #${proposalId} created! Needs ${vaultConfig?.threshold || 1} approvals.`);
      await loadVaultData();
      return proposalId;
    } catch (err: any) {
      setError(err.message || 'Failed to create vesting proposal');
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
      
      // Get current lock to calculate new total
      const currentLock = locks.find(l => l.id === lockId || l.lock_id === lockId);
      const previousClaimed = currentLock?.total_claimed || '0';
      const newTotalClaimed = (BigInt(previousClaimed) + claimed).toString();
      
      await updateLockClaim(vaultAddress, lockId, claimed.toString(), newTotalClaimed);

      await insertTransaction({
        vault_address: vaultAddress,
        tx_type: 'claim_lock',
        from_address: vaultAddress,
        to_address: publicKey,
        amount: claimed.toString(),
        status: 'executed',
        created_by: publicKey,
        metadata: { lock_id: lockId },
      });

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'lock_claimed',
        details: { lock_id: lockId, amount_claimed: claimed.toString() },
      });
      
      setSuccess(`Claimed ${claimedXLM.toFixed(7)} from lock #${lockId}`);
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
      
      await deactivateLock(vaultAddress, lockId);

      await insertTransaction({
        vault_address: vaultAddress,
        tx_type: 'cancel_lock',
        amount: reclaimed.toString(),
        status: 'executed',
        created_by: publicKey,
        metadata: { lock_id: lockId },
      });

      await logActivity({
        vault_address: vaultAddress,
        actor_address: publicKey,
        action: 'lock_cancelled',
        details: { lock_id: lockId, amount_reclaimed: reclaimed.toString() },
      });
      
      setSuccess(`Lock #${lockId} cancelled. ${reclaimedXLM.toFixed(7)} returned to vault.`);
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
    connect,
    disconnect,
    selectVault,
    loadVaultData,
    initialize,
    propose,
    approve,
    execute,
    requestCancel,
    approveCancel,
    executeCancel,
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
