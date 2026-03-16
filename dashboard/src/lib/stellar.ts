import { Contract, TransactionBuilder, Transaction, BASE_FEE, rpc, nativeToScVal, scValToNative, Address, Keypair, Account, Asset,} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { STELLAR_RPC_URL, NATIVE_TOKEN, SUPPORTED_TOKENS, NETWORK_PASSPHRASE } from '../config';
import { VaultConfig, Proposal, TokenBalance } from '../types';
import { getCustomTokens } from '../services/tokensService';

export const getServer = () => new rpc.Server(STELLAR_RPC_URL);
export const getContract = (vaultAddress: string) => new Contract(vaultAddress);
export { truncateAddress, formatAmount, formatUSD } from './utils';

// Helper to create a temp account for read-only simulations
const getTempAccount = () => {
  const tempKeypair = Keypair.random();
  return new Account(tempKeypair.publicKey(), '0');
};

export async function signAndSubmit(
  tx: Transaction,
  server: rpc.Server
): Promise<rpc.Api.GetTransactionResponse> {
  console.log('=== signAndSubmit ===');
  
  // Simulate the transaction first
  console.log('Simulating transaction...');
  const simResult = await server.simulateTransaction(tx);
  console.log('Simulation result:', simResult);

  if (rpc.Api.isSimulationError(simResult)) {
    console.error('Simulation failed:', simResult);
    const errorMessage = simResult.error || 'Transaction simulation failed';
    throw new Error(errorMessage);
  }

  // Assemble the transaction with the simulation results
  const preparedTx = rpc.assembleTransaction(tx, simResult).build();

  // Sign with Freighter
  console.log('Signing with Freighter...');
  const signResult = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  // Handle the response - Freighter returns { signedTxXdr, signerAddress, error? }
  if (signResult.error) {
    throw new Error(`Signing failed: ${signResult.error}`);
  }

  const signedTx = TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    NETWORK_PASSPHRASE
  ) as Transaction;

  // Submit the signed transaction
  console.log('Submitting transaction...');
  const sendResult = await server.sendTransaction(signedTx);
  console.log('Send result:', sendResult);

  if (sendResult.status === 'ERROR') {
    console.error('Send error:', sendResult);
    throw new Error(`Transaction send failed: ${sendResult.errorResult?.toString() || 'Unknown error'}`);
  }

  // Poll for result
  console.log('Polling for result...');
  let getResult = await server.getTransaction(sendResult.hash);
  while (getResult.status === 'NOT_FOUND') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(sendResult.hash);
  }

  console.log('Final result:', getResult);

  if (getResult.status === 'FAILED') {
    console.error('Transaction failed:', getResult);
    throw new Error('Transaction failed on-chain');
  }

  console.log('=== signAndSubmit SUCCESS ===');
  return getResult;
}

export const loadVaultConfig = async (vaultAddress: string): Promise<VaultConfig | null> => {
  try {
    const contract = getContract(vaultAddress);
    const server = getServer();
    const account = getTempAccount();
    
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_config'))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const config = scValToNative(sim.result.retval);
      return {
        name: config.name?.toString() || config.name,
        threshold: Number(config.threshold),
        signer_count: Number(config.signer_count),
        tx_fee_amount: config.tx_fee_amount ? BigInt(config.tx_fee_amount) : BigInt(0),
        fee_recipient: config.fee_recipient?.toString() || '',
      };
    }
    return null;
  } catch (err) {
    console.error('loadVaultConfig error:', err);
    return null;
  }
};

export const loadSigners = async (vaultAddress: string): Promise<string[]> => {
  try {
    const contract = getContract(vaultAddress);
    const server = getServer();
    const account = getTempAccount();
    
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_signers'))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const signersData = scValToNative(sim.result.retval);
      return signersData.map((s: any) => s.toString());
    }
    return [];
  } catch (err) {
    console.error('loadSigners error:', err);
    return [];
  }
};

