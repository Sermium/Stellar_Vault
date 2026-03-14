#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, Vec, Symbol,
    token::Client as TokenClient,
};

// ============ DATA STRUCTURES ============

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultConfig {
    pub name: Symbol,
    pub threshold: u32,
    pub signer_count: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Pending,
    Approved,
    Executed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub token: Address,
    pub to: Address,
    pub amount: i128,
    pub approvals: Vec<Address>,
    pub status: ProposalStatus,
    pub created_at: u64,
}

#[contracttype]
pub enum StorageKey {
    Config,
    Signers,
    Proposal(u64),
    ProposalCount,
    SpendLimit(Address),
    DailySpent(Address, u64),
}

// ============ ERRORS ============

#[contracterror]
#[derive(Clone, Debug, Eq, PartialEq, Copy)]
#[repr(u32)]
pub enum VaultError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotASigner = 3,
    ThresholdNotMet = 4,
    ProposalNotFound = 5,
    AlreadyApproved = 6,
    AlreadyExecuted = 7,
    InvalidThreshold = 8,
    SpendLimitExceeded = 9,
}

// ============ CONTRACT ============

#[contract]
pub struct StellarVault;

#[contractimpl]
impl StellarVault {
    
    /// Initialize a new vault
    pub fn initialize(
        env: Env,
        name: Symbol,
        signers: Vec<Address>,
        threshold: u32,
    ) -> Result<(), VaultError> {
        if env.storage().instance().has(&StorageKey::Config) {
            return Err(VaultError::AlreadyInitialized);
        }

        if threshold == 0 || threshold > signers.len() {
            return Err(VaultError::InvalidThreshold);
        }

        let config = VaultConfig {
            name,
            threshold,
            signer_count: signers.len(),
        };
        env.storage().instance().set(&StorageKey::Config, &config);
        env.storage().instance().set(&StorageKey::Signers, &signers);
        env.storage().instance().set(&StorageKey::ProposalCount, &0u64);

        Ok(())
    }

    /// Propose a transfer transaction
    pub fn propose(
        env: Env,
        proposer: Address,
        token: Address,
        to: Address,
        amount: i128,
    ) -> Result<u64, VaultError> {
        proposer.require_auth();
        Self::require_signer(&env, &proposer)?;

        let proposal_id: u64 = env
            .storage()
            .instance()
            .get(&StorageKey::ProposalCount)
            .unwrap_or(0);
        
        env.storage()
            .instance()
            .set(&StorageKey::ProposalCount, &(proposal_id + 1));

        let mut approvals = Vec::new(&env);
        approvals.push_back(proposer.clone());

        let proposal = Proposal {
            id: proposal_id,
            proposer,
            token,
            to,
            amount,
            approvals,
            status: ProposalStatus::Pending,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .instance()
            .set(&StorageKey::Proposal(proposal_id), &proposal);

        Ok(proposal_id)
    }

    /// Approve a pending proposal
    pub fn approve(
        env: Env,
        voter: Address,
        proposal_id: u64,
    ) -> Result<(), VaultError> {
        voter.require_auth();
        Self::require_signer(&env, &voter)?;

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&StorageKey::Proposal(proposal_id))
            .ok_or(VaultError::ProposalNotFound)?;

        if proposal.status != ProposalStatus::Pending {
            return Err(VaultError::AlreadyExecuted);
        }

        if proposal.approvals.contains(&voter) {
            return Err(VaultError::AlreadyApproved);
        }

        proposal.approvals.push_back(voter);

        let config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        if proposal.approvals.len() >= config.threshold {
            proposal.status = ProposalStatus::Approved;
        }

        env.storage()
            .instance()
            .set(&StorageKey::Proposal(proposal_id), &proposal);

        Ok(())
    }

    /// Execute an approved proposal
    pub fn execute(
        env: Env,
        executor: Address,
        proposal_id: u64,
    ) -> Result<(), VaultError> {
        executor.require_auth();
        Self::require_signer(&env, &executor)?;

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&StorageKey::Proposal(proposal_id))
            .ok_or(VaultError::ProposalNotFound)?;

        if proposal.status != ProposalStatus::Approved {
            return Err(VaultError::ThresholdNotMet);
        }

        Self::check_spend_limit(&env, &proposal.token, proposal.amount)?;

        let token_client = TokenClient::new(&env, &proposal.token);
        token_client.transfer(&env.current_contract_address(), &proposal.to, &proposal.amount);

        Self::record_spend(&env, &proposal.token, proposal.amount);

        proposal.status = ProposalStatus::Executed;
        env.storage()
            .instance()
            .set(&StorageKey::Proposal(proposal_id), &proposal);

        Ok(())
    }

    /// Set daily spend limit for a token
    pub fn set_spend_limit(
        env: Env,
        admin: Address,
        token: Address,
        daily_limit: i128,
    ) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_signer(&env, &admin)?;

        env.storage()
            .instance()
            .set(&StorageKey::SpendLimit(token), &daily_limit);

        Ok(())
    }

    /// Get remaining daily spend allowance
    pub fn get_remaining_spend(env: Env, token: Address) -> i128 {
        let limit: i128 = env
            .storage()
            .instance()
            .get(&StorageKey::SpendLimit(token.clone()))
            .unwrap_or(i128::MAX);

        let day = Self::current_day(&env);
        let spent: i128 = env
            .storage()
            .instance()
            .get(&StorageKey::DailySpent(token, day))
            .unwrap_or(0);

        limit - spent
    }

    /// Get vault configuration
    pub fn get_config(env: Env) -> Result<VaultConfig, VaultError> {
        env.storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)
    }

    /// Get all signers
    pub fn get_signers(env: Env) -> Result<Vec<Address>, VaultError> {
        env.storage()
            .instance()
            .get(&StorageKey::Signers)
            .ok_or(VaultError::NotInitialized)
    }

    /// Get proposal by ID
    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, VaultError> {
        env.storage()
            .instance()
            .get(&StorageKey::Proposal(proposal_id))
            .ok_or(VaultError::ProposalNotFound)
    }

    // ============ INTERNAL HELPERS ============

    fn require_signer(env: &Env, address: &Address) -> Result<(), VaultError> {
        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::Signers)
            .ok_or(VaultError::NotInitialized)?;

        if !signers.contains(address) {
            return Err(VaultError::NotASigner);
        }

        Ok(())
    }

    fn check_spend_limit(
        env: &Env,
        token: &Address,
        amount: i128,
    ) -> Result<(), VaultError> {
        let remaining = Self::get_remaining_spend(env.clone(), token.clone());
        
        if amount > remaining {
            return Err(VaultError::SpendLimitExceeded);
        }

        Ok(())
    }

    fn record_spend(env: &Env, token: &Address, amount: i128) {
        let day = Self::current_day(env);
        let current_spent: i128 = env
            .storage()
            .instance()
            .get(&StorageKey::DailySpent(token.clone(), day))
            .unwrap_or(0);

        env.storage()
            .instance()
            .set(&StorageKey::DailySpent(token.clone(), day), &(current_spent + amount));
    }

    fn current_day(env: &Env) -> u64 {
        env.ledger().timestamp() / 86400
    }
}
