#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    auth::{Context, CustomAccountInterface},
    crypto::Hash,
    Address, Env, Vec, Symbol, String,
    token::Client as TokenClient,
};

// Fixed fee recipient address
const FEE_RECIPIENT: &str = "GDI33VCZUVNOPLHPBL5AIQXRO34XY2U4OLS3GFBPJRGGSA2UUCWTE37R";
const NATIVE_TOKEN: &str = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const DEFAULT_TX_FEE: i128 = 1_000_000; // 0.1 XLM

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
#[repr(u32)]
pub enum Role {
    Admin = 0,    // Full access: manage members, settings, create/approve/execute
    Executor = 1, // Can create, approve, and execute transactions
    Viewer = 2,   // Read-only access
}

#[contracttype]
#[derive(Clone)]
pub struct VaultConfig {
    pub name: Symbol,
    pub threshold: u32,
    pub signer_count: u32,
    pub tx_fee_amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct SpendLimit {
    pub token: Address,
    pub daily_limit: i128,
    pub last_reset: u64,
    pub spent_today: i128,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum ProposalStatus {
    Pending,
    Approved,
    Executed,
    Rejected,
}

#[contracttype]
#[derive(Clone)]
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
#[derive(Clone)]
pub struct VaultSignatures {
    pub signers: Vec<Address>,
}

#[contracttype]
pub enum StorageKey {
    Config,
    Signers,
    SignerRole(Address),
    Proposal(u64),
    ProposalCount,
    SpendLimit(Address),
    Initialized,
    FeeRecipient,
    FeeToken,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum VaultError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotASigner = 3,
    ThresholdNotMet = 4,
    ProposalNotFound = 5,
    ProposalNotApproved = 6,
    SpendLimitExceeded = 7,
    AlreadyApproved = 8,
    InvalidThreshold = 9,
    InvalidSignature = 10,
    InsufficientSignatures = 11,
    Unauthorized = 12,
    InsufficientFeeBalance = 13,
    InsufficientPermissions = 14,
    SignerAlreadyExists = 15,
    CannotRemoveLastAdmin = 16,
    NoSigners = 17,
}

#[contract]
pub struct StellarVault;

#[contractimpl]
impl CustomAccountInterface for StellarVault {
    type Error = VaultError;
    type Signature = VaultSignatures;

    #[allow(non_snake_case)]
    fn __check_auth(
        env: Env,
        _signature_payload: Hash<32>,
        signatures: VaultSignatures,
        auth_contexts: Vec<Context>,
    ) -> Result<(), VaultError> {
        let stored_signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::Signers)
            .ok_or(VaultError::NotInitialized)?;

        let config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        let mut valid_count = 0u32;
        for signer in signatures.signers.iter() {
            signer.require_auth();
            let is_valid = stored_signers.iter().any(|s| s == signer);
            if is_valid {
                // Check role - only Admin and Executor can sign
                let role: Role = env
                    .storage()
                    .instance()
                    .get(&StorageKey::SignerRole(signer.clone()))
                    .unwrap_or(Role::Viewer);
                
                if role != Role::Viewer {
                    valid_count += 1;
                }
            }
        }

        if valid_count < config.threshold {
            return Err(VaultError::InsufficientSignatures);
        }

        for context in auth_contexts.iter() {
            if let Context::Contract(c) = context {
                Self::check_transfer_policy(&env, &c.contract)?;
            }
        }

        Ok(())
    }
}

#[contractimpl]
impl StellarVault {
    // ============ Initialization ============

