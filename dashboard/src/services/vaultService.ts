import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';
import { STELLAR_RPC_URL, NETWORK_PASSPHRASE } from '../config';

const server = new rpc.Server(STELLAR_RPC_URL);

export interface VaultConfig {
  name: string;
  signer_count: number;
  threshold: number;
}

export async function getVaultConfig(vaultAddress: string): Promise<VaultConfig> {
  const contract = new StellarSdk.Contract(vaultAddress);
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
  
  return StellarSdk.scValToNative(result) as VaultConfig;
}

export async function getVaultSigners(vaultAddress: string): Promise<string[]> {
  const contract = new StellarSdk.Contract(vaultAddress);
  const tempKeypair = StellarSdk.Keypair.random();
  const account = new StellarSdk.Account(tempKeypair.publicKey(), '0');
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_signers'))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }
  
  const result = sim.result?.retval;
  if (!result) return [];
  
  return StellarSdk.scValToNative(result) as string[];
}

export async function buildInitializeVaultTx(
  vaultAddress: string,
  caller: string,
  name: string,
  signers: string[],
  threshold: number
): Promise<StellarSdk.Transaction> {
  const contract = new StellarSdk.Contract(vaultAddress);
  const account = await server.getAccount(caller);
  
  // Convert signers array to ScVal
  const signersScVal = StellarSdk.nativeToScVal(
    signers.map(s => StellarSdk.Address.fromString(s)),
    { type: 'Vec' }
  );
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(
      'initialize',
      StellarSdk.nativeToScVal(name, { type: 'symbol' }),
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
