import { NETWORK_PASSPHRASE } from '../config';

const HORIZON_URL = NETWORK_PASSPHRASE.includes('Test') 
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon.stellar.org';

export interface PaymentRecord {
  id: string;
  type: 'payment' | 'create_account' | 'path_payment' | 'invoke_contract';
  createdAt: string;
  transactionHash: string;
  from: string;
  to: string;
  amount: string;
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  isIncoming: boolean;
  memo?: string;
}

export interface TransactionRecord {
  id: string;
  hash: string;
  createdAt: string;
  sourceAccount: string;
  fee: string;
  operationCount: number;
  memo?: string;
  successful: boolean;
}

// Get payments for an account (includes incoming and outgoing)
export async function getAccountPayments(
  accountId: string,
  limit: number = 50
): Promise<PaymentRecord[]> {
  try {
    const response = await fetch(
      `${HORIZON_URL}/accounts/${accountId}/payments?order=desc&limit=${limit}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return []; // Account not found or no payments
      }
      throw new Error(`Failed to fetch payments: ${response.status}`);
    }

    const data = await response.json();
    const records = data._embedded?.records || [];

    return records
      .filter((record: any) => 
        ['payment', 'create_account', 'path_payment_strict_send', 'path_payment_strict_receive'].includes(record.type)
      )
      .map((record: any) => ({
        id: record.id,
        type: record.type === 'create_account' ? 'create_account' : 'payment',
        createdAt: record.created_at,
        transactionHash: record.transaction_hash,
        from: record.from || record.source_account,
        to: record.to || record.account,
        amount: record.amount || record.starting_balance,
        assetType: record.asset_type || 'native',
        assetCode: record.asset_code,
        assetIssuer: record.asset_issuer,
        isIncoming: (record.to || record.account) === accountId,
      }));
  } catch (error) {
    console.error('Failed to fetch account payments:', error);
    return [];
  }
}

// Get transactions for an account
export async function getAccountTransactions(
  accountId: string,
  limit: number = 50
): Promise<TransactionRecord[]> {
  try {
    const response = await fetch(
      `${HORIZON_URL}/accounts/${accountId}/transactions?order=desc&limit=${limit}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }

    const data = await response.json();
    const records = data._embedded?.records || [];

    return records.map((record: any) => ({
      id: record.id,
      hash: record.hash,
      createdAt: record.created_at,
      sourceAccount: record.source_account,
      fee: record.fee_charged,
      operationCount: record.operation_count,
      memo: record.memo,
      successful: record.successful,
    }));
  } catch (error) {
    console.error('Failed to fetch account transactions:', error);
    return [];
  }
}

// Get operations for an account (more detailed than payments)
export async function getAccountOperations(
  accountId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const response = await fetch(
      `${HORIZON_URL}/accounts/${accountId}/operations?order=desc&limit=${limit}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch operations: ${response.status}`);
    }

    const data = await response.json();
    return data._embedded?.records || [];
  } catch (error) {
    console.error('Failed to fetch account operations:', error);
    return [];
  }
}
