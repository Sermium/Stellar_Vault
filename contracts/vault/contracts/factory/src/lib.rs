#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, BytesN, Env, Symbol, Vec, Bytes,
    token::Client as TokenClient,
};

#[contracttype]
#[derive(Clone)]
pub struct FactoryConfig {
    pub admin: Address,
    pub vault_wasm_hash: BytesN<32>,
    pub fee_token: Address,
    pub fee_amount: i128,
    pub fee_recipient: Address,
    pub total_vaults_created: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct VaultInfo {
    pub vault_address: Address,
    pub name: Symbol,
    pub owner: Address,
    pub signers: Vec<Address>,
    pub threshold: u32,
    pub created_at: u64,
    pub initialized: bool,
}

#[contracttype]
pub enum StorageKey {
    Config,
    VaultInfo(Address),
    VaultsByOwner(Address),
    AllVaults,
    VaultCount,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum FactoryError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotAdmin = 3,
    InvalidThreshold = 4,
    NoSigners = 5,
    InsufficientFee = 6,
}

// Interface to call vault's initialize
mod vault {
    use soroban_sdk::auth::Context;
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/stellar_vault.wasm"
    );
}

#[contract]
pub struct VaultFactory;

#[contractimpl]
impl VaultFactory {
    /// Initialize the factory
    pub fn initialize(
        env: Env,
        admin: Address,
        vault_wasm_hash: BytesN<32>,
        fee_token: Address,
        fee_amount: i128,
        fee_recipient: Address,
    ) -> Result<(), FactoryError> {
        if env.storage().instance().has(&StorageKey::Config) {
            return Err(FactoryError::AlreadyInitialized);
        }

        let config = FactoryConfig {
            admin,
            vault_wasm_hash,
            fee_token,
            fee_amount,
            fee_recipient,
            total_vaults_created: 0,
        };

        env.storage().instance().set(&StorageKey::Config, &config);
        env.storage().instance().set(&StorageKey::VaultCount, &0u64);
        env.storage().instance().set(&StorageKey::AllVaults, &Vec::<Address>::new(&env));

        Ok(())
    }

    /// Create AND initialize a vault in one transaction
    pub fn create_vault(
        env: Env,
        creator: Address,
        name: Symbol,
        signers: Vec<Address>,
        threshold: u32,
    ) -> Result<Address, FactoryError> {
        creator.require_auth();

        // Validate inputs
        if signers.is_empty() {
            return Err(FactoryError::NoSigners);
        }
        
        let signer_count = signers.len() as u32;
        if threshold == 0 || threshold > signer_count {
            return Err(FactoryError::InvalidThreshold);
        }

        let mut config: FactoryConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(FactoryError::NotInitialized)?;

        // Collect fee if set
        if config.fee_amount > 0 {
            let token = TokenClient::new(&env, &config.fee_token);
            token.transfer(&creator, &config.fee_recipient, &config.fee_amount);
        }

        // Generate deterministic salt
        let vault_count: u64 = env
            .storage()
            .instance()
            .get(&StorageKey::VaultCount)
            .unwrap_or(0);

        let salt = Self::generate_salt(&env, vault_count);

        // Deploy the vault contract (no constructor)
        #[allow(deprecated)]
        let deployed_address = env
            .deployer()
            .with_current_contract(salt)
            .deploy(config.vault_wasm_hash.clone());

        // Ensure creator is first in signers list (will get Admin role)
        let mut final_signers: Vec<Address> = Vec::new(&env);
        
        // Check if creator is already in signers
        let mut creator_found = false;
        for s in signers.iter() {
            if s == creator {
                creator_found = true;
                break;
            }
        }
        
        // Add creator first
        final_signers.push_back(creator.clone());
        
        // Add remaining signers (skip creator if already added)
        for s in signers.iter() {
            if s != creator {
                final_signers.push_back(s);
            }
        }

        // Adjust threshold if we added the creator
        let final_threshold = if !creator_found && threshold == signer_count {
            // If creator wasn't in list and threshold was max, increase it
            threshold + 1
        } else {
            threshold
        };

        // Initialize the vault with creator as first signer (Admin role)
        let vault_client = vault::Client::new(&env, &deployed_address);
        vault_client.initialize(&name, &final_signers, &final_threshold);

        // Store vault info with full details
        let vault_info = VaultInfo {
            vault_address: deployed_address.clone(),
            name: name.clone(),
            owner: creator.clone(),
            signers: final_signers.clone(),
            threshold: final_threshold,
            created_at: env.ledger().timestamp(),
            initialized: true,
        };

        env.storage().instance().set(&StorageKey::VaultInfo(deployed_address.clone()), &vault_info);

        // Update owner's vault list
        let mut owner_vaults: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::VaultsByOwner(creator.clone()))
            .unwrap_or(Vec::new(&env));
        owner_vaults.push_back(deployed_address.clone());
        env.storage().instance().set(&StorageKey::VaultsByOwner(creator), &owner_vaults);

