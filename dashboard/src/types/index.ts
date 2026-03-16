export interface VaultConfig {
  name: string;
  threshold: number;
  signer_count: number;
  tx_fee_amount?: bigint;
  tx_fee_token?: string;
  fee_recipient?: string;
}

export type Role = 'Admin' | 'Executor' | 'Viewer';

export interface SignerWithRole {
  address: string;
  role: Role;
}

export interface Proposal {
  id: number;
  proposer: string;
  token: string;
  to: string;
  amount: bigint;
  approvals: string[];
  status: string;
  created_at: number;
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

export type ActiveView = 'home' | 'assets' | 'transactions' | 'members' | 'settings' | 'contacts' | 'admin';
