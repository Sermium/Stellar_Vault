import {
  Networks,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  rpc,
  nativeToScVal,
  scValToNative,
  Address,
} from '@stellar/stellar-sdk';
import freighter from '@stellar/freighter-api';
import { CONTRACT_ID, SOROBAN_RPC_URL, NATIVE_TOKEN } from '../config/constants';
import { VaultConfig, Proposal, TokenBalance } from '../types';

const NETWORK_PASSPHRASE = Networks.TESTNET;

export const getServer = () => new rpc.Server(SOROBAN_RPC_URL);
export const getContract = () => new Contract(CONTRACT_ID);

export const signAndSubmit = async (tx: any, publicKey: string) => {
  const server = getServer();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    const errorMsg = rpc.Api.isSimulationError(sim) ? sim.error : 'Simulation failed';
    throw new Error(errorMsg);
  }

  const preparedTx = rpc.assembleTransaction(tx, sim).build();

  const signResult = await freighter.signTransaction(preparedTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (signResult.error) throw new Error(signResult.error);

  const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === 'ERROR') {
    throw new Error('Transaction submission failed');
  }

  let getResult = await server.getTransaction(sendResult.hash);
  let attempts = 0;
  while (getResult.status === 'NOT_FOUND' && attempts < 30) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  }

  if (getResult.status === 'SUCCESS') {
    return getResult;
  } else {
    throw new Error(`Transaction failed: ${getResult.status}`);
  }
};

export const simulateCall = async (operation: any, publicKey: string) => {
  const server = getServer();
  const account = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
    return scValToNative(sim.result.retval);
  }

  return null;
};

export const loadVaultConfig = async (publicKey: string): Promise<VaultConfig | null> => {
  try {
    const contract = getContract();
    const config = await simulateCall(contract.call('get_config'), publicKey);
    if (config) {
      return {
        name: config.name?.toString() || config.name,
        threshold: Number(config.threshold),
        signer_count: Number(config.signer_count),
      };
    }
    return null;
  } catch {
    return null;
  }
};

export const loadSigners = async (publicKey: string): Promise<string[]> => {
  try {
    const contract = getContract();
    const signersData = await simulateCall(contract.call('get_signers'), publicKey);
    if (signersData) {
      return signersData.map((s: any) => s.toString());
    }
    return [];
  } catch {
    return [];
  }
};

export const loadProposals = async (publicKey: string): Promise<Proposal[]> => {
  const contract = getContract();
  const loadedProposals: Proposal[] = [];

  for (let i = 0; i < 20; i++) {
    try {
      const proposal = await simulateCall(
        contract.call('get_proposal', nativeToScVal(i, { type: 'u64' })),
        publicKey
      );
      if (proposal) {
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
      }
    } catch {
      break;
    }
  }

  return loadedProposals.reverse();
};

export const loadVaultBalance = async (publicKey: string): Promise<TokenBalance[]> => {
  try {
    const tokenContract = new Contract(NATIVE_TOKEN);
    const balance = await simulateCall(
      tokenContract.call('balance', new Address(CONTRACT_ID).toScVal()),
      publicKey
    );

    if (balance !== null) {
      return [{
        address: NATIVE_TOKEN,
        symbol: 'XLM',
        balance: BigInt(balance),
        decimals: 7,
      }];
    }
    return [];
  } catch {
    return [];
  }
};

export const loadRemainingSpend = async (publicKey: string): Promise<bigint | null> => {
  try {
    const contract = getContract();
    const remaining = await simulateCall(
      contract.call('get_remaining_spend', new Address(NATIVE_TOKEN).toScVal()),
      publicKey
    );
    return remaining !== null ? BigInt(remaining) : null;
  } catch {
    return null;
  }
};

export const initializeVault = async (
  publicKey: string,
  name: string,
  signerAddresses: string[],
  threshold: number
) => {
  const server = getServer();
  const contract = getContract();
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

  return signAndSubmit(tx, publicKey);
};

export const proposeTransfer = async (
  publicKey: string,
  token: string,
  to: string,
  amount: string
) => {
  const server = getServer();
  const contract = getContract();
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

  return signAndSubmit(tx, publicKey);
};

export const approveProposal = async (publicKey: string, proposalId: number) => {
  const server = getServer();
  const contract = getContract();
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

  return signAndSubmit(tx, publicKey);
};

export const executeProposal = async (publicKey: string, proposalId: number) => {
  const server = getServer();
  const contract = getContract();
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

  return signAndSubmit(tx, publicKey);
};

export const depositToVault = async (publicKey: string, token: string, amount: string) => {
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
        new Address(CONTRACT_ID).toScVal(),
        nativeToScVal(BigInt(amount), { type: 'i128' })
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, publicKey);
};

// Utility functions
export const formatAmount = (amount: bigint, decimals: number = 7): string => {
  const divisor = BigInt(10 ** decimals);
  const intPart = amount / divisor;
  const fracPart = amount % divisor;
  const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 2);
  return `${intPart.toLocaleString()}.${fracStr}`;
};

export const formatUSD = (xlmAmount: bigint): string => {
  const xlm = Number(xlmAmount) / 10000000;
  const usd = xlm * 0.12;
  return `$${usd.toFixed(2)}`;
};

export const truncateAddress = (addr: string): string => {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};
