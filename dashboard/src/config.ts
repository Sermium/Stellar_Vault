export const FACTORY_CONTRACT_ID = 'CBVA4JMIXKCEBWFN7RHY57BPFH7F5B7OEUSKQICZKIHY4Y5AR5ZHJNTW';
export const VAULT_WASM_HASH = 'f2063f76138c656e4b0cdfaab2f8fa27fc7528db1c3c7e6e557a0c6726db6fc2';
export const STELLAR_RPC_URL = 'https://soroban-testnet.stellar.org';
export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
export const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
export const NATIVE_TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
export const VAULT_CREATION_FEE = 10000000; // 1 XLM
export const DEFAULT_TX_FEE = 1000000; // 0.1 XLM
export const FEE_RECIPIENT = 'GDI33VCZUVNOPLHPBL5AIQXRO34XY2U4OLS3GFBPJRGGSA2UUCWTE37R';

// Supported tokens
export const SUPPORTED_TOKENS = [
  {
    address: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    symbol: 'XLM',
    name: 'Stellar Lumens',
    decimals: 7,
    icon: '⭐',
    isNative: true,
    isSAC: true,
    issuer: null,
  },
  {
    address: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 7,
    icon: '💵',
    isNative: false,
    isSAC: true, // Wrapped classic asset - needs trustline
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  },
  {
    address: 'CCUUDM434BMZMYWYDITHFXHDMIVTGGD6T2I5UKNX5BSLXLW7HVR4MCGZ', // Update if different
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 7,
    icon: '💶',
    isNative: false,
    isSAC: true, // Wrapped classic asset - needs trustline
    issuer: 'GB3Q6QDZYTHWT7E5PVS3W7FUT5GVAFC5KSZFFLPU25GO7VTC3NM2ZTVO', // Update with actual issuer
  },
];