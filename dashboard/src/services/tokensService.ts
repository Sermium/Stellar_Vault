import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';
import { TokenInfo, TokenBalance } from '../types';
import { STELLAR_RPC_URL, NETWORK_PASSPHRASE, NATIVE_TOKEN } from '../config';

const server = new rpc.Server(STELLAR_RPC_URL);

// Known tokens on Stellar testnet
export const KNOWN_TOKENS: TokenInfo[] = [
  {
    address: NATIVE_TOKEN,
    symbol: 'XLM',
    name: 'Stellar Lumens',
    decimals: 7,
    icon: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
  },
  // Add more known tokens here
];

export async function getTokenBalance(
  tokenAddress: string,
  vaultAddress: string
): Promise<bigint> {
  try {
    const tokenContract = new StellarSdk.Contract(tokenAddress);
    const tempKeypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(tempKeypair.publicKey(), '0');

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        tokenContract.call('balance', StellarSdk.Address.fromString(vaultAddress).toScVal())
      )
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      return BigInt(StellarSdk.scValToNative(sim.result.retval));
    }
    return BigInt(0);
  } catch {
    return BigInt(0);
  }
}

export async function getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
  // Check known tokens first
  const known = KNOWN_TOKENS.find(t => t.address === tokenAddress);
  if (known) return known;

  try {
    const tokenContract = new StellarSdk.Contract(tokenAddress);
    const tempKeypair = StellarSdk.Keypair.random();
    const account = new StellarSdk.Account(tempKeypair.publicKey(), '0');

    // Get symbol
    const symbolTx = new StellarSdk.TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(tokenContract.call('symbol'))
      .setTimeout(30)
      .build();

    const symbolSim = await server.simulateTransaction(symbolTx);
    let symbol = 'UNKNOWN';
    if (rpc.Api.isSimulationSuccess(symbolSim) && symbolSim.result?.retval) {
      symbol = String(StellarSdk.scValToNative(symbolSim.result.retval));
    }

    // Get decimals
    const decimalsTx = new StellarSdk.TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(tokenContract.call('decimals'))
      .setTimeout(30)
      .build();

    const decimalsSim = await server.simulateTransaction(decimalsTx);
    let decimals = 7;
    if (rpc.Api.isSimulationSuccess(decimalsSim) && decimalsSim.result?.retval) {
      decimals = Number(StellarSdk.scValToNative(decimalsSim.result.retval));
    }

    // Get name
    const nameTx = new StellarSdk.TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(tokenContract.call('name'))
      .setTimeout(30)
      .build();

    const nameSim = await server.simulateTransaction(nameTx);
    let name = symbol;
    if (rpc.Api.isSimulationSuccess(nameSim) && nameSim.result?.retval) {
      name = String(StellarSdk.scValToNative(nameSim.result.retval));
    }

    return {
      address: tokenAddress,
      symbol,
      name,
      decimals,
    };
  } catch {
    return null;
  }
}

export async function getAllVaultBalances(vaultAddress: string): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = [];

  for (const token of KNOWN_TOKENS) {
    const balance = await getTokenBalance(token.address, vaultAddress);
    if (balance > BigInt(0)) {
      balances.push({
        ...token,
        balance,
      });
    }
  }

  return balances;
}
