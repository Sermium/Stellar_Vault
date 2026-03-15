import {
  Networks,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  rpc,
  nativeToScVal,
  scValToNative,
  Address,
  Keypair,
  Account,
} from '@stellar/stellar-sdk';
import freighter from '@stellar/freighter-api';
import { STELLAR_RPC_URL, NATIVE_TOKEN } from '../config';
import { VaultConfig, Proposal, TokenBalance } from '../types';

const NETWORK_PASSPHRASE = Networks.TESTNET;

export const getServer = () => new rpc.Server(STELLAR_RPC_URL);
export const getContract = (vaultAddress: string) => new Contract(vaultAddress);

// Helper to create a temp account for read-only simulations
const getTempAccount = () => {
  const tempKeypair = Keypair.random();
  return new Account(tempKeypair.publicKey(), '0');
};

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

export const loadVaultBalance = async (vaultAddress: string): Promise<TokenBalance[]> => {
  try {
    const tokenContract = new Contract(NATIVE_TOKEN);
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
      return [{
        address: NATIVE_TOKEN,
        symbol: 'XLM',
        balance: BigInt(balance),
        decimals: 7,
      }];
    }
    return [];
  } catch (err) {
    console.error('loadVaultBalance error:', err);
    return [];
  }
};

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

  return signAndSubmit(tx, publicKey);
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

  return signAndSubmit(tx, publicKey);
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

  return signAndSubmit(tx, publicKey);
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

  return signAndSubmit(tx, publicKey);
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

  return signAndSubmit(tx, publicKey);
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

  return signAndSubmit(tx, publicKey);
};

export const removeSigner = async (
  publicKey: string,
  vaultAddress: string,
  signerToRemove: string
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
        'remove_signer',
        new Address(publicKey).toScVal(),
        new Address(signerToRemove).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, publicKey);
};

export const setThreshold = async (
  publicKey: string,
  vaultAddress: string,
  newThreshold: number
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
        'set_threshold',
        new Address(publicKey).toScVal(),
        nativeToScVal(newThreshold, { type: 'u32' })
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

export const setRole = async (
  publicKey: string,
  vaultAddress: string,
  member: string,
  role: number // 0 = Admin, 1 = Executor, 2 = Viewer
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);

  const roleScVal = nativeToScVal(role, { type: 'u32' });

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'set_role',
        new Address(publicKey).toScVal(),
        new Address(member).toScVal(),
        roleScVal
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, publicKey);
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

export const addSignerWithRole = async (
  publicKey: string,
  vaultAddress: string,
  newSigner: string,
  role: number
) => {
  const server = getServer();
  const contract = getContract(vaultAddress);
  const account = await server.getAccount(publicKey);

  const roleScVal = nativeToScVal(role, { type: 'u32' });

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'add_signer',
        new Address(publicKey).toScVal(),
        new Address(newSigner).toScVal(),
        roleScVal
      )
    )
    .setTimeout(30)
    .build();

  return signAndSubmit(tx, publicKey);
};
