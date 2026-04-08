import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env variables');
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Types
export interface ContractDeployment {
  id: string;
  contract_type: 'registry' | 'factory' | 'vault_wasm';
  network: 'testnet' | 'mainnet';
  version: number;
  address: string | null;
  wasm_hash: string | null;
  is_active: boolean;
  capabilities: number[];
  deployed_at: string;
}

export interface AppConfigRow {
  network: string;
  key: string;
  value: string;
}

export interface VaultRow {
  id: string;
  address: string;
  factory_address: string;
  name: string;
  creator_address: string;
  threshold: number;
  signer_count: number;
  proposal_count: number;
  lock_count: number;
  is_active: boolean;
  created_at: string;
}

export interface VaultSignerRow {
  id: string;
  vault_address: string;
  signer_address: string;
  role: string;
  is_active: boolean;
}

export interface ProposalRow {
  id: string;
  vault_address: string;
  proposal_id: number;
  proposal_type: number;
  proposer_address: string;
  token_address: string | null;
  recipient_address: string | null;
  amount: string | null;
  status: string;
  approval_count: number;
  approvals: string[];
  cancel_approvals: string[];
  rejection_count: number;
  created_at: string;
  // Lock-specific fields (for TimeLock and Vesting proposals)
  start_time?: string | null;
  end_time?: string | null;
  cliff_time?: string | null;
  release_intervals?: number | null;
  revocable?: boolean | null;
  description?: string | null;
  executed_at?: string | null;
  result_lock_id?: number | null;
}

export interface LockRow {
  id: string;
  vault_address: string;
  lock_id: number;
  lock_type: number;
  beneficiary_address: string;
  token_address: string;
  total_amount: string;
  released_amount: string;
  start_time: string;
  end_time: string;
  cliff_time?: string;
  release_intervals?: number;
  revocable?: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  name?: string;
  notes?: string;
  created_by?: string;
  last_claim_at?: string;
  total_claimed?: string;
}

// Fetch active contracts
export async function getActiveContracts(network: 'testnet' | 'mainnet' = 'testnet'): Promise<ContractDeployment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('contract_deployments')
    .select('*')
    .eq('network', network)
    .eq('is_active', true);
  if (error) { console.error('getActiveContracts error:', error); return []; }
  return data as ContractDeployment[];
}

// Fetch app config as key-value map
export async function getAppConfig( network: 'testnet' | 'mainnet' = 'testnet'): Promise<Record<string, string>> {

  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase
    .from('app_config')
    .select('key, value')
    .eq('network', network)
    .returns<{ key: string; value: string }[]>();

  if (error) {
    console.error('getAppConfig error:', error);
    return {};
  }

  return (data || []).reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
}

// Fetch vaults for a signer
export async function getVaultsForSigner(signerAddress: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('v_user_vaults')
    .select('*')
    .eq('signer_address', signerAddress);
  if (error) { console.error('getVaultsForSigner error:', error); return []; }
  return data;
}

// Fetch single vault
export async function getVault(vaultAddress: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('vaults')
    .select('*')
    .eq('address', vaultAddress)
    .single();
  if (error) { console.error('getVault error:', error); return null; }
  return data as VaultRow;
}

// Fetch vault signers
export async function getVaultSigners(vaultAddress: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('vault_signers')
    .select('*')
    .eq('vault_address', vaultAddress)
    .eq('is_active', true);
  if (error) { console.error('getVaultSigners error:', error); return []; }
  return data as VaultSignerRow[];
}

// Fetch proposals for vault
export async function getProposals(vaultAddress: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('vault_address', vaultAddress)
    .order('proposal_id', { ascending: false });
  if (error) { console.error('getProposals error:', error); return []; }
  return data as ProposalRow[];
}

// Fetch locks for vault
export async function getLocks(vaultAddress: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('locks')
    .select('*')
    .eq('vault_address', vaultAddress)
    .eq('is_active', true)  // Only return active (executed) locks
    .order('lock_id', { ascending: false });
  if (error) { console.error('getLocks error:', error); return []; }
  return data as LockRow[];
}

// Fetch locks for beneficiary
export async function getLocksForBeneficiary(beneficiaryAddress: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('locks')
    .select('*, vaults(name)')
    .eq('beneficiary_address', beneficiaryAddress)
    .eq('is_active', true);
  if (error) { console.error('getLocksForBeneficiary error:', error); return []; }
  return data;
}

// Insert vault
export async function insertVault(vault: Partial<VaultRow>) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('vaults')
    .insert(vault)
    .select()
    .single();
  if (error) { console.error('insertVault error:', error); return null; }
  return data;
}

// Insert vault signers
export async function insertVaultSigners(signers: Partial<VaultSignerRow>[]) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('vault_signers')
    .insert(signers)
    .select();
  if (error) { console.error('insertVaultSigners error:', error); return null; }
  return data;
}

// Insert proposal
export async function insertProposal(proposal: Partial<ProposalRow>) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('proposals')
    .insert(proposal)
    .select()
    .single();
  if (error) { console.error('insertProposal error:', error); return null; }
  return data;
}

