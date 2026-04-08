export interface VaultConfig {
  name: string;
  threshold: number;
  signer_count: number;
  tx_fee_amount?: bigint;
  tx_fee_token?: string;
  fee_recipient?: string;
}

export type Role = 'SuperAdmin' | 'Admin' | 'Executor';

export interface SignerWithRole {
  address: string;
  role: Role;
}

export type ProposalType = 0 | 1 | 2; // 0=Transfer, 1=TimeLock, 2=VestingLock

export interface Proposal {
  id: number;
  proposal_type: ProposalType;
  proposer: string;
  token: string;
  recipient: string;
  amount: bigint;
  approvals: string[];
  cancel_approvals: string[];
  status: number;
  created_at: number;
  // Lock-specific fields
  lock_start_time: number;
  lock_end_time: number;
  lock_cliff_time: number;
  lock_release_intervals: number;
  lock_revocable: boolean;
  lock_description: string;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  balance: bigint;
  decimals: number;
  name?: string;
  icon?: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
  issuer?: string;
}

export type ActiveView = 'dashboard' | 'assets' | 'transactions' | 'members' | 'contacts' | 'admin' | 'settings' | 'locks' | 'vesting' | 'claim';
