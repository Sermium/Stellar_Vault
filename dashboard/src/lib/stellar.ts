import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  rpc,
  nativeToScVal,
  scValToNative,
  Address,
  Transaction,
  Keypair,
  Account,
  Asset,
} from '@stellar/stellar-sdk';
import { signTransaction } from '../services/walletService';
import { getRpcUrl, getNativeToken, NETWORK_PASSPHRASE, SUPPORTED_TOKENS } from '../config';
import { VaultConfig, Proposal, TokenBalance } from '../types';
import { getCustomTokens } from '../services/tokensService';
import { getProposals as dbGetProposals, getLocks as dbGetLocks, getVaultSigners } from '../lib/supabase';
 
// Helper to sanitize strings for Soroban Symbol type
const sanitizeSymbol = (input: string): string => {
  return input.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32) || 'lock';
};
 
export const getServer = () => new rpc.Server(getRpcUrl());
export const getContract = (vaultAddress: string) => new Contract(vaultAddress);
export { truncateAddress, formatAmount, formatUSD } from './utils';
 
const getTempAccount = () => new Account(Keypair.random().publicKey(), '0');
 
// ============================================================================
// SIGN AND SUBMIT
// ============================================================================
 
export async function signAndSubmit(
  tx: Transaction,
  server: rpc.Server
): Promise<rpc.Api.GetTransactionResponse> {
  console.log('=== signAndSubmit ===');
 
  const simResult = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    console.error('Simulation failed:', simResult);
    throw new Error(simResult.error || 'Transaction simulation failed');
  }
 
  const preparedTx = rpc.assembleTransaction(tx, simResult).build();
  const signedXdr = await signTransaction(preparedTx.toXDR());
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
 
  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Transaction send failed: ${sendResult.errorResult?.toString() || 'Unknown error'}`);
  }
 
  let getResult = await server.getTransaction(sendResult.hash);
  while (getResult.status === 'NOT_FOUND') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  }
 
  if (getResult.status === 'FAILED') {
    throw new Error('Transaction failed on-chain');
  }
 
  console.log('=== signAndSubmit SUCCESS ===');
  return getResult;
}
 
// ============================================================================
// READ-ONLY: VAULT CONFIG & SIGNERS (from contract)
// ============================================================================
 
export const loadVaultConfig = async (vaultAddress: string): Promise<VaultConfig | null> => {
  try {
    const contract = getContract(vaultAddress);
    const server = getServer();
    const tx = new TransactionBuilder(getTempAccount(), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_config'))
      .setTimeout(30)
      .build();
 
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const config = scValToNative(sim.result.retval);
      return {
        name: config.name?.toString() || config.name,
        threshold: Number(config.threshold),
        signer_count: Number(config.signer_count),
      };
    }
    return null;
  } catch (err) {
    console.error('loadVaultConfig error:', err);
    return null;
  }
};
 
export const loadSigners = async (vaultAddress: string): Promise<string[]> => {
  try {
    const contract = getContract(vaultAddress);
    const server = getServer();
    const tx = new TransactionBuilder(getTempAccount(), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_signers'))
      .setTimeout(30)
      .build();
 
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      return scValToNative(sim.result.retval).map((s: any) => s.toString());
    }
    return [];
  } catch (err) {
    console.error('loadSigners error:', err);
    return [];
  }
};
 
export const getRole = async (vaultAddress: string, member: string): Promise<string | null> => {
  try {
    const contract = getContract(vaultAddress);
    const server = getServer();
    const tx = new TransactionBuilder(getTempAccount(), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_role', new Address(member).toScVal()))
      .setTimeout(30)
      .build();
 
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const roleData = scValToNative(sim.result.retval);
      if (roleData === 0 || roleData?.SuperAdmin !== undefined) return 'SuperAdmin';
      if (roleData === 1 || roleData?.Admin !== undefined) return 'Admin';
      if (roleData === 2 || roleData?.Executor !== undefined) return 'Executor';
      return 'Executor';
    }
    return null;
  } catch {
    return null;
  }
};
 
// ============================================================================
// READ-ONLY: PROPOSALS (from Supabase)
// ============================================================================
 
export const loadProposals = async (vaultAddress: string): Promise<Proposal[]> => {
  try {
    const rows = await dbGetProposals(vaultAddress);
    return rows.map((row: any) => {
      let statusValue = 0;
      if (row.status === 'Pending') statusValue = 0;
      else if (row.status === 'Approved') statusValue = 1;
      else if (row.status === 'Executed') statusValue = 2;
      else if (row.status === 'Rejected') statusValue = 3;
 
      return {
        id: Number(row.proposal_id),
        proposal_type: (Number(row.proposal_type || 0) as 0 | 1 | 2),
        proposer: row.proposer_address || '',
        token: row.token_address || '',
        recipient: row.recipient_address || '',
        amount: BigInt(row.amount || '0'),
        approvals: row.approvals || [],
        cancel_approvals: row.cancel_approvals || [],
        status: statusValue,
        created_at: row.created_at ? Math.floor(new Date(row.created_at).getTime() / 1000) : 0,
        lock_start_time: row.start_time ? Math.floor(new Date(row.start_time).getTime() / 1000) : 0,
        lock_end_time: row.end_time ? Math.floor(new Date(row.end_time).getTime() / 1000) : 0,
        lock_cliff_time: row.cliff_time ? Math.floor(new Date(row.cliff_time).getTime() / 1000) : 0,
        lock_release_intervals: Number(row.release_intervals || 0),
        lock_revocable: Boolean(row.revocable),
        lock_description: row.description || '',
      };
    });
  } catch (err) {
    console.error('loadProposals error:', err);
    return [];
  }
};
 
// ============================================================================
// READ-ONLY: LOCKS (from Supabase)
// ============================================================================
 
export const loadLocks = async (vaultAddress: string): Promise<any[]> => {
  try {
    const rows = await dbGetLocks(vaultAddress);
    return rows.map((row: any) => ({
      id: Number(row.lock_id),
      lock_id: Number(row.lock_id),
      creator: row.created_by || '',
      beneficiary: row.beneficiary_address || '',
      token: row.token_address || '',
      total_amount: BigInt(row.total_amount || '0'),
      released_amount: BigInt(row.released_amount || '0'),
      lock_type: row.lock_type === 0 ? 'TimeLock' : 'Vesting',
      status: row.is_active ? 'Active' : 'Cancelled',
      created_at: row.created_at ? Math.floor(new Date(row.created_at).getTime() / 1000) : 0,
      start_time: row.start_time ? Math.floor(new Date(row.start_time).getTime() / 1000) : 0,
      end_time: row.end_time ? Math.floor(new Date(row.end_time).getTime() / 1000) : 0,
      cliff_time: row.cliff_time ? Math.floor(new Date(row.cliff_time).getTime() / 1000) : 0,
      release_intervals: Number(row.release_intervals || 0),
      revocable: Boolean(row.revocable),
      description: row.name || '',
      total_claimed: row.total_claimed || '0',
    }));
  } catch (err) {
    console.error('loadLocks error:', err);
    return [];
  }
};
 
// Alias for backward compatibility
export const getLocks = loadLocks;
 
// ============================================================================
// READ-ONLY: BALANCES
// ============================================================================
 
export async function loadVaultBalance(vaultAddress: string): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = [];
  const server = getServer();
 
  const customTokens = getCustomTokens();
  const allTokens = [
    ...SUPPORTED_TOKENS,
    ...customTokens.map(t => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      icon: t.icon,
    }))
  ];
 
  const uniqueTokens = allTokens.filter((token, index, self) =>
    index === self.findIndex(t => t.address === token.address)
  );
 
  for (const token of uniqueTokens) {
    try {
      const contract = new Contract(token.address);
      const tx = new TransactionBuilder(getTempAccount(), {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('balance', new Address(vaultAddress).toScVal()))
        .setTimeout(30)
        .build();
 
      const simulation = await server.simulateTransaction(tx);
      let balance = BigInt(0);
      if (rpc.Api.isSimulationSuccess(simulation) && simulation.result?.retval) {
        balance = BigInt(scValToNative(simulation.result.retval));
      }
 
      balances.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        icon: token.icon,
        balance,
      });
    } catch (error) {
      balances.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name || token.symbol,
        decimals: token.decimals,
        icon: token.icon,
        balance: BigInt(0),
      });
    }
  }
 
  return balances;
}
 
// ============================================================================
// WRITE: DEPOSIT (token transfer, not a vault contract call)
// ============================================================================
 
export const depositToVault = async (
  publicKey: string,
  vaultAddress: string,
  token: string,
  amount: string
) => {
  const server = getServer();
  const tokenContract = new Contract(token);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      tokenContract.call(
        'transfer',
        new Address(publicKey).toScVal(),
        new Address(vaultAddress).toScVal(),
        nativeToScVal(BigInt(amount), { type: 'i128' })
      )
    )
    .setTimeout(30)
    .build();
 
  return signAndSubmit(tx, server);
};
 
// ============================================================================
// WRITE: PROPOSE (unified function for all proposal types)
// New contract uses a single `propose` function with proposal_type enum
// ============================================================================
 
export const proposeTransfer = async (
  publicKey: string,
  vaultAddress: string,
  token: string,
  to: string,
  amount: string
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  // ProposalType::Transfer = 0
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'propose',
        new Address(publicKey).toScVal(),
        nativeToScVal(0, { type: 'u32' }),              // proposal_type: Transfer
        new Address(token).toScVal(),                     // token
        new Address(to).toScVal(),                        // recipient
        nativeToScVal(BigInt(amount), { type: 'i128' }), // amount
        nativeToScVal(0, { type: 'u64' }),               // start_time
        nativeToScVal(0, { type: 'u64' }),               // end_time
        nativeToScVal(0, { type: 'u64' }),               // cliff_time
        nativeToScVal(0, { type: 'u64' }),               // release_intervals
        nativeToScVal(false, { type: 'bool' }),          // revocable
        nativeToScVal('transfer', { type: 'symbol' })    // description
      )
    )
    .setTimeout(300)
    .build();
 
  return signAndSubmit(tx, server);
};
 
// ============================================================================
// WRITE: APPROVE PROPOSAL
// ============================================================================
 
export const approveProposal = async (
  publicKey: string,
  vaultAddress: string,
  proposalId: number
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'approve',
        new Address(publicKey).toScVal(),
        nativeToScVal(proposalId, { type: 'u64' })
      )
    )
    .setTimeout(300)
    .build();
 
  return signAndSubmit(tx, server);
};
 
// ============================================================================
// WRITE: REJECT PROPOSAL (replaces request_cancel / approve_cancel)
// ============================================================================
 
export const rejectProposal = async (
  publicKey: string,
  vaultAddress: string,
  proposalId: number
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'reject',
        new Address(publicKey).toScVal(),
        nativeToScVal(proposalId, { type: 'u64' })
      )
    )
    .setTimeout(300)
    .build();
 
  return signAndSubmit(tx, server);
};
 
// Backward compat aliases
export const requestCancelProposal = rejectProposal;
export const approveCancelProposal = rejectProposal;
export const executeCancelProposal = rejectProposal;
 
// ============================================================================
// WRITE: EXECUTE PROPOSAL
// New contract requires all proposal params to be passed at execution
// ============================================================================
 
export const executeProposal = async (
  publicKey: string,
  vaultAddress: string,
  proposalId: number,
  proposal?: Proposal
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  // If proposal details provided, use them; otherwise use defaults for transfer
  const pType = proposal?.proposal_type ?? 0;
  const token = proposal?.token || getNativeToken();
  const recipient = proposal?.recipient || publicKey;
  const amount = proposal?.amount ? BigInt(proposal.amount) : BigInt(0);
  const startTime = proposal?.lock_start_time ?? 0;
  const endTime = proposal?.lock_end_time ?? 0;
  const cliffTime = proposal?.lock_cliff_time ?? 0;
  const releaseIntervals = proposal?.lock_release_intervals ?? 0;
  const revocable = proposal?.lock_revocable ?? false;

  console.log('executeProposal params:', {
    publicKey,
    vaultAddress,
    proposalId,
    pType,
    token,
    recipient,
    amount: amount.toString(),
    startTime,
    endTime,
    cliffTime,
    releaseIntervals,
    revocable,
    proposal
  });
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'execute',
        new Address(publicKey).toScVal(),
        nativeToScVal(proposalId, { type: 'u64' }),
        nativeToScVal(pType, { type: 'u32' }),
        new Address(token).toScVal(),
        new Address(recipient).toScVal(),
        nativeToScVal(amount, { type: 'i128' }),
        nativeToScVal(startTime, { type: 'u64' }),
        nativeToScVal(endTime, { type: 'u64' }),
        nativeToScVal(cliffTime, { type: 'u64' }),
        nativeToScVal(releaseIntervals, { type: 'u64' }),
        nativeToScVal(revocable, { type: 'bool' })
      )
    )
    .setTimeout(300)
    .build();
 
  return signAndSubmit(tx, server);
};
 
// ============================================================================
// WRITE: SIGNER MANAGEMENT
// ============================================================================
 
export async function addSignerWithRole(
  publicKey: string,
  vaultAddress: string,
  newSigner: string,
  roleValue: number
): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'add_signer',
        new Address(publicKey).toScVal(),
        new Address(newSigner).toScVal(),
        nativeToScVal(roleValue, { type: 'u32' })
      )
    )
    .setTimeout(300)
    .build();
 
  await signAndSubmit(tx, server);
}
 
// Simple addSigner that defaults to Executor role
export const addSigner = async (
  publicKey: string,
  vaultAddress: string,
  newSigner: string
) => {
  return addSignerWithRole(publicKey, vaultAddress, newSigner, 2);
};
 
export async function removeSigner(
  publicKey: string,
  vaultAddress: string,
  signerToRemove: string
): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'remove_signer',
        new Address(publicKey).toScVal(),
        new Address(signerToRemove).toScVal()
      )
    )
    .setTimeout(300)
    .build();
 
  await signAndSubmit(tx, server);
}
 
export async function setRole(
  publicKey: string,
  vaultAddress: string,
  member: string,
  roleValue: number
): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'set_role',
        new Address(publicKey).toScVal(),
        new Address(member).toScVal(),
        nativeToScVal(roleValue, { type: 'u32' })
      )
    )
    .setTimeout(300)
    .build();
 
  await signAndSubmit(tx, server);
}
 
export async function setThreshold(
  publicKey: string,
  vaultAddress: string,
  newThreshold: number
): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'set_threshold',
        new Address(publicKey).toScVal(),
        nativeToScVal(newThreshold, { type: 'u32' })
      )
    )
    .setTimeout(300)
    .build();
 
  await signAndSubmit(tx, server);
}
 
export async function leaveVault(publicKey: string, vaultAddress: string): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'leave_vault',
        new Address(publicKey).toScVal()
      )
    )
    .setTimeout(300)
    .build();
 
  await signAndSubmit(tx, server);
}
 
// ============================================================================
// WRITE: TIME LOCK (uses unified propose with ProposalType::TimeLock = 1)
// ============================================================================
 
export async function createTimeLock(
  publicKey: string,
  vaultAddress: string,
  beneficiary: string,
  token: string,
  amount: bigint,
  unlockTime: number,
  revocable: boolean,
  lock_description: string
): Promise<number> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
  const now = Math.floor(Date.now() / 1000);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'propose',
        new Address(publicKey).toScVal(),
        nativeToScVal(1, { type: 'u32' }),               // ProposalType::TimeLock
        new Address(token).toScVal(),
        new Address(beneficiary).toScVal(),
        nativeToScVal(amount, { type: 'i128' }),
        nativeToScVal(now, { type: 'u64' }),              // start_time
        nativeToScVal(unlockTime, { type: 'u64' }),       // end_time
        nativeToScVal(0, { type: 'u64' }),                // cliff_time (not used for time lock)
        nativeToScVal(0, { type: 'u64' }),                // release_intervals
        nativeToScVal(revocable, { type: 'bool' }),
        nativeToScVal(sanitizeSymbol(lock_description), { type: 'symbol' })
      )
    )
    .setTimeout(300)
    .build();
 
  const result = await signAndSubmit(tx, server);
  if (result.status === 'SUCCESS' && 'returnValue' in result && result.returnValue) {
    return Number(scValToNative(result.returnValue));
  }
  return 0;
}
 
// ============================================================================
// WRITE: VESTING LOCK (uses unified propose with ProposalType::VestingLock = 2)
// ============================================================================
 
export async function createVestingLock(
  publicKey: string,
  vaultAddress: string,
  beneficiary: string,
  token: string,
  amount: bigint,
  startTime: number,
  cliffDuration: number,
  totalDuration: number,
  releaseIntervals: number,
  revocable: boolean,
  lock_description: string
): Promise<number> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const actualStart = startTime > 0 ? startTime : Math.floor(Date.now() / 1000);
  const cliffTime = actualStart + cliffDuration;
  const endTime = actualStart + totalDuration;
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'propose',
        new Address(publicKey).toScVal(),
        nativeToScVal(2, { type: 'u32' }),               // ProposalType::VestingLock
        new Address(token).toScVal(),
        new Address(beneficiary).toScVal(),
        nativeToScVal(amount, { type: 'i128' }),
        nativeToScVal(actualStart, { type: 'u64' }),
        nativeToScVal(endTime, { type: 'u64' }),
        nativeToScVal(cliffTime, { type: 'u64' }),
        nativeToScVal(releaseIntervals, { type: 'u64' }),
        nativeToScVal(revocable, { type: 'bool' }),
        nativeToScVal(sanitizeSymbol(lock_description), { type: 'symbol' })
      )
    )
    .setTimeout(300)
    .build();
 
  const result = await signAndSubmit(tx, server);
  if (result.status === 'SUCCESS' && 'returnValue' in result && result.returnValue) {
    return Number(scValToNative(result.returnValue));
  }
  return 0;
}
 
// ============================================================================
// WRITE: CLAIM / CANCEL LOCK
// ============================================================================
 
export async function claimLock(
  publicKey: string,
  vaultAddress: string,
  lockId: number
): Promise<bigint> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'claim_lock',
        new Address(publicKey).toScVal(),
        nativeToScVal(lockId, { type: 'u64' })
      )
    )
    .setTimeout(300)
    .build();
 
  const result = await signAndSubmit(tx, server);
  if (result.status === 'SUCCESS' && 'returnValue' in result && result.returnValue) {
    return BigInt(scValToNative(result.returnValue));
  }
  return BigInt(0);
}
 
export async function cancelLock(
  publicKey: string,
  vaultAddress: string,
  lockId: number
): Promise<bigint> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'cancel_lock',
        new Address(publicKey).toScVal(),
        nativeToScVal(lockId, { type: 'u64' })
      )
    )
    .setTimeout(300)
    .build();
 
  const result = await signAndSubmit(tx, server);
  if (result.status === 'SUCCESS' && 'returnValue' in result && result.returnValue) {
    return BigInt(scValToNative(result.returnValue));
  }
  return BigInt(0);
}
 
// ============================================================================
// READ-ONLY: LOCK QUERIES (from contract for on-chain state)
// ============================================================================
 
export async function getLock(vaultAddress: string, lockId: number): Promise<any> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const tx = new TransactionBuilder(getTempAccount(), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_lock', nativeToScVal(lockId, { type: 'u64' })))
    .setTimeout(30)
    .build();
 
  const result = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(result) && result.result?.retval) {
    return scValToNative(result.result.retval);
  }
  return null;
}
 
export async function getTokenLockedAmount(vaultAddress: string, token: string): Promise<bigint> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const tx = new TransactionBuilder(getTempAccount(), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_token_locked', new Address(token).toScVal()))
    .setTimeout(30)
    .build();
 
  const result = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(result) && result.result?.retval) {
    return BigInt(scValToNative(result.result.retval));
  }
  return BigInt(0);
}
 
export async function getAvailableBalance(vaultAddress: string, token: string): Promise<bigint> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const tx = new TransactionBuilder(getTempAccount(), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_available_balance', new Address(token).toScVal()))
    .setTimeout(30)
    .build();
 
  const result = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(result) && result.result?.retval) {
    return BigInt(scValToNative(result.result.retval));
  }
  return BigInt(0);
}
 
// ============================================================================
// REMOVED FUNCTIONS (not in new contract)
// Kept as no-ops for backward compatibility
// ============================================================================
 
export const loadRemainingSpend = async (_vaultAddress: string): Promise<bigint | null> => null;
 
export async function setSpendLimit(
  _publicKey: string,
  _vaultAddress: string,
  _token: string,
  _dailyLimit: bigint
): Promise<void> {
  console.warn('setSpendLimit is not available in the new contract');
}
 
export const initializeVault = async (
  _publicKey: string,
  _vaultAddress: string,
  _name: string,
  _signerAddresses: string[],
  _threshold: number
) => {
  console.warn('initializeVault: vaults are now initialized by the factory');
};
 
export const getAllRoles = async (vaultAddress: string): Promise<Array<{ address: string; role: string }>> => {
  // New contract has no get_all_roles; iterate signers and call get_role
  try {
    const signerList = await loadSigners(vaultAddress);
    const roles: Array<{ address: string; role: string }> = [];
    for (const signer of signerList) {
      const role = await getRole(vaultAddress, signer);
      roles.push({ address: signer, role: role || 'Executor' });
    }
    return roles;
  } catch {
    return [];
  }
};
 
export const loadAllTokenBalances = loadVaultBalance;
 
// ============================================================================
// TOKEN UTILITIES (unchanged)
// ============================================================================
 
export const getTokenIssuer = async (tokenAddress: string): Promise<string | null> => {
  try {
    const tokenContract = new Contract(tokenAddress);
    const server = getServer();
    const tx = new TransactionBuilder(getTempAccount(), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(tokenContract.call('admin'))
      .setTimeout(30)
      .build();
 
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      return scValToNative(sim.result.retval);
    }
    return null;
  } catch {
    return null;
  }
};
 
export async function isSACToken(tokenAddress: string): Promise<boolean> {
  if (tokenAddress === getNativeToken()) return true;
  try {
    const server = getServer();
    const contract = new Contract(tokenAddress);
    const tx = new TransactionBuilder(getTempAccount(), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('admin'))
      .setTimeout(30)
      .build();
 
    const simulation = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(simulation) && simulation.result?.retval) {
      const adminAddress = scValToNative(simulation.result.retval);
      return typeof adminAddress === 'string' && adminAddress.startsWith('G');
    }
    return false;
  } catch {
    return false;
  }
}
 
export const hasTrustline = async (accountAddress: string, tokenAddress: string): Promise<boolean> => {
  if (tokenAddress === getNativeToken()) return true;
  const isSAC = await isSACToken(tokenAddress);
  if (!isSAC) return true;
 
  try {
    const tokenContract = new Contract(tokenAddress);
    const server = getServer();
    const tx = new TransactionBuilder(getTempAccount(), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(tokenContract.call('balance', new Address(accountAddress).toScVal()))
      .setTimeout(30)
      .build();
 
    const sim = await server.simulateTransaction(tx);
    return rpc.Api.isSimulationSuccess(sim);
  } catch {
    return false;
  }
};
 
export const createTrustline = async (publicKey: string, assetCode: string, issuer: string): Promise<any> => {
  const server = getServer();
  const account = await server.getAccount(publicKey);
  const { Asset, Operation } = await import('@stellar/stellar-sdk');
  const asset = new Asset(assetCode, issuer);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(30)
    .build();
  return signAndSubmit(tx, server);
};
 
export async function getTokenInfo(tokenAddress: string): Promise<{
  symbol: string;
  name: string;
  decimals: number;
  issuer: string | null;
} | null> {
  try {
    const server = getServer();
    const contract = new Contract(tokenAddress);
    const tempAccount = getTempAccount();
 
    const symbolTx = new TransactionBuilder(tempAccount, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call('symbol')).setTimeout(30).build();
    const symbolSim = await server.simulateTransaction(symbolTx);
    let symbol = 'UNKNOWN';
    if (rpc.Api.isSimulationSuccess(symbolSim) && symbolSim.result?.retval) {
      symbol = scValToNative(symbolSim.result.retval);
    }
 
    const nameTx = new TransactionBuilder(getTempAccount(), { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call('name')).setTimeout(30).build();
    const nameSim = await server.simulateTransaction(nameTx);
    let name = symbol;
    if (rpc.Api.isSimulationSuccess(nameSim) && nameSim.result?.retval) {
      name = scValToNative(nameSim.result.retval);
    }
 
    const decimalsTx = new TransactionBuilder(getTempAccount(), { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(contract.call('decimals')).setTimeout(30).build();
    const decimalsSim = await server.simulateTransaction(decimalsTx);
    let decimals = 7;
    if (rpc.Api.isSimulationSuccess(decimalsSim) && decimalsSim.result?.retval) {
      decimals = scValToNative(decimalsSim.result.retval);
    }
 
    let issuer: string | null = null;
    try {
      const adminTx = new TransactionBuilder(getTempAccount(), { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
        .addOperation(contract.call('admin')).setTimeout(30).build();
      const adminSim = await server.simulateTransaction(adminTx);
      if (rpc.Api.isSimulationSuccess(adminSim) && adminSim.result?.retval) {
        const admin = scValToNative(adminSim.result.retval);
        if (typeof admin === 'string' && admin.startsWith('G')) issuer = admin;
      }
    } catch { /* not a SAC token */ }
 
    return { symbol, name, decimals, issuer };
  } catch (error) {
    console.error('Failed to get token info:', error);
    return null;
  }
}
 
export const ensureTrustline = async (
  publicKey: string,
  tokenAddress: string,
  assetCode: string,
  issuer?: string
): Promise<boolean> => {
  if (tokenAddress === getNativeToken()) return true;
  const isSAC = await isSACToken(tokenAddress);
  if (!isSAC) return true;
  const hasTrust = await hasTrustline(publicKey, tokenAddress);
  if (hasTrust) return true;
 
  let tokenIssuer: string | undefined = issuer;
  if (!tokenIssuer) {
    const info = await getTokenInfo(tokenAddress);
    tokenIssuer = info?.issuer ?? undefined;
  }
  if (!tokenIssuer) throw new Error('Could not find token issuer');
 
  await createTrustline(publicKey, assetCode, tokenIssuer);
  return true;
};
 
export function deriveSACAddress(assetCode: string, issuer: string): string {
  try {
    if (assetCode === 'XLM' && (!issuer || issuer === 'native')) return getNativeToken();
    const asset = new Asset(assetCode, issuer);
    return asset.contractId(NETWORK_PASSPHRASE);
  } catch (error) {
    console.error('Failed to derive SAC address:', error);
    return '';
  }
}
 
// getLockInfo and getLockCount kept as stubs for any remaining references
export async function getLockInfo(_vaultAddress: string, _lockId: number): Promise<any> { return null; }
export async function getLockCount(_vaultAddress: string): Promise<number> { return 0; }