// Update proposal status
export async function updateProposalStatus(
  vaultAddress: string,
  proposalId: number,
  status: string,
  approvalCount?: number,
  rejectionCount?: number,
  approvals?: string[],
  cancelApprovals?: string[]
) {
  if (!supabase) return null;
  const update: Record<string, unknown> = { status };
  if (approvalCount !== undefined) update.approval_count = approvalCount;
  if (rejectionCount !== undefined) update.rejection_count = rejectionCount;
  if (approvals !== undefined) update.approvals = approvals;
  if (cancelApprovals !== undefined) update.cancel_approvals = cancelApprovals;
  if (status === 'Executed') update.executed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('proposals')
    .update(update)
    .eq('vault_address', vaultAddress)
    .eq('proposal_id', proposalId)
    .select()
    .single();
  if (error) { console.error('updateProposalStatus error:', error); return null; }
  return data;
}

// Insert lock
export async function insertLock(lock: Partial<LockRow>) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('locks')
    .insert(lock)
    .select()
    .single();
  if (error) { console.error('insertLock error:', error); return null; }
  return data;
}

// ============ NEW TYPES ============

export interface TransactionRow {
  id: string;
  vault_address: string;
  proposal_id: number | null;
  tx_hash: string | null;
  tx_type: string;
  from_address: string | null;
  to_address: string | null;
  token_address: string | null;
  amount: string | null;
  status: string;
  created_by: string;
  created_at: string;
  executed_at: string | null;
  executed_by: string | null;
  metadata: Record<string, any> | null;
}

export interface ActivityLogRow {
  id: string;
  vault_address: string;
  actor_address: string;
  action: string;
  details: Record<string, any> | null;
  tx_hash: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_address: string;
  vault_address: string | null;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

export interface UserPreferencesRow {
  address: string;
  display_name: string | null;
  email: string | null;
  notification_settings: Record<string, boolean>;
  theme: string;
  created_at: string;
  updated_at: string;
}

// ============ TRANSACTION FUNCTIONS ============

export async function insertTransaction(tx: {
  vault_address: string;
  proposal_id?: number;
  tx_hash?: string;
  tx_type: string;
  from_address?: string;
  to_address?: string;
  token_address?: string;
  amount?: string;
  status?: string;
  created_by: string;
  metadata?: Record<string, any>;
}) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ...tx,
      status: tx.status || 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('insertTransaction error:', error);
    return null;
  }

  // Update vault activity
  await updateVaultActivity(tx.vault_address);
  
  return data as TransactionRow;
}

export async function updateTransactionStatus(
  txId: string,
  status: string,
  executedBy?: string,
  txHash?: string
) {
  if (!supabase) return null;
  
  const updates: Record<string, any> = { status };
  
  if (status === 'executed') {
    updates.executed_at = new Date().toISOString();
    if (executedBy) updates.executed_by = executedBy;
  }
  if (txHash) updates.tx_hash = txHash;

  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', txId)
    .select()
    .single();

  if (error) {
    console.error('updateTransactionStatus error:', error);
    return null;
  }
  return data;
}

export async function getTransactionHistory(vaultAddress: string, limit = 50) {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('vault_address', vaultAddress)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getTransactionHistory error:', error);
    return [];
  }
  return data as TransactionRow[];
}

export async function getTransactionByHash(txHash: string) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('tx_hash', txHash)
    .single();

  if (error) return null;
  return data as TransactionRow;
}

// ============ ACTIVITY LOG FUNCTIONS ============

export async function logActivity(activity: {
  vault_address: string;
  actor_address: string;
  action: string;
  details?: Record<string, any>;
  tx_hash?: string;
}) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('activity_log')
    .insert(activity)
    .select()
    .single();

  if (error) {
    console.error('logActivity error:', error);
    return null;
  }

  // Update vault activity timestamp
  await updateVaultActivity(activity.vault_address);
  
  return data as ActivityLogRow;
}

export async function getActivityLog(vaultAddress: string, limit = 100) {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('vault_address', vaultAddress)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getActivityLog error:', error);
    return [];
  }
  return data as ActivityLogRow[];
}

export async function getUserActivity(userAddress: string, limit = 50) {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('actor_address', userAddress)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getUserActivity error:', error);
    return [];
  }
  return data as ActivityLogRow[];
}

// ============ NOTIFICATION FUNCTIONS ============

export async function createNotification(notification: {
  user_address: string;
  vault_address?: string;
  type: string;
  title: string;
  message?: string;
}) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notification,
      read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('createNotification error:', error);
    return null;
  }
  return data as NotificationRow;
}

export async function getUnreadNotifications(userAddress: string) {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_address', userAddress)
    .eq('read', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getUnreadNotifications error:', error);
    return [];
  }
  return data as NotificationRow[];
}

export async function getAllNotifications(userAddress: string, limit = 50) {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_address', userAddress)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('getAllNotifications error:', error);
    return [];
  }
  return data as NotificationRow[];
}

