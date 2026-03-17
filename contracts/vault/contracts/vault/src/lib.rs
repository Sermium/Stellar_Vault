#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, token, Address, Env, Symbol, String, Vec,
};

// ============ CONSTANTS ============
const FEE_RECIPIENT: &str = "GDI33VCZUVNOPLHPBL5AIQXRO34XY2U4OLS3GFBPJRGGSA2UUCWTE37R";
const NATIVE_TOKEN: &str = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const DEFAULT_TX_FEE: i128 = 1_000_000; // 0.1 XLM

// ============ TYPES ============
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Role {
    Admin = 0,
    Executor = 1,
    Viewer = 2,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ProposalStatus {
    Pending = 0,
    Approved = 1,
    Executed = 2,
    Rejected = 3,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum LockType {
    TimeLock = 0,
    Vesting = 1,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum LockStatus {
    Active = 0,
    PartiallyReleased = 1,
    FullyReleased = 2,
    Cancelled = 3,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VaultConfig {
    pub name: Symbol,
    pub signer_count: u32,
    pub threshold: u32,
    pub tx_fee_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub proposer: Address,
    pub token: Address,
    pub recipient: Address,
    pub amount: i128,
    pub status: ProposalStatus,
    pub approvals: Vec<Address>,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct SpendLimit {
    pub token: Address,
    pub daily_limit: i128,
    pub spent_today: i128,
    pub last_reset: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AssetLock {
    pub id: u64,
    pub creator: Address,
    pub beneficiary: Address,
    pub token: Address,
    pub total_amount: i128,
    pub released_amount: i128,
    pub lock_type: LockType,
    pub status: LockStatus,
    pub created_at: u64,
    pub start_time: u64,
    pub end_time: u64,
    pub cliff_time: u64,
    pub release_intervals: u64,
    pub revocable: bool,
    pub description: Symbol,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct LockInfo {
    pub total_locked: i128,
    pub available_to_claim: i128,
    pub already_claimed: i128,
    pub next_unlock_time: u64,
    pub percent_unlocked: u32,
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
    Lock(u64),
    LockCount,
    TokenLockedAmount(Address),
}

// ============ ERRORS ============
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VaultError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotAuthorized = 3,
    NotSigner = 4,
    InvalidThreshold = 5,
    ProposalNotFound = 6,
    AlreadyApproved = 7,
    NotEnoughApprovals = 8,
    AlreadyExecuted = 9,
    SpendLimitExceeded = 10,
    InvalidAmount = 11,
    TransferFailed = 12,
    SignerAlreadyExists = 13,
    CannotRemoveLastAdmin = 14,
    InvalidRole = 15,
    InsufficientBalance = 16,
    FeeFailed = 17,
    LockNotFound = 18,
    LockNotActive = 19,
    NothingToRelease = 20,
    CliffNotReached = 21,
    LockNotRevocable = 22,
    InvalidTimeRange = 23,
    InsufficientUnlockedBalance = 24,
}

#[contract]
pub struct StellarVault;

#[contractimpl]
impl StellarVault {
    // ============ INITIALIZATION ============
    pub fn initialize(
        env: Env,
        name: Symbol,
        signers: Vec<Address>,
        threshold: u32,
    ) -> Result<(), VaultError> {
        if env.storage().instance().has(&StorageKey::Initialized) {
            return Err(VaultError::AlreadyInitialized);
        }

        if signers.is_empty() || threshold == 0 || threshold > signers.len() as u32 {
            return Err(VaultError::InvalidThreshold);
        }

        let config = VaultConfig {
            name,
            signer_count: signers.len() as u32,
            threshold,
            tx_fee_amount: DEFAULT_TX_FEE,
        };

        env.storage().instance().set(&StorageKey::Config, &config);
        env.storage().instance().set(&StorageKey::Signers, &signers);
        env.storage().instance().set(&StorageKey::ProposalCount, &0u64);
        env.storage().instance().set(&StorageKey::LockCount, &0u64);

        let fee_recipient = Address::from_string(&String::from_str(&env, FEE_RECIPIENT));
        let fee_token = Address::from_string(&String::from_str(&env, NATIVE_TOKEN));
        env.storage().instance().set(&StorageKey::FeeRecipient, &fee_recipient);
        env.storage().instance().set(&StorageKey::FeeToken, &fee_token);

        for (i, signer) in signers.iter().enumerate() {
            let role = if i == 0 { Role::Admin } else { Role::Executor };
            env.storage().instance().set(&StorageKey::SignerRole(signer), &role);
        }

        env.storage().instance().set(&StorageKey::Initialized, &true);
        Ok(())
    }

    // ============ FEE COLLECTION ============
    fn collect_fee(env: &Env, payer: &Address) -> Result<(), VaultError> {
        let config: VaultConfig = env.storage().instance().get(&StorageKey::Config).unwrap();
        let fee_recipient: Address = env.storage().instance().get(&StorageKey::FeeRecipient).unwrap();
        let fee_token: Address = env.storage().instance().get(&StorageKey::FeeToken).unwrap();

        if config.tx_fee_amount > 0 {
            let token_client = token::Client::new(env, &fee_token);
            token_client.transfer(payer, &fee_recipient, &config.tx_fee_amount);
        }
        Ok(())
    }

    // ============ ROLE MANAGEMENT ============
    fn require_initialized(env: &Env) -> Result<(), VaultError> {
        if !env.storage().instance().has(&StorageKey::Initialized) {
            return Err(VaultError::NotInitialized);
        }
        Ok(())
    }

    fn require_signer(env: &Env, address: &Address) -> Result<(), VaultError> {
        let signers: Vec<Address> = env.storage().instance().get(&StorageKey::Signers).unwrap();
        if !signers.contains(address) {
            return Err(VaultError::NotSigner);
        }
        Ok(())
    }

    fn require_role(env: &Env, address: &Address, required_role: Role) -> Result<(), VaultError> {
        Self::require_signer(env, address)?;
        let role: Role = env.storage().instance()
            .get(&StorageKey::SignerRole(address.clone()))
            .unwrap_or(Role::Viewer);
        if role as u32 > required_role as u32 {
            return Err(VaultError::NotAuthorized);
        }
        Ok(())
    }

    fn count_admins(env: &Env) -> u32 {
        let signers: Vec<Address> = env.storage().instance().get(&StorageKey::Signers).unwrap();
        let mut count = 0u32;
        for signer in signers.iter() {
            let role: Role = env.storage().instance()
                .get(&StorageKey::SignerRole(signer))
                .unwrap_or(Role::Viewer);
            if role == Role::Admin {
                count += 1;
            }
        }
        count
    }

    pub fn set_role(env: Env, admin: Address, signer: Address, new_role: Role) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &admin, Role::Admin)?;
        Self::require_signer(&env, &signer)?;

        let current_role: Role = env.storage().instance()
            .get(&StorageKey::SignerRole(signer.clone()))
            .unwrap_or(Role::Viewer);

        if current_role == Role::Admin && new_role != Role::Admin {
            let admin_count = Self::count_admins(&env);
            if admin_count <= 1 {
                return Err(VaultError::CannotRemoveLastAdmin);
            }
        }

        Self::collect_fee(&env, &admin)?;
        env.storage().instance().set(&StorageKey::SignerRole(signer), &new_role);
        Ok(())
    }

    pub fn get_role(env: Env, signer: Address) -> Result<Role, VaultError> {
        Self::require_initialized(&env)?;
        let role: Role = env.storage().instance()
            .get(&StorageKey::SignerRole(signer))
            .unwrap_or(Role::Viewer);
        Ok(role)
    }

    // ============ SIGNER MANAGEMENT ============
    pub fn add_signer(env: Env, admin: Address, new_signer: Address, role: Role) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &admin, Role::Admin)?;

        let mut signers: Vec<Address> = env.storage().instance().get(&StorageKey::Signers).unwrap();
        if signers.contains(&new_signer) {
            return Err(VaultError::SignerAlreadyExists);
        }

        Self::collect_fee(&env, &admin)?;

        signers.push_back(new_signer.clone());
        let mut config: VaultConfig = env.storage().instance().get(&StorageKey::Config).unwrap();
        config.signer_count = signers.len() as u32;

        env.storage().instance().set(&StorageKey::Signers, &signers);
        env.storage().instance().set(&StorageKey::Config, &config);
        env.storage().instance().set(&StorageKey::SignerRole(new_signer), &role);
        Ok(())
    }

    pub fn remove_signer(env: Env, admin: Address, signer_to_remove: Address) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &admin, Role::Admin)?;
        Self::require_signer(&env, &signer_to_remove)?;

        let role: Role = env.storage().instance()
            .get(&StorageKey::SignerRole(signer_to_remove.clone()))
            .unwrap_or(Role::Viewer);

        if role == Role::Admin {
            let admin_count = Self::count_admins(&env);
            if admin_count <= 1 {
                return Err(VaultError::CannotRemoveLastAdmin);
            }
        }

        let mut config: VaultConfig = env.storage().instance().get(&StorageKey::Config).unwrap();
        if config.signer_count <= config.threshold {
            return Err(VaultError::InvalidThreshold);
        }

        Self::collect_fee(&env, &admin)?;

        let signers: Vec<Address> = env.storage().instance().get(&StorageKey::Signers).unwrap();
        let mut new_signers = Vec::new(&env);
        for s in signers.iter() {
            if s != signer_to_remove {
                new_signers.push_back(s);
            }
        }

        config.signer_count = new_signers.len() as u32;
        env.storage().instance().set(&StorageKey::Signers, &new_signers);
        env.storage().instance().set(&StorageKey::Config, &config);
        env.storage().instance().remove(&StorageKey::SignerRole(signer_to_remove));
        Ok(())
    }

    pub fn leave_vault(env: Env, signer: Address) -> Result<(), VaultError> {
        signer.require_auth();
        Self::require_initialized(&env)?;
        Self::require_signer(&env, &signer)?;

        let mut config: VaultConfig = env.storage().instance().get(&StorageKey::Config).unwrap();
        let signers: Vec<Address> = env.storage().instance().get(&StorageKey::Signers).unwrap();

        if signers.len() == 1 {
            Self::collect_fee(&env, &signer)?;
            env.storage().instance().set(&StorageKey::Signers, &Vec::<Address>::new(&env));
            config.signer_count = 0;
            env.storage().instance().set(&StorageKey::Config, &config);
            env.storage().instance().remove(&StorageKey::SignerRole(signer));
            return Ok(());
        }

        let role: Role = env.storage().instance()
            .get(&StorageKey::SignerRole(signer.clone()))
            .unwrap_or(Role::Viewer);

        if role == Role::Admin {
            let admin_count = Self::count_admins(&env);
            if admin_count <= 1 {
                return Err(VaultError::CannotRemoveLastAdmin);
            }
        }

        if config.signer_count <= config.threshold {
            return Err(VaultError::InvalidThreshold);
        }

        Self::collect_fee(&env, &signer)?;

        let mut new_signers = Vec::new(&env);
        for s in signers.iter() {
            if s != signer {
                new_signers.push_back(s);
            }
        }

        config.signer_count = new_signers.len() as u32;
        env.storage().instance().set(&StorageKey::Signers, &new_signers);
        env.storage().instance().set(&StorageKey::Config, &config);
        env.storage().instance().remove(&StorageKey::SignerRole(signer));
        Ok(())
    }

    pub fn set_threshold(env: Env, admin: Address, new_threshold: u32) -> Result<(), VaultError> {
        admin.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &admin, Role::Admin)?;

        let mut config: VaultConfig = env.storage().instance().get(&StorageKey::Config).unwrap();
        if new_threshold == 0 || new_threshold > config.signer_count {
            return Err(VaultError::InvalidThreshold);
        }

        Self::collect_fee(&env, &admin)?;
        config.threshold = new_threshold;
        env.storage().instance().set(&StorageKey::Config, &config);
        Ok(())
    }

    // ============ ASSET LOCKING ============
    fn get_locked_amount(env: &Env, token: &Address) -> i128 {
        env.storage().instance()
            .get(&StorageKey::TokenLockedAmount(token.clone()))
            .unwrap_or(0i128)
    }

    fn update_locked_amount(env: &Env, token: &Address, delta: i128) {
        let current = Self::get_locked_amount(env, token);
        let new_amount = current + delta;
        if new_amount <= 0 {
            env.storage().instance().remove(&StorageKey::TokenLockedAmount(token.clone()));
        } else {
            env.storage().instance().set(&StorageKey::TokenLockedAmount(token.clone()), &new_amount);
        }
    }

    fn next_lock_id(env: &Env) -> u64 {
        let count: u64 = env.storage().instance().get(&StorageKey::LockCount).unwrap_or(0);
        env.storage().instance().set(&StorageKey::LockCount, &(count + 1));
        count + 1
    }

    pub fn create_time_lock(
        env: Env,
        admin: Address,
        beneficiary: Address,
        token: Address,
        amount: i128,
        unlock_time: u64,
        revocable: bool,
        description: Symbol,
    ) -> Result<u64, VaultError> {
        admin.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &admin, Role::Admin)?;

        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }

        let current_time = env.ledger().timestamp();
        if unlock_time <= current_time {
            return Err(VaultError::InvalidTimeRange);
        }

        let token_client = token::Client::new(&env, &token);
        let vault_balance = token_client.balance(&env.current_contract_address());
        let already_locked = Self::get_locked_amount(&env, &token);
        let available = vault_balance - already_locked;

        if available < amount {
            return Err(VaultError::InsufficientUnlockedBalance);
        }

        Self::collect_fee(&env, &admin)?;

        let lock_id = Self::next_lock_id(&env);
        let lock = AssetLock {
            id: lock_id,
            creator: admin,
            beneficiary,
            token: token.clone(),
            total_amount: amount,
            released_amount: 0,
            lock_type: LockType::TimeLock,
            status: LockStatus::Active,
            created_at: current_time,
            start_time: current_time,
            end_time: unlock_time,
            cliff_time: 0,
            release_intervals: 0,
            revocable,
            description,
        };

        env.storage().instance().set(&StorageKey::Lock(lock_id), &lock);
        Self::update_locked_amount(&env, &token, amount);

        Ok(lock_id)
    }

    pub fn create_vesting_lock(
        env: Env,
        admin: Address,
        beneficiary: Address,
        token: Address,
        amount: i128,
        start_time: u64,
        cliff_duration: u64,
        total_duration: u64,
        release_intervals: u64,
        revocable: bool,
        description: Symbol,
    ) -> Result<u64, VaultError> {
        admin.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &admin, Role::Admin)?;

        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }

        let current_time = env.ledger().timestamp();
        let actual_start = if start_time > current_time { start_time } else { current_time };
        let cliff_time = actual_start + cliff_duration;
        let end_time = actual_start + total_duration;

        if end_time <= actual_start {
            return Err(VaultError::InvalidTimeRange);
        }

        let token_client = token::Client::new(&env, &token);
        let vault_balance = token_client.balance(&env.current_contract_address());
        let already_locked = Self::get_locked_amount(&env, &token);
        let available = vault_balance - already_locked;

        if available < amount {
            return Err(VaultError::InsufficientUnlockedBalance);
        }

        Self::collect_fee(&env, &admin)?;

        let lock_id = Self::next_lock_id(&env);
        let lock = AssetLock {
            id: lock_id,
            creator: admin,
            beneficiary,
            token: token.clone(),
            total_amount: amount,
            released_amount: 0,
            lock_type: LockType::Vesting,
            status: LockStatus::Active,
            created_at: current_time,
            start_time: actual_start,
            end_time,
            cliff_time,
            release_intervals,
            revocable,
            description,
        };

        env.storage().instance().set(&StorageKey::Lock(lock_id), &lock);
        Self::update_locked_amount(&env, &token, amount);

        Ok(lock_id)
    }

    fn calculate_available(env: &Env, lock: &AssetLock) -> Result<i128, VaultError> {
        if lock.status != LockStatus::Active && lock.status != LockStatus::PartiallyReleased {
            return Err(VaultError::LockNotActive);
        }

        let current_time = env.ledger().timestamp();
        let remaining = lock.total_amount - lock.released_amount;

        match lock.lock_type {
            LockType::TimeLock => {
                if current_time >= lock.end_time {
                    Ok(remaining)
                } else {
                    Ok(0)
                }
            }
            LockType::Vesting => {
                if current_time < lock.cliff_time {
                    return Ok(0);
                }

                let vesting_duration = lock.end_time - lock.start_time;
                let elapsed = if current_time >= lock.end_time {
                    vesting_duration
                } else {
                    current_time - lock.start_time
                };

                let total_vested = if elapsed >= vesting_duration {
                    lock.total_amount
                } else if lock.release_intervals > 0 {
                    let intervals_passed = elapsed / lock.release_intervals;
                    let total_intervals = vesting_duration / lock.release_intervals;
                    (lock.total_amount * intervals_passed as i128) / total_intervals as i128
                } else {
                    (lock.total_amount * elapsed as i128) / vesting_duration as i128
                };

                let available = total_vested - lock.released_amount;
                Ok(if available > 0 { available } else { 0 })
            }
        }
    }

    pub fn claim_lock(env: Env, caller: Address, lock_id: u64) -> Result<i128, VaultError> {
        caller.require_auth();
        Self::require_initialized(&env)?;

        let mut lock: AssetLock = env.storage().instance()
            .get(&StorageKey::Lock(lock_id))
            .ok_or(VaultError::LockNotFound)?;

        let is_beneficiary = lock.beneficiary == caller;
        let is_admin = Self::require_role(&env, &caller, Role::Admin).is_ok();

        if !is_beneficiary && !is_admin {
            return Err(VaultError::NotAuthorized);
        }

        let available = Self::calculate_available(&env, &lock)?;
        if available <= 0 {
            return Err(VaultError::NothingToRelease);
        }

        // ADD THIS LINE - COLLECT FEE
        Self::collect_fee(&env, &caller)?;

        let token_client = token::Client::new(&env, &lock.token);
        token_client.transfer(&env.current_contract_address(), &lock.beneficiary, &available);

        lock.released_amount += available;
        if lock.released_amount >= lock.total_amount {
            lock.status = LockStatus::FullyReleased;
        } else {
            lock.status = LockStatus::PartiallyReleased;
        }

        env.storage().instance().set(&StorageKey::Lock(lock_id), &lock);
        Self::update_locked_amount(&env, &lock.token, -available);

        Ok(available)
    }

    pub fn cancel_lock(env: Env, admin: Address, lock_id: u64) -> Result<i128, VaultError> {
        admin.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &admin, Role::Admin)?;

        let mut lock: AssetLock = env.storage().instance()
            .get(&StorageKey::Lock(lock_id))
            .ok_or(VaultError::LockNotFound)?;

        if !lock.revocable {
            return Err(VaultError::LockNotRevocable);
        }

        if lock.status != LockStatus::Active && lock.status != LockStatus::PartiallyReleased {
            return Err(VaultError::LockNotActive);
        }

        Self::collect_fee(&env, &admin)?;

        let remaining = lock.total_amount - lock.released_amount;
        lock.status = LockStatus::Cancelled;

        env.storage().instance().set(&StorageKey::Lock(lock_id), &lock);
        Self::update_locked_amount(&env, &lock.token, -remaining);

        Ok(remaining)
    }

    pub fn get_lock(env: Env, lock_id: u64) -> Result<AssetLock, VaultError> {
        Self::require_initialized(&env)?;
        env.storage().instance()
            .get(&StorageKey::Lock(lock_id))
            .ok_or(VaultError::LockNotFound)
    }

    pub fn get_lock_info(env: Env, lock_id: u64) -> Result<LockInfo, VaultError> {
        Self::require_initialized(&env)?;
        let lock: AssetLock = env.storage().instance()
            .get(&StorageKey::Lock(lock_id))
            .ok_or(VaultError::LockNotFound)?;

        let available = Self::calculate_available(&env, &lock).unwrap_or(0);
        let current_time = env.ledger().timestamp();

        let next_unlock = match lock.lock_type {
            LockType::TimeLock => lock.end_time,
            LockType::Vesting => {
                if current_time < lock.cliff_time {
                    lock.cliff_time
                } else if lock.release_intervals > 0 {
                    let elapsed = current_time - lock.start_time;
                    let next_interval = ((elapsed / lock.release_intervals) + 1) * lock.release_intervals;
                    lock.start_time + next_interval
                } else {
                    current_time
                }
            }
        };

        let percent = if lock.total_amount > 0 {
            ((lock.released_amount + available) * 100 / lock.total_amount) as u32
        } else {
            0
        };

        Ok(LockInfo {
            total_locked: lock.total_amount,
            available_to_claim: available,
            already_claimed: lock.released_amount,
            next_unlock_time: next_unlock,
            percent_unlocked: percent,
        })
    }

    pub fn get_token_locked_amount(env: Env, token: Address) -> Result<i128, VaultError> {
        Self::require_initialized(&env)?;
        Ok(Self::get_locked_amount(&env, &token))
    }

    pub fn get_lock_count(env: Env) -> Result<u64, VaultError> {
        Self::require_initialized(&env)?;
        Ok(env.storage().instance().get(&StorageKey::LockCount).unwrap_or(0))
    }

    pub fn get_locks(env: Env, start: u64, limit: u64) -> Result<Vec<AssetLock>, VaultError> {
        Self::require_initialized(&env)?;
        let count: u64 = env.storage().instance().get(&StorageKey::LockCount).unwrap_or(0);
        let mut locks = Vec::new(&env);

        let end = if start + limit > count { count } else { start + limit };
        for i in start..end {
            if let Some(lock) = env.storage().instance().get::<StorageKey, AssetLock>(&StorageKey::Lock(i + 1)) {
                locks.push_back(lock);
            }
        }

        Ok(locks)
    }

    // ============ PROPOSALS ============
    pub fn propose(
        env: Env,
        proposer: Address,
        token: Address,
        recipient: Address,
        amount: i128,
    ) -> Result<u64, VaultError> {
        proposer.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &proposer, Role::Executor)?;

        if amount <= 0 {
            return Err(VaultError::InvalidAmount);
        }

        let token_client = token::Client::new(&env, &token);
        let vault_balance = token_client.balance(&env.current_contract_address());
        let locked = Self::get_locked_amount(&env, &token);
        let available = vault_balance - locked;

        if available < amount {
            return Err(VaultError::InsufficientUnlockedBalance);
        }

        // ADD THIS LINE - COLLECT FEE
        Self::collect_fee(&env, &proposer)?;

        let count: u64 = env.storage().instance().get(&StorageKey::ProposalCount).unwrap_or(0);
        let new_id = count + 1;

        let mut approvals = Vec::new(&env);
        approvals.push_back(proposer.clone());

        let proposal = Proposal {
            id: new_id,
            proposer,
            token,
            recipient,
            amount,
            status: ProposalStatus::Pending,
            approvals,
            created_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&StorageKey::Proposal(new_id), &proposal);
        env.storage().instance().set(&StorageKey::ProposalCount, &new_id);

        Ok(new_id)
    }

    pub fn approve(env: Env, signer: Address, proposal_id: u64) -> Result<(), VaultError> {
        signer.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &signer, Role::Executor)?;

        let mut proposal: Proposal = env.storage().instance()
            .get(&StorageKey::Proposal(proposal_id))
            .ok_or(VaultError::ProposalNotFound)?;

        if proposal.status != ProposalStatus::Pending {
            return Err(VaultError::AlreadyExecuted);
        }

        if proposal.approvals.contains(&signer) {
            return Err(VaultError::AlreadyApproved);
        }

        // ADD THIS LINE - COLLECT FEE
        Self::collect_fee(&env, &signer)?;

        proposal.approvals.push_back(signer);

        let config: VaultConfig = env.storage().instance().get(&StorageKey::Config).unwrap();
        if proposal.approvals.len() >= config.threshold as u32 {
            proposal.status = ProposalStatus::Approved;
        }

        env.storage().instance().set(&StorageKey::Proposal(proposal_id), &proposal);
        Ok(())
    }

    pub fn execute(env: Env, executor: Address, proposal_id: u64) -> Result<(), VaultError> {
        executor.require_auth();
        Self::require_initialized(&env)?;
        Self::require_role(&env, &executor, Role::Executor)?;

        let mut proposal: Proposal = env.storage().instance()
            .get(&StorageKey::Proposal(proposal_id))
            .ok_or(VaultError::ProposalNotFound)?;

        if proposal.status == ProposalStatus::Executed {
            return Err(VaultError::AlreadyExecuted);
        }

        let config: VaultConfig = env.storage().instance().get(&StorageKey::Config).unwrap();
        if proposal.approvals.len() < config.threshold as u32 {
            return Err(VaultError::NotEnoughApprovals);
        }

        let token_client = token::Client::new(&env, &proposal.token);
        let vault_balance = token_client.balance(&env.current_contract_address());
        let locked = Self::get_locked_amount(&env, &proposal.token);
        let available = vault_balance - locked;

        if available < proposal.amount {
            return Err(VaultError::InsufficientUnlockedBalance);
        }

        Self::collect_fee(&env, &executor)?;

        token_client.transfer(&env.current_contract_address(), &proposal.recipient, &proposal.amount);

        proposal.status = ProposalStatus::Executed;
        env.storage().instance().set(&StorageKey::Proposal(proposal_id), &proposal);
        Ok(())
    }

    // ============ VIEW FUNCTIONS ============
    pub fn get_config(env: Env) -> Result<VaultConfig, VaultError> {
        Self::require_initialized(&env)?;
        Ok(env.storage().instance().get(&StorageKey::Config).unwrap())
    }

    pub fn get_signers(env: Env) -> Result<Vec<Address>, VaultError> {
        Self::require_initialized(&env)?;
        Ok(env.storage().instance().get(&StorageKey::Signers).unwrap())
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, VaultError> {
        Self::require_initialized(&env)?;
        env.storage().instance()
            .get(&StorageKey::Proposal(proposal_id))
            .ok_or(VaultError::ProposalNotFound)
    }

    pub fn get_proposal_count(env: Env) -> Result<u64, VaultError> {
        Self::require_initialized(&env)?;
        Ok(env.storage().instance().get(&StorageKey::ProposalCount).unwrap_or(0))
    }

    pub fn get_vault_address(env: Env) -> Address {
        env.current_contract_address()
    }

    pub fn get_available_balance(env: Env, token: Address) -> Result<i128, VaultError> {
        Self::require_initialized(&env)?;
        let token_client = token::Client::new(&env, &token);
        let total = token_client.balance(&env.current_contract_address());
        let locked = Self::get_locked_amount(&env, &token);
        Ok(total - locked)
    }
}