    pub fn initialize(
        env: Env,
        name: Symbol,
        signers: Vec<Address>,
        threshold: u32,
    ) -> Result<(), VaultError> {
        // Check not already initialized
        if env.storage().instance().has(&StorageKey::Config) {
            return Err(VaultError::AlreadyInitialized);
        }

        // Validate inputs
        if signers.is_empty() {
            return Err(VaultError::NoSigners);
        }
        if threshold == 0 || threshold > signers.len() as u32 {
            return Err(VaultError::InvalidThreshold);
        }

        // Store config
        let config = VaultConfig {
            name: name.clone(),
            threshold,
            signer_count: signers.len() as u32,
            tx_fee_amount: DEFAULT_TX_FEE,
        };
        env.storage().instance().set(&StorageKey::Config, &config);

        // Store fee recipient and token
        let fee_recipient = Address::from_string(&String::from_str(&env, FEE_RECIPIENT));
        let fee_token = Address::from_string(&String::from_str(&env, NATIVE_TOKEN));
        env.storage().instance().set(&StorageKey::FeeRecipient, &fee_recipient);
        env.storage().instance().set(&StorageKey::FeeToken, &fee_token);

        // Store signers and assign roles
        // FIRST signer (creator) gets Admin role, others get Executor
        for (i, signer) in signers.iter().enumerate() {
            let role = if i == 0 { Role::Admin } else { Role::Executor };
            env.storage().instance().set(&StorageKey::SignerRole(signer.clone()), &role);
        }

        env.storage().instance().set(&StorageKey::Signers, &signers);
        env.storage().instance().set(&StorageKey::ProposalCount, &0u64);
        env.storage().instance().set(&StorageKey::Initialized, &true);

        Ok(())
    }

    // ============ Internal Fee Collection ============

    fn collect_fee(env: &Env, payer: &Address) -> Result<(), VaultError> {
        let config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        if config.tx_fee_amount > 0 {
            let fee_token: Address = env
                .storage()
                .instance()
                .get(&StorageKey::FeeToken)
                .ok_or(VaultError::NotInitialized)?;

            let fee_recipient: Address = env
                .storage()
                .instance()
                .get(&StorageKey::FeeRecipient)
                .ok_or(VaultError::NotInitialized)?;

            let fee_token_client = TokenClient::new(env, &fee_token);
            fee_token_client.transfer(payer, &fee_recipient, &config.tx_fee_amount);
        }

        Ok(())
    }
    
    // ============ Role Management ============

    pub fn set_role(env: Env, admin: Address, member: Address, role: Role) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_role(&env, &admin, Role::Admin)?;

        // Ensure member is a signer
        Self::require_signer(&env, &member)?;

        // Ensure at least one admin remains if demoting an admin
        if role != Role::Admin {
            let current_role: Option<Role> = env.storage().instance().get(&StorageKey::SignerRole(member.clone()));
            if current_role == Some(Role::Admin) && Self::count_admins(&env) <= 1 {
                return Err(VaultError::CannotRemoveLastAdmin);
            }
        }

        // Collect fee
        Self::collect_fee(&env, &admin)?;

        env.storage().instance().set(&StorageKey::SignerRole(member), &role);
        Ok(())
    }

    pub fn get_role(env: Env, member: Address) -> Option<Role> {
        env.storage().instance().get(&StorageKey::SignerRole(member))
    }

    pub fn get_all_roles(env: Env) -> Vec<(Address, Role)> {
        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::Signers)
            .unwrap_or(Vec::new(&env));