export const loadProposals = async (vaultAddress: string): Promise<Proposal[]> => {
  const contract = getContract(vaultAddress);
  const server = getServer();
  const loadedProposals: Proposal[] = [];
  const account = getTempAccount();

  for (let i = 0; i < 20; i++) {
    try {
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('get_proposal', nativeToScVal(i, { type: 'u64' })))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);

      if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
        const proposal = scValToNative(sim.result.retval);
        loadedProposals.push({
          id: Number(proposal.id),
          proposer: proposal.proposer.toString(),
          token: proposal.token.toString(),
          to: proposal.to.toString(),
          amount: BigInt(proposal.amount),
          approvals: proposal.approvals.map((a: any) => a.toString()),
          status: Object.keys(proposal.status)[0],
          created_at: Number(proposal.created_at),
        });
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return loadedProposals.reverse();
};

export async function loadVaultBalance(vaultAddress: string): Promise<TokenBalance[]> {
  const balances: TokenBalance[] = [];
  const server = getServer();

  // Combine supported tokens with custom tokens
  const customTokens = getCustomTokens();
  const allTokens = [
    ...SUPPORTED_TOKENS,
    ...customTokens.map(t => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      icon: t.icon,
      isNative: false,
      isSAC: t.isSAC,
      issuer: t.issuer,
    }))
  ];

  // Remove duplicates (prefer SUPPORTED_TOKENS)
  const uniqueTokens = allTokens.filter((token, index, self) =>
    index === self.findIndex(t => t.address === token.address)
  );

  for (const token of uniqueTokens) {
    try {
      const contract = new Contract(token.address);
      const tx = new TransactionBuilder(
        new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
        {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        }
      )
        .addOperation(
          contract.call('balance', nativeToScVal(vaultAddress, { type: 'address' }))
        )
        .setTimeout(30)
        .build();

      const simulation = await server.simulateTransaction(tx);

      let balance = BigInt(0);
      if (rpc.Api.isSimulationSuccess(simulation) && simulation.result?.retval) {
        balance = BigInt(scValToNative(simulation.result.retval));
      }

      balances.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        icon: token.icon,
        balance,
      });
    } catch (error) {
      console.error(`Failed to load balance for ${token.symbol}:`, error);
      balances.push({
        address: token.address,
        symbol: token.symbol,
        name: token.name || token.symbol,
        decimals: token.decimals,
        icon: token.icon,
        balance: BigInt(0),
      });
    }
  }

  return balances;
}

export const loadRemainingSpend = async (vaultAddress: string): Promise<bigint | null> => {
  try {
    const contract = getContract(vaultAddress);
    const server = getServer();
    const account = getTempAccount();
    
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_remaining_spend', new Address(NATIVE_TOKEN).toScVal()))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      return BigInt(scValToNative(sim.result.retval));
    }
    return null;
  } catch {
    return null;
  }
};

export const initializeVault = async (
  publicKey: string,
  vaultAddress: string,
  name: string,
  signerAddresses: string[],
  threshold: number
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);

  if (!signerAddresses.includes(publicKey)) {
    signerAddresses.unshift(publicKey);
  }

  const signersScVal = nativeToScVal(
    signerAddresses.map((s) => new Address(s)),
    { type: 'Vec' }
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'initialize',
        nativeToScVal(name, { type: 'symbol' }),
        signersScVal,
        nativeToScVal(threshold, { type: 'u32' })
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, server);
};

export const proposeTransfer = async (
  publicKey: string,
  vaultAddress: string,
  token: string,
  to: string,
  amount: string
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'propose',
        new Address(publicKey).toScVal(),
        new Address(token).toScVal(),
        new Address(to).toScVal(),
        nativeToScVal(BigInt(amount), { type: 'i128' })
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, server);
};

export const approveProposal = async (
  publicKey: string,
  vaultAddress: string,
  proposalId: number
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'approve',
        new Address(publicKey).toScVal(),
        nativeToScVal(proposalId, { type: 'u64' })
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, server);
};

