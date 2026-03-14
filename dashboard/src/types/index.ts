export interface VaultConfig {
  name: string;
  threshold: number;
  signer_count: number;
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
}

export type ActiveView = 'home' | 'assets' | 'transactions' | 'members' | 'settings';