        let mut result = Vec::new(&env);
        for signer in signers.iter() {
            let role: Role = env
                .storage()
                .instance()
                .get(&StorageKey::SignerRole(signer.clone()))
                .unwrap_or(Role::Viewer);
            result.push_back((signer, role));
        }
        result
    }

    fn count_admins(env: &Env) -> u32 {
        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::Signers)
            .unwrap_or(Vec::new(env));

        let mut count = 0u32;
        for signer in signers.iter() {
            let role: Option<Role> = env.storage().instance().get(&StorageKey::SignerRole(signer));
            if role == Some(Role::Admin) {
                count += 1;
            }
        }
        count
    }

    fn require_role(env: &Env, address: &Address, min_role: Role) -> Result<(), VaultError> {
        Self::require_signer(env, address)?;

        let role: Role = env
            .storage()
            .instance()
            .get(&StorageKey::SignerRole(address.clone()))
            .unwrap_or(Role::Viewer);

        // Admin (0) < Executor (1) < Viewer (2)
        // Lower number = more permissions
        let role_value = match role {
            Role::Admin => 0,
            Role::Executor => 1,
            Role::Viewer => 2,
        };
        let min_role_value = match min_role {
            Role::Admin => 0,
            Role::Executor => 1,
            Role::Viewer => 2,
        };

        if role_value > min_role_value {
            return Err(VaultError::InsufficientPermissions);
        }

        Ok(())
    }

    // ============ Signer Management ============

    pub fn add_signer(env: Env, admin: Address, new_signer: Address, role: Role) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_role(&env, &admin, Role::Admin)?;

        let mut signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::Signers)
            .ok_or(VaultError::NotInitialized)?;

        // Check if already exists
        for s in signers.iter() {
            if s == new_signer {
                return Err(VaultError::SignerAlreadyExists);
            }
        }

        // Collect fee
        Self::collect_fee(&env, &admin)?;

        let mut config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        signers.push_back(new_signer.clone());
        config.signer_count = signers.len() as u32;

        env.storage().instance().set(&StorageKey::Signers, &signers);
        env.storage().instance().set(&StorageKey::Config, &config);
        env.storage().instance().set(&StorageKey::SignerRole(new_signer), &role);

        Ok(())
    }

    pub fn remove_signer(env: Env, admin: Address, signer_to_remove: Address) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_role(&env, &admin, Role::Admin)?;

        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::Signers)
            .ok_or(VaultError::NotInitialized)?;

        let mut config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        // Check if removing last admin
        let role: Option<Role> = env.storage().instance().get(&StorageKey::SignerRole(signer_to_remove.clone()));
        if role == Some(Role::Admin) && Self::count_admins(&env) <= 1 {
            return Err(VaultError::CannotRemoveLastAdmin);
        }

        let mut new_signers = Vec::new(&env);
        let mut found = false;
        for s in signers.iter() {
            if s != signer_to_remove {
                new_signers.push_back(s);
            } else {
                found = true;
            }
        }

        if !found {
            return Err(VaultError::NotASigner);
        }

        // Check threshold won't be violated
        if (new_signers.len() as u32) < config.threshold {
            return Err(VaultError::InvalidThreshold);
        }

        // Collect fee
        Self::collect_fee(&env, &admin)?;

        config.signer_count = new_signers.len() as u32;
        env.storage().instance().set(&StorageKey::Signers, &new_signers);
        env.storage().instance().set(&StorageKey::Config, &config);
        env.storage().instance().remove(&StorageKey::SignerRole(signer_to_remove));

        Ok(())
    }

    /// Allows any signer to voluntarily leave the vault
    /// - Last signer can leave (abandons vault)
    /// - Fee is only charged if not the last signer
    pub fn leave_vault(env: Env, signer: Address) -> Result<(), VaultError> {
        signer.require_auth();
        
        // Check signer exists
        Self::require_signer(&env, &signer)?;
        
        let mut config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::Signers)
            .ok_or(VaultError::NotInitialized)?;

        // If not the last signer, check constraints
        if config.signer_count > 1 {
            // Check if this would violate threshold
            if (config.signer_count - 1) < config.threshold {
                return Err(VaultError::InvalidThreshold);
            }

            // Check if removing last admin (only if others remain)
            let role: Option<Role> = env.storage().instance().get(&StorageKey::SignerRole(signer.clone()));
            if role == Some(Role::Admin) && Self::count_admins(&env) <= 1 {
                return Err(VaultError::CannotRemoveLastAdmin);
            }

            // Collect fee (only if not abandoning)
            Self::collect_fee(&env, &signer)?;
        }
        // If last signer, allow leaving without fee (abandoning vault)
        
        // Remove the signer
        let mut new_signers = Vec::new(&env);
        for s in signers.iter() {
            if s != signer {
                new_signers.push_back(s);
            }
        }
        
        // Update signer count
        config.signer_count = new_signers.len() as u32;
        
        // Save updated data
        env.storage().instance().set(&StorageKey::Signers, &new_signers);
        env.storage().instance().set(&StorageKey::Config, &config);
        
        // Remove role
        env.storage().instance().remove(&StorageKey::SignerRole(signer));
        
        Ok(())
    }

    pub fn set_threshold(env: Env, admin: Address, new_threshold: u32) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_role(&env, &admin, Role::Admin)?;

        let mut config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        if new_threshold == 0 || new_threshold > config.signer_count {
            return Err(VaultError::InvalidThreshold);
        }

        // Collect fee
        Self::collect_fee(&env, &admin)?;

        config.threshold = new_threshold;
        env.storage().instance().set(&StorageKey::Config, &config);

        Ok(())
    }

    // ============ Fee Management ============

    pub fn set_tx_fee(env: Env, admin: Address, new_fee_amount: i128) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_role(&env, &admin, Role::Admin)?;

        // Collect fee for this admin action
        Self::collect_fee(&env, &admin)?;

        let mut config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        config.tx_fee_amount = new_fee_amount;
        env.storage().instance().set(&StorageKey::Config, &config);

        Ok(())
    }

    pub fn get_tx_fee(env: Env) -> Result<i128, VaultError> {
        let config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        Ok(config.tx_fee_amount)
    }

    pub fn get_fee_recipient(env: Env) -> Result<Address, VaultError> {
        env.storage()
            .instance()
            .get(&StorageKey::FeeRecipient)
            .ok_or(VaultError::NotInitialized)
    }

    // ============ Spending Policies ============

    pub fn set_spend_limit(
        env: Env,
        admin: Address,
        token: Address,
        daily_limit: i128,
    ) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_role(&env, &admin, Role::Admin)?;

        // Collect fee
        Self::collect_fee(&env, &admin)?;

        let spend_limit = SpendLimit {
            token: token.clone(),
            daily_limit,
            last_reset: env.ledger().timestamp(),
            spent_today: 0,
        };

        env.storage()
            .instance()
            .set(&StorageKey::SpendLimit(token), &spend_limit);

        Ok(())
    }

    pub fn get_remaining_spend(env: Env, token: Address) -> i128 {
        let spend_limit: Option<SpendLimit> = env
            .storage()
            .instance()
            .get(&StorageKey::SpendLimit(token.clone()));

        match spend_limit {
            Some(limit) => {
                let current_day = Self::current_day(&env);
                let limit_day = limit.last_reset / 86400;

                if current_day > limit_day {
                    limit.daily_limit
                } else {
                    limit.daily_limit - limit.spent_today
                }
            }
            None => i128::MAX,
        }
    }

    // ============ Proposal Workflow ============

    pub fn propose(
        env: Env,
        proposer: Address,
        token: Address,
        to: Address,
        amount: i128,
    ) -> Result<u64, VaultError> {
        proposer.require_auth();
        Self::require_role(&env, &proposer, Role::Executor)?;

        let proposal_id: u64 = env
            .storage()
            .instance()
            .get(&StorageKey::ProposalCount)
            .unwrap_or(0);

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
        env.storage()
            .instance()
            .set(&StorageKey::ProposalCount, &(proposal_id + 1));

        Ok(proposal_id)
    }

    pub fn approve(env: Env, approver: Address, proposal_id: u64) -> Result<(), VaultError> {
        approver.require_auth();
        Self::require_role(&env, &approver, Role::Executor)?;

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&StorageKey::Proposal(proposal_id))
            .ok_or(VaultError::ProposalNotFound)?;

        let config: VaultConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)?;

        let already_approved = proposal.approvals.iter().any(|a| a == approver);
        if already_approved {
            return Err(VaultError::AlreadyApproved);
        }

        proposal.approvals.push_back(approver);

        if proposal.approvals.len() >= config.threshold {
            proposal.status = ProposalStatus::Approved;
        }

        env.storage()
            .instance()
            .set(&StorageKey::Proposal(proposal_id), &proposal);

        Ok(())
    }

    pub fn execute(env: Env, executor: Address, proposal_id: u64) -> Result<(), VaultError> {
        executor.require_auth();
        Self::require_role(&env, &executor, Role::Executor)?;

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&StorageKey::Proposal(proposal_id))
            .ok_or(VaultError::ProposalNotFound)?;

        if proposal.status != ProposalStatus::Approved {
            return Err(VaultError::ProposalNotApproved);
        }

        Self::check_spend_limit(&env, &proposal.token, proposal.amount)?;

        // Collect transaction fee from executor
        Self::collect_fee(&env, &executor)?;

        // Execute transfer from vault
        let token_client = TokenClient::new(&env, &proposal.token);
        token_client.transfer(&env.current_contract_address(), &proposal.to, &proposal.amount);

        Self::record_spend(&env, &proposal.token, proposal.amount);

        proposal.status = ProposalStatus::Executed;
        env.storage()
            .instance()
            .set(&StorageKey::Proposal(proposal_id), &proposal);

        Ok(())
    }

    // ============ View Functions ============

    pub fn get_config(env: Env) -> Result<VaultConfig, VaultError> {
        env.storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(VaultError::NotInitialized)
    }

    pub fn get_signers(env: Env) -> Result<Vec<Address>, VaultError> {
        env.storage()
            .instance()
            .get(&StorageKey::Signers)
            .ok_or(VaultError::NotInitialized)
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, VaultError> {
        env.storage()
            .instance()
            .get(&StorageKey::Proposal(proposal_id))
            .ok_or(VaultError::ProposalNotFound)
    }

    pub fn get_vault_address(env: Env) -> Address {
        env.current_contract_address()
    }

    pub fn get_proposal_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&StorageKey::ProposalCount)
            .unwrap_or(0)
    }

    // ============ Internal Functions ============

    fn require_signer(env: &Env, address: &Address) -> Result<(), VaultError> {
        let signers: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::Signers)
            .ok_or(VaultError::NotInitialized)?;

        let is_signer = signers.iter().any(|s| s == *address);
        if !is_signer {
            return Err(VaultError::NotASigner);
        }

        Ok(())
    }

    fn check_transfer_policy(env: &Env, token: &Address) -> Result<(), VaultError> {
        let _spend_limit: Option<SpendLimit> = env
            .storage()
            .instance()
            .get(&StorageKey::SpendLimit(token.clone()));
        Ok(())
    }

    fn check_spend_limit(env: &Env, token: &Address, amount: i128) -> Result<(), VaultError> {
        let spend_limit: Option<SpendLimit> = env
            .storage()
            .instance()
            .get(&StorageKey::SpendLimit(token.clone()));

        if let Some(mut limit) = spend_limit {
            let current_day = Self::current_day(env);
            let limit_day = limit.last_reset / 86400;

            if current_day > limit_day {
                limit.spent_today = 0;
                limit.last_reset = env.ledger().timestamp();
            }

            if limit.spent_today + amount > limit.daily_limit {
                return Err(VaultError::SpendLimitExceeded);
            }
        }

        Ok(())
    }

    fn record_spend(env: &Env, token: &Address, amount: i128) {
        let spend_limit: Option<SpendLimit> = env
            .storage()
            .instance()
            .get(&StorageKey::SpendLimit(token.clone()));

        if let Some(mut limit) = spend_limit {
            let current_day = Self::current_day(env);
            let limit_day = limit.last_reset / 86400;

            if current_day > limit_day {
                limit.spent_today = amount;
                limit.last_reset = env.ledger().timestamp();
            } else {
                limit.spent_today += amount;
            }

            env.storage()
                .instance()
                .set(&StorageKey::SpendLimit(token.clone()), &limit);
        }
    }

    fn current_day(env: &Env) -> u64 {
        env.ledger().timestamp() / 86400
    }
}