export const executeProposal = async (
  publicKey: string,
  vaultAddress: string,
  proposalId: number
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'execute',
        new Address(publicKey).toScVal(),
        nativeToScVal(proposalId, { type: 'u64' })
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, server);
};

export const depositToVault = async (
  publicKey: string,
  vaultAddress: string,
  token: string,
  amount: string
) => {
  const server = getServer();
  const tokenContract = new Contract(token);
  const account = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      tokenContract.call(
        'transfer',
        new Address(publicKey).toScVal(),
        new Address(vaultAddress).toScVal(),
        nativeToScVal(BigInt(amount), { type: 'i128' })
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, server);
};

export const addSigner = async (
  publicKey: string,
  vaultAddress: string,
  newSigner: string
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'add_signer',
        new Address(publicKey).toScVal(),
        new Address(newSigner).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, server);
};

export const getRole = async (vaultAddress: string, member: string): Promise<string | null> => {
  try {
    const contract = getContract(vaultAddress);
    const server = getServer();
    const account = getTempAccount();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_role', new Address(member).toScVal()))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const roleData = scValToNative(sim.result.retval);
      // Convert from contract enum to string
      if (roleData === 0 || roleData?.Admin !== undefined) return 'Admin';
      if (roleData === 1 || roleData?.Executor !== undefined) return 'Executor';
      if (roleData === 2 || roleData?.Viewer !== undefined) return 'Viewer';
      return 'Viewer';
    }
    return null;
  } catch {
    return null;
  }
};

export const getAllRoles = async (vaultAddress: string): Promise<Array<{ address: string; role: string }>> => {
  try {
    const contract = getContract(vaultAddress);
    const server = getServer();
    const account = getTempAccount();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('get_all_roles'))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      const rolesData = scValToNative(sim.result.retval);
      return rolesData.map((item: any) => {
        const [addr, roleVal] = item;
        let role = 'Viewer';
        if (roleVal === 0 || roleVal?.Admin !== undefined) role = 'Admin';
        else if (roleVal === 1 || roleVal?.Executor !== undefined) role = 'Executor';
        return {
          address: addr.toString(),
          role,
        };
      });
    }
    return [];
  } catch (err) {
    console.error('getAllRoles error:', err);
    return [];
  }
};

export const loadAllTokenBalances = async (vaultAddress: string): Promise<TokenBalance[]> => {
  const balances: TokenBalance[] = [];
  
  for (const token of SUPPORTED_TOKENS) {
    try {
      const tokenContract = new Contract(token.address);
      const server = getServer();
      const account = getTempAccount();
      
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(tokenContract.call('balance', new Address(vaultAddress).toScVal()))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);

      if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
        const balance = scValToNative(sim.result.retval);
        balances.push({
          address: token.address,
          symbol: token.symbol,
          balance: BigInt(balance),
          decimals: token.decimals,
          name: token.name,
          icon: token.icon,
        });
      }
    } catch (err) {
      // Token might not exist or no balance, add with 0
      balances.push({
        address: token.address,
        symbol: token.symbol,
        balance: BigInt(0),
        decimals: token.decimals,
        name: token.name,
        icon: token.icon,
      });
    }
  }
  
  return balances;
};

// Get token issuer from SAC contract
export const getTokenIssuer = async (tokenAddress: string): Promise<string | null> => {
  try {
    const tokenContract = new Contract(tokenAddress);
    const server = getServer();
    const account = getTempAccount();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(tokenContract.call('admin'))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
      return scValToNative(sim.result.retval);
    }
    return null;
  } catch {
    return null;
  }
};

