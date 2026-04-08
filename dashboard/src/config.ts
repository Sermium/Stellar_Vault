import { getActiveContracts, getAppConfig } from './lib/supabase';

// Vite environment
declare global {
  interface ImportMetaEnv {
    REACT_APP_NETWORK?: string;
    REACT_APP_SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export const NETWORK = (process.env.REACT_APP_NETWORK as 'testnet' | 'mainnet') || 'testnet';

// Fallback config
const FALLBACK = {
  testnet: {
    REGISTRY_CONTRACT_ID: 'CDJCQNXYTWZ3VF2FL2MCWMZB6RPQYRAFNNO6KEKW2MN7ALXGB5SGYTJ4',
    FACTORY_CONTRACT_ID: 'CCNGOW6UCZKELBAR377HDHWAJJLKD6SJHUFCDT4UM6M2AYPSOEBYLDVA',
    VAULT_WASM_HASH: 'f434965dafa094f90a27a09065562da9fe5aeb00f8208da1665bb4ebebe475ec',
    HORIZON_URL: 'https://horizon-testnet.stellar.org',
    SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    NATIVE_TOKEN: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    FEE_RECIPIENT: 'GCSMHTJTHQKGGRHU3GOQGOARVN2QLWUDV57D4KSVP2R3P62YVOALSLHW',
  },
  mainnet: {
    REGISTRY_CONTRACT_ID: '',
    FACTORY_CONTRACT_ID: '',
    VAULT_WASM_HASH: '',
    HORIZON_URL: 'https://horizon.stellar.org',
    SOROBAN_RPC_URL: 'https://soroban.stellar.org',
    NATIVE_TOKEN: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
    FEE_RECIPIENT: '',
  }
};

let config = { ...FALLBACK[NETWORK] };
let initialized = false;

export async function initConfig(): Promise<typeof config> {
  if (initialized) return config;
  
  try {
    const [contracts, appConfig] = await Promise.all([
      getActiveContracts(NETWORK),
      getAppConfig(NETWORK)
    ]);

    contracts.forEach(c => {
      if (c.contract_type === 'registry' && c.address) config.REGISTRY_CONTRACT_ID = c.address;
      if (c.contract_type === 'factory' && c.address) config.FACTORY_CONTRACT_ID = c.address;
      if (c.contract_type === 'vault_wasm' && c.wasm_hash) config.VAULT_WASM_HASH = c.wasm_hash;
    });

    if (appConfig['horizon_url']) config.HORIZON_URL = appConfig['horizon_url'];
    if (appConfig['soroban_rpc_url']) config.SOROBAN_RPC_URL = appConfig['soroban_rpc_url'];
    if (appConfig['native_token']) config.NATIVE_TOKEN = appConfig['native_token'];
    if (appConfig['fee_recipient']) config.FEE_RECIPIENT = appConfig['fee_recipient'];

    console.log('Config loaded from DB:', config);
    initialized = true;
  } catch (e) {
    console.warn('Using fallback config:', e);
  }
  
  return config;
}

export const getConfig = () => config;
export const getRegistryId = () => config.REGISTRY_CONTRACT_ID;
export const getFactoryId = () => config.FACTORY_CONTRACT_ID;
export const getVaultWasm = () => config.VAULT_WASM_HASH;
export const getHorizonUrl = () => config.HORIZON_URL;
export const getRpcUrl = () => config.SOROBAN_RPC_URL;
export const getNativeToken = () => config.NATIVE_TOKEN;
export const getFeeRecipient = () => config.FEE_RECIPIENT;

// Legacy exports
export const REGISTRY_CONTRACT_ID = FALLBACK[NETWORK].REGISTRY_CONTRACT_ID;
export const FACTORY_CONTRACT_ID = FALLBACK[NETWORK].FACTORY_CONTRACT_ID;
export const VAULT_WASM_HASH = FALLBACK[NETWORK].VAULT_WASM_HASH;
export const HORIZON_URL = FALLBACK[NETWORK].HORIZON_URL;
export const SOROBAN_RPC_URL = FALLBACK[NETWORK].SOROBAN_RPC_URL;
export const NATIVE_TOKEN = FALLBACK[NETWORK].NATIVE_TOKEN;
export const FEE_RECIPIENT = FALLBACK[NETWORK].FEE_RECIPIENT;

// Aliases
export const STELLAR_RPC_URL = SOROBAN_RPC_URL;
export const NETWORK_PASSPHRASE = NETWORK === 'mainnet' 
  ? 'Public Global Stellar Network ; September 2015'
  : 'Test SDF Network ; September 2015';

// Tokens
export const SUPPORTED_TOKENS = [
  { symbol: 'XLM', code: 'XLM', name: 'Stellar Lumens', address: NATIVE_TOKEN, decimals: 7, icon: '/tokens/xlm.png' },
  { symbol: 'USDC', code: 'USDC', name: 'USD Coin', address: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA', decimals: 7, icon: '/tokens/usdc.png' }
];

// Constants
export const DEFAULT_TX_FEE = 1000000;