export async function markNotificationRead(notificationId: string) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    console.error('markNotificationRead error:', error);
    return null;
  }
  return data;
}

export async function markAllNotificationsRead(userAddress: string) {
  if (!supabase) return false;
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_address', userAddress)
    .eq('read', false);

  if (error) {
    console.error('markAllNotificationsRead error:', error);
    return false;
  }
  return true;
}

// Notify all vault signers (helper)
export async function notifyVaultSigners(
  vaultAddress: string,
  type: string,
  title: string,
  message?: string,
  excludeAddress?: string
) {
  const signers = await getVaultSigners(vaultAddress);
  
  for (const signer of signers) {
    if (excludeAddress && signer.signer_address === excludeAddress) continue;
    
    await createNotification({
      user_address: signer.signer_address,
      vault_address: vaultAddress,
      type,
      title,
      message,
    });
  }
}

// ============ USER PREFERENCES FUNCTIONS ============

export async function getUserPreferences(userAddress: string) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('address', userAddress)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is OK
    console.error('getUserPreferences error:', error);
  }
  return data as UserPreferencesRow | null;
}

export async function upsertUserPreferences(prefs: {
  address: string;
  display_name?: string;
  email?: string;
  notification_settings?: Record<string, boolean>;
  theme?: string;
}) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      ...prefs,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('upsertUserPreferences error:', error);
    return null;
  }
  return data as UserPreferencesRow;
}

// ============ VAULT HELPER FUNCTIONS ============

export async function updateVaultActivity(vaultAddress: string) {
  if (!supabase) return;
  
  const { error } = await supabase
    .from('vaults')
    .update({
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('address', vaultAddress);

  if (error) console.error('updateVaultActivity error:', error);
}

export async function incrementVaultCounter(
  vaultAddress: string,
  counter: 'proposal_count' | 'lock_count' | 'total_transactions'
) {
  if (!supabase) return;
  
  // Get current value
  const { data: vault } = await supabase
    .from('vaults')
    .select('proposal_count, lock_count, total_transactions')
    .eq('address', vaultAddress)
    .single();

  if (vault) {
    const currentValue = (vault as Record<string, number>)[counter] || 0;
    await supabase
      .from('vaults')
      .update({
        [counter]: currentValue + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('address', vaultAddress);
  }
}

// ============ LOCK FUNCTIONS (ENHANCED) ============

export async function updateLockClaim(
  vaultAddress: string,
  lockId: number,
  releasedAmount: string,
  totalClaimed: string
) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('locks')
    .update({
      released_amount: releasedAmount,
      total_claimed: totalClaimed,
      last_claim_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('vault_address', vaultAddress)
    .eq('lock_id', lockId)
    .select()
    .single();

  if (error) {
    console.error('updateLockClaim error:', error);
    return null;
  }
  return data;
}

export async function deactivateLock(vaultAddress: string, lockId: number) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('locks')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('vault_address', vaultAddress)
    .eq('lock_id', lockId)
    .select()
    .single();

  if (error) {
    console.error('deactivateLock error:', error);
    return null;
  }
  return data;
}

// ============ SIGNER FUNCTIONS (ENHANCED) ============

export async function updateSignerRole(
  vaultAddress: string,
  signerAddress: string,
  newRole: string
) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('vault_signers')
    .update({
      role: newRole,
      last_synced_at: new Date().toISOString(),
    })
    .eq('vault_address', vaultAddress)
    .eq('signer_address', signerAddress)
    .select()
    .single();

  if (error) {
    console.error('updateSignerRole error:', error);
    return null;
  }
  
  await logActivity({
    vault_address: vaultAddress,
    actor_address: signerAddress,
    action: 'role_changed',
    details: { new_role: newRole },
  });
  
  return data;
}

export async function deactivateSigner(vaultAddress: string, signerAddress: string) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('vault_signers')
    .update({
      is_active: false,
      removed_at: new Date().toISOString(),
    })
    .eq('vault_address', vaultAddress)
    .eq('signer_address', signerAddress)
    .select()
    .single();

  if (error) {
    console.error('deactivateSigner error:', error);
    return null;
  }
  
  await logActivity({
    vault_address: vaultAddress,
    actor_address: signerAddress,
    action: 'signer_removed',
    details: { removed_signer: signerAddress },
  });
  
  return data;
}

export async function addSigner(
  vaultAddress: string,
  signerAddress: string,
  role: string,
  addedBy: string
) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('vault_signers')
    .insert({
      vault_address: vaultAddress,
      signer_address: signerAddress,
      role,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('addSigner error:', error);
    return null;
  }
  
  await logActivity({
    vault_address: vaultAddress,
    actor_address: addedBy,
    action: 'signer_added',
    details: { new_signer: signerAddress, role },
  });
  
  // Notify the new signer
  await createNotification({
    user_address: signerAddress,
    vault_address: vaultAddress,
    type: 'added_to_vault',
    title: 'You were added to a vault',
    message: `You have been added as ${role} to a vault.`,
  });
  
  return data;
}