export async function isSACToken(tokenAddress: string): Promise<boolean> {
  // Native XLM is always a SAC
  if (tokenAddress === NATIVE_TOKEN) {
    return true;
  }

  try {
    const server = getServer();
    const contract = new Contract(tokenAddress);
    
    // Try to call the admin function - SAC tokens have this
    const tx = new TransactionBuilder(
      new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
      {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      }
    )
      .addOperation(contract.call('admin'))
      .setTimeout(30)
      .build();

    const simulation = await server.simulateTransaction(tx);
    
    if (rpc.Api.isSimulationSuccess(simulation) && simulation.result?.retval) {
      const adminAddress = scValToNative(simulation.result.retval);
      // SAC tokens have a G... address as admin (Stellar account)
      // Pure Soroban tokens have a C... address (contract) or no admin
      return typeof adminAddress === 'string' && adminAddress.startsWith('G');
    }
    
    return false;
  } catch (error) {
    // If admin() call fails, it's likely a pure Soroban token
    console.log(`Token ${tokenAddress} admin check failed:`, error);
    return false;
  }
}

// Check if an account has a trustline for a SAC token
export const hasTrustline = async (
  accountAddress: string,
  tokenAddress: string
): Promise<boolean> => {
  // Native XLM doesn't need trustline
  if (tokenAddress === NATIVE_TOKEN) {
    return true;
  }

  // First check if it's a SAC token
  const isSAC = await isSACToken(tokenAddress);
  if (!isSAC) {
    // Pure Soroban tokens don't need trustlines
    return true;
  }

  try {
    const tokenContract = new Contract(tokenAddress);
    const server = getServer();
    const account = getTempAccount();

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(tokenContract.call('balance', new Address(accountAddress).toScVal()))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);
    return rpc.Api.isSimulationSuccess(sim);
  } catch {
    return false;
  }
};

// Create a trustline for a SAC token
export const createTrustline = async (
  publicKey: string,
  assetCode: string,
  issuer: string
): Promise<any> => {
  const server = getServer();
  const account = await server.getAccount(publicKey);

  const { Asset, Operation } = await import('@stellar/stellar-sdk');
  const asset = new Asset(assetCode, issuer);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, server);
};

// Get token info including whether it needs trustline
export async function getTokenInfo(tokenAddress: string): Promise<{
  symbol: string;
  name: string;
  decimals: number;
  issuer: string | null;
} | null> {
  try {
    const server = getServer();
    const contract = new Contract(tokenAddress);
    const tempAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');

    // Get symbol
    const symbolTx = new TransactionBuilder(tempAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('symbol'))
      .setTimeout(30)
      .build();

    const symbolSim = await server.simulateTransaction(symbolTx);
    let symbol = 'UNKNOWN';
    if (rpc.Api.isSimulationSuccess(symbolSim) && symbolSim.result?.retval) {
      symbol = scValToNative(symbolSim.result.retval);
    }

    // Get name
    const nameTx = new TransactionBuilder(tempAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('name'))
      .setTimeout(30)
      .build();

    const nameSim = await server.simulateTransaction(nameTx);
    let name = symbol;
    if (rpc.Api.isSimulationSuccess(nameSim) && nameSim.result?.retval) {
      name = scValToNative(nameSim.result.retval);
    }

    // Get decimals
    const decimalsTx = new TransactionBuilder(tempAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call('decimals'))
      .setTimeout(30)
      .build();

    const decimalsSim = await server.simulateTransaction(decimalsTx);
    let decimals = 7;
    if (rpc.Api.isSimulationSuccess(decimalsSim) && decimalsSim.result?.retval) {
      decimals = scValToNative(decimalsSim.result.retval);
    }

    // Get issuer (admin) for SAC tokens
    let issuer: string | null = null;
    try {
      const adminTx = new TransactionBuilder(tempAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('admin'))
        .setTimeout(30)
        .build();

      const adminSim = await server.simulateTransaction(adminTx);
      if (rpc.Api.isSimulationSuccess(adminSim) && adminSim.result?.retval) {
        const admin = scValToNative(adminSim.result.retval);
        if (typeof admin === 'string' && admin.startsWith('G')) {
          issuer = admin;
        }
      }
    } catch {
      // Not a SAC token or no admin function
    }

    return { symbol, name, decimals, issuer };
  } catch (error) {
    console.error('Failed to get token info:', error);
    return null;
  }
}