        // Update all vaults list
        let mut all_vaults: Vec<Address> = env
            .storage()
            .instance()
            .get(&StorageKey::AllVaults)
            .unwrap_or(Vec::new(&env));
        all_vaults.push_back(deployed_address.clone());
        env.storage().instance().set(&StorageKey::AllVaults, &all_vaults);

        // Increment counter
        env.storage().instance().set(&StorageKey::VaultCount, &(vault_count + 1));

        // Update total created
        config.total_vaults_created += 1;
        env.storage().instance().set(&StorageKey::Config, &config);

        Ok(deployed_address)
    }
    // === Admin Functions ===

    pub fn set_fee(env: Env, admin: Address, new_fee_amount: i128) -> Result<(), FactoryError> {
        admin.require_auth();
        let mut config: FactoryConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(FactoryError::NotInitialized)?;

        if config.admin != admin {
            return Err(FactoryError::NotAdmin);
        }

        config.fee_amount = new_fee_amount;
        env.storage().instance().set(&StorageKey::Config, &config);
        Ok(())
    }

    pub fn set_fee_token(env: Env, admin: Address, new_fee_token: Address) -> Result<(), FactoryError> {
        admin.require_auth();
        let mut config: FactoryConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(FactoryError::NotInitialized)?;

        if config.admin != admin {
            return Err(FactoryError::NotAdmin);
        }

        config.fee_token = new_fee_token;
        env.storage().instance().set(&StorageKey::Config, &config);
        Ok(())
    }

    pub fn set_fee_recipient(env: Env, admin: Address, new_recipient: Address) -> Result<(), FactoryError> {
        admin.require_auth();
        let mut config: FactoryConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(FactoryError::NotInitialized)?;

        if config.admin != admin {
            return Err(FactoryError::NotAdmin);
        }

        config.fee_recipient = new_recipient;
        env.storage().instance().set(&StorageKey::Config, &config);
        Ok(())
    }

    pub fn set_vault_wasm_hash(env: Env, admin: Address, new_hash: BytesN<32>) -> Result<(), FactoryError> {
        admin.require_auth();
        let mut config: FactoryConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(FactoryError::NotInitialized)?;

        if config.admin != admin {
            return Err(FactoryError::NotAdmin);
        }

        config.vault_wasm_hash = new_hash;
        env.storage().instance().set(&StorageKey::Config, &config);
        Ok(())
    }

    pub fn set_admin(env: Env, admin: Address, new_admin: Address) -> Result<(), FactoryError> {
        admin.require_auth();
        let mut config: FactoryConfig = env
            .storage()
            .instance()
            .get(&StorageKey::Config)
            .ok_or(FactoryError::NotInitialized)?;

        if config.admin != admin {
            return Err(FactoryError::NotAdmin);
        }

        config.admin = new_admin;
        env.storage().instance().set(&StorageKey::Config, &config);
        Ok(())
    }

    // === View Functions ===

    pub fn get_config(env: Env) -> Option<FactoryConfig> {
        env.storage().instance().get(&StorageKey::Config)
    }

    pub fn get_vaults_by_owner(env: Env, owner: Address) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&StorageKey::VaultsByOwner(owner))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_vault_info(env: Env, vault_address: Address) -> Option<VaultInfo> {
        env.storage().instance().get(&StorageKey::VaultInfo(vault_address))
    }

    pub fn get_all_vaults(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&StorageKey::AllVaults)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_vault_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&StorageKey::VaultCount)
            .unwrap_or(0)
    }

    pub fn get_fee(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&StorageKey::Config)
            .map(|c: FactoryConfig| c.fee_amount)
            .unwrap_or(0)
    }

    // === Internal Functions ===

    fn generate_salt(env: &Env, count: u64) -> BytesN<32> {
        let mut salt_bytes = Bytes::new(env);
        let count_bytes = count.to_be_bytes();
        for byte in count_bytes.iter() {
            salt_bytes.push_back(*byte);
        }
        // Pad to 32 bytes
        while salt_bytes.len() < 32 {
            salt_bytes.push_back(0);
        }
        let hash = env.crypto().sha256(&salt_bytes);
        BytesN::from_array(env, &hash.to_array())
    }
}
