import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc, Contract, TransactionBuilder, BASE_FEE, nativeToScVal, scValToNative, Address, Account, Keypair } from '@stellar/stellar-sdk';
import { getFactoryId, getRpcUrl, NETWORK_PASSPHRASE } from '../config';
import { signTransaction } from './walletService';
import { supabase } from '../lib/supabase';
 
// Lazy-initialized server and contract (created on first use)
let _server: rpc.Server | null = null;
let _factoryContract: Contract | null = null;
let _lastRpcUrl: string = '';
let _lastFactoryId: string = '';
 
function getServer(): rpc.Server {
  const url = getRpcUrl();
  if (!_server || _lastRpcUrl !== url) {
    _server = new rpc.Server(url);
    _lastRpcUrl = url;
  }
  return _server;
}
 
function getFactoryContract(): Contract {
  const id = getFactoryId();
  if (!_factoryContract || _lastFactoryId !== id) {
    _factoryContract = new Contract(id);
    _lastFactoryId = id;
  }
  return _factoryContract;
}
 
// Helper for read-only calls
const getTempAccount = () => new Account(Keypair.random().publicKey(), '0');
 
export interface VaultInfo {
  vault_address: string;
  name: string;
  creator: string;
  signers: string[];
  threshold: number;
  created_at: number;
}
 
export interface FactoryConfig {
  admin: string;
  vault_wasm_hash: string;
  fee_token: string;
  fee_amount: bigint;
  fee_recipient: string;
  total_vaults_created: number;
}
 
// Get factory configuration from contract
export async function getFactoryConfig(): Promise<FactoryConfig | null> {
  try {
    const server = getServer();
    const factoryContract = getFactoryContract();
 
    const tx = new TransactionBuilder(getTempAccount(), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(factoryContract.call('get_config'))
      .setTimeout(30)
      .build();
 
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const config = scValToNative(sim.result.retval);
      return {
        admin: config.admin?.toString() || '',
        vault_wasm_hash: config.vault_wasm_hash?.toString() || '',
        fee_token: config.fee_token?.toString() || '',
        fee_amount: BigInt(config.fee_amount || 0),
        fee_recipient: config.fee_recipient?.toString() || '',
        total_vaults_created: Number(config.total_vaults_created || 0),
      };
    }
    return null;
  } catch (error) {
    console.error('getFactoryConfig error:', error);
    return null;
  }
}
 
// Get vaults by owner - from Supabase
export async function getVaultsByOwner(owner: string): Promise<string[]> {
  console.log('getVaultsByOwner called:', owner, 'supabase:', !!supabase);
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('vaults')
      .select('address')
      .eq('creator_address', owner)
      .eq('is_active', true);
    console.log('getVaultsByOwner result:', { data, error });
    if (error) throw error;
    return (data || []).map(v => v.address);
  } catch (error) {
    console.error('getVaultsByOwner error:', error);
    return [];
  }
}
 
// Get vaults by signer - from Supabase
export async function getVaultsBySigner(signer: string): Promise<string[]> {
  console.log('getVaultsBySigner called:', signer, 'supabase:', !!supabase);
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('vault_signers')
      .select('vault_address')
      .eq('signer_address', signer)
      .eq('is_active', true);
    console.log('getVaultsBySigner result:', { data, error });
    if (error) throw error;
    return (data || []).map(v => v.vault_address);
  } catch (error) {
    console.error('getVaultsBySigner error:', error);
    return [];
  }
}
 
// Get vault info - from Supabase first, fallback to contract
export async function getVaultInfo(vaultAddress: string): Promise<VaultInfo | null> {
  console.log('getVaultInfo called:', vaultAddress);
 
  // Try Supabase first
  if (supabase) {
    try {
      const { data: vault, error } = await supabase
        .from('vaults')
        .select('*')
        .eq('address', vaultAddress)
        .single();
      
      console.log('getVaultInfo supabase result:', { vault, error });
 
      if (!error && vault) {
        const { data: signers } = await supabase
          .from('vault_signers')
          .select('signer_address')
          .eq('vault_address', vaultAddress)
          .eq('is_active', true);
        
        return {
          vault_address: vault.address,
          name: vault.name,
          creator: vault.creator_address,
          signers: (signers || []).map(s => s.signer_address),
          threshold: vault.threshold,
          created_at: new Date(vault.created_at).getTime() / 1000,
        };
      }
    } catch (e) {
      console.log('Supabase lookup failed, trying contract:', e);
    }
  }
 
  // Fallback to contract
  try {
    const server = getServer();
    const vaultContract = new Contract(vaultAddress);
    const tx = new TransactionBuilder(getTempAccount(), {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(vaultContract.call('get_config'))
      .setTimeout(30)
      .build();
 
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const config = scValToNative(sim.result.retval);
      return {
        vault_address: vaultAddress,
        name: config.name?.toString() || 'Vault',
        creator: '',
        signers: [],
        threshold: Number(config.threshold || 1),
        created_at: 0,
      };
    }
    return null;
  } catch (error) {
    console.error('getVaultInfo contract fallback error:', error);
    return null;
  }
}
 
// Check if user is vault owner - from Supabase
export async function isVaultOwner(vaultAddress: string, userAddress: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('vaults')
      .select('creator_address')
      .eq('address', vaultAddress)
      .single();
    if (error) return false;
    return data?.creator_address === userAddress;
  } catch {
    return false;
  }
}
 
// Check if user is beneficiary - from Supabase
export async function isBeneficiary(userAddress: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase
      .from('locks')
      .select('id')
      .eq('beneficiary_address', userAddress)
      .eq('is_active', true)
      .limit(1);
    if (error) return false;
    return (data?.length || 0) > 0;
  } catch {
    return false;
  }
}
 
// Create vault via factory contract
export async function buildCreateVaultTx(
  creator: string,
  name: string,
  signers: string[],
  threshold: number
): Promise<StellarSdk.Transaction> {
  console.log('buildCreateVaultTx params:', { creator, name, signers, threshold });
  console.log('Using factory:', getFactoryId());
  console.log('Using RPC:', getRpcUrl());
  
  const server = getServer();
  const factoryContract = getFactoryContract();
  const account = await server.getAccount(creator);
  
  const signersScVal = nativeToScVal(
    signers.map(s => new Address(s)),
    { type: 'Vec' }
  );
 
  const tx = new TransactionBuilder(account, {
    fee: '10000000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      factoryContract.call(
        'create_vault',
        new Address(creator).toScVal(),
        nativeToScVal(name, { type: 'symbol' }),
        signersScVal,
        nativeToScVal(threshold, { type: 'u32' })
      )
    )
    .setTimeout(300)
    .build();
 
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    console.error('Simulation error:', sim.error);
    throw new Error(sim.error || 'Simulation failed');
  }
 
  console.log('Simulation success. Min resource fee:', sim.minResourceFee);
 
  return rpc.assembleTransaction(tx, sim).build() as StellarSdk.Transaction;
}
 
// Get all vaults (limited) - from Supabase
export async function getAllVaults(limit: number = 100): Promise<VaultInfo[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('vaults')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return (data || []).map(v => ({
      vault_address: v.address,
      name: v.name,
      creator: v.creator_address,
      signers: [],
      threshold: v.threshold,
      created_at: new Date(v.created_at).getTime() / 1000,
    }));
  } catch (error) {
    console.error('getAllVaults error:', error);
    return [];
  }
}