// Ensure trustline exists (only for SAC tokens)
export const ensureTrustline = async (
  publicKey: string,
  tokenAddress: string,
  assetCode: string,
  issuer?: string
): Promise<boolean> => {
  // Native XLM doesn't need trustline
  if (tokenAddress === NATIVE_TOKEN) {
    return true;
  }

  // Check if it's a SAC token
  const isSAC = await isSACToken(tokenAddress);
  if (!isSAC) {
    // Pure Soroban token, no trustline needed
    return true;
  }

  // Check if trustline already exists
  const hasTrust = await hasTrustline(publicKey, tokenAddress);
  if (hasTrust) {
    return true;
  }

  // Get issuer if not provided
  let tokenIssuer: string | undefined = issuer;
  if (!tokenIssuer) {
    const info = await getTokenInfo(tokenAddress);
    tokenIssuer = info?.issuer ?? undefined;  // Convert null to undefined
  }

  if (!tokenIssuer) {
    throw new Error('Could not find token issuer');
  }

  await createTrustline(publicKey, assetCode, tokenIssuer);
  return true;
};

export function deriveSACAddress(assetCode: string, issuer: string): string {
  try {
    // For native XLM
    if (assetCode === 'XLM' && (!issuer || issuer === 'native')) {
      return NATIVE_TOKEN;
    }

    // Create the Stellar asset
    const asset = new Asset(assetCode, issuer);
    
    // Get the contract ID for this asset
    // The SDK provides a method to get the contract ID from an asset
    const contractId = asset.contractId(NETWORK_PASSPHRASE);
    
    return contractId;
  } catch (error) {
    console.error('Failed to derive SAC address:', error);
    return '';
  }
}

export async function addSignerWithRole(
  publicKey: string,
  vaultAddress: string,
  newSigner: string,
  roleValue: number
): Promise<void> {
  console.log('=== addSignerWithRole ===');
  console.log('publicKey:', publicKey);
  console.log('vaultAddress:', vaultAddress);
  console.log('newSigner:', newSigner);
  console.log('roleValue:', roleValue);

  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);

  // The contract's add_signer function now handles fee collection internally
  // Parameters: admin (Address), new_signer (Address), role (u32)
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'add_signer',
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(newSigner, { type: 'address' }),
        nativeToScVal(roleValue, { type: 'u32' })
      )
    )
    .setTimeout(30)
    .build();

  console.log('Transaction built, submitting...');
  await signAndSubmit(tx, server);
  console.log('=== addSignerWithRole SUCCESS ===');
}

export async function removeSigner(
  publicKey: string,
  vaultAddress: string,
  signerToRemove: string
): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
  
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'remove_signer',
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(signerToRemove, { type: 'address' })
      )
    )
    .setTimeout(30)
    .build();

  await signAndSubmit(tx, server);
}

export async function setRole(
  publicKey: string,
  vaultAddress: string,
  member: string,
  roleValue: number
): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
  
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'set_role',
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(member, { type: 'address' }),
        nativeToScVal(roleValue, { type: 'u32' })
      )
    )
    .setTimeout(30)
    .build();

  await signAndSubmit(tx, server);
}

export async function setThreshold(
  publicKey: string,
  vaultAddress: string,
  newThreshold: number
): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
  
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'set_threshold',
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(newThreshold, { type: 'u32' })
      )
    )
    .setTimeout(30)
    .build();

  await signAndSubmit(tx, server);
}

export async function leaveVault(publicKey: string, vaultAddress: string): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);
  
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'leave_vault',
        nativeToScVal(publicKey, { type: 'address' })
      )
    )
    .setTimeout(30)
    .build();

  await signAndSubmit(tx, server);
}

export async function setSpendLimit(
  publicKey: string,
  vaultAddress: string,
  token: string,
  dailyLimit: bigint
): Promise<void> {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'set_spend_limit',
        nativeToScVal(publicKey, { type: 'address' }),
        nativeToScVal(token, { type: 'address' }),
        nativeToScVal(dailyLimit, { type: 'i128' })
      )
    )
    .setTimeout(30)
    .build();

  await signAndSubmit(tx, server);
}