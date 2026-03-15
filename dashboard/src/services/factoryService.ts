import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';
import { FACTORY_CONTRACT_ID, STELLAR_RPC_URL, NETWORK_PASSPHRASE } from '../config';

const server = new rpc.Server(STELLAR_RPC_URL);

export interface VaultInfo {
  vault_address: string;
  name: string;
  owner: string;
  signers: string[];
  threshold: number;
  created_at: number;
  initialized: boolean;
}

export interface FactoryConfig {
  admin: string;
  vault_wasm_hash: string;
  fee_token: string;
  fee_amount: string;
  fee_recipient: string;
  total_vaults_created: number;
}

export async function getVaultsByOwner(owner: string): Promise<string[]> {
  const contract = new StellarSdk.Contract(FACTORY_CONTRACT_ID);
  
  try {
    const account = await server.getAccount(owner);
    
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_vaults_by_owner', StellarSdk.Address.fromString(owner).toScVal()))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) {
      console.error('Simulation error:', sim.error);
      return [];
    }
    
    const result = sim.result?.retval;
    if (!result) return [];
    
    return StellarSdk.scValToNative(result) as string[];
  } catch (err) {
    console.error('Error fetching vaults:', err);
    return [];
  }
}

export async function getVaultInfo(vaultAddress: string): Promise<VaultInfo | null> {
  const contract = new StellarSdk.Contract(FACTORY_CONTRACT_ID);
  const tempKeypair = StellarSdk.Keypair.random();
  const account = new StellarSdk.Account(tempKeypair.publicKey(), '0');
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_vault_info', StellarSdk.Address.fromString(vaultAddress).toScVal()))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  
  const result = sim.result?.retval;
  if (!result) return null;
  
  const raw = StellarSdk.scValToNative(result);
  
  // Convert BigInt fields to numbers/strings
  return {
    vault_address: raw.vault_address?.toString() || raw.vault_address,
    name: raw.name?.toString() || String(raw.name),
    owner: raw.owner?.toString() || raw.owner,
    signers: raw.signers?.map((s: any) => s.toString()) || [],
    threshold: Number(raw.threshold),
    created_at: Number(raw.created_at),
    initialized: Boolean(raw.initialized),
  };
}

export async function getFactoryConfig(): Promise<FactoryConfig> {
  const contract = new StellarSdk.Contract(FACTORY_CONTRACT_ID);
  const tempKeypair = StellarSdk.Keypair.random();
  const account = new StellarSdk.Account(tempKeypair.publicKey(), '0');
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_config'))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  
  const result = sim.result?.retval;
  if (!result) throw new Error('No config found');
  
  return StellarSdk.scValToNative(result) as FactoryConfig;
}

export async function buildCreateVaultTx(
  creator: string,
  vaultName: string,
  signers: string[],
  threshold: number
): Promise<StellarSdk.Transaction> {
  const contract = new StellarSdk.Contract(FACTORY_CONTRACT_ID);
  const account = await server.getAccount(creator);
  
  // Convert signers to ScVal vector of addresses
  const signersScVal = StellarSdk.xdr.ScVal.scvVec(
    signers.map(s => StellarSdk.Address.fromString(s).toScVal())
  );
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(
      'create_vault',
      StellarSdk.Address.fromString(creator).toScVal(),
      StellarSdk.nativeToScVal(vaultName, { type: 'symbol' }),
      signersScVal,
      StellarSdk.nativeToScVal(threshold, { type: 'u32' })
    ))
    .setTimeout(300)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  
  const preparedTx = rpc.assembleTransaction(tx, sim).build();
  return preparedTx as StellarSdk.Transaction;
}
