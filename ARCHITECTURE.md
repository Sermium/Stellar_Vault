#### Stellar Vault — Technical Architecture Document

1. Overview
Stellar Vault is an enterprise-grade treasury management platform built natively on Soroban, leveraging the OpenZeppelin Smart Account framework. It provides programmable multi-signature vaults with policy enforcement, role-based access control, and native USDC support.

## Design Principles
- Security-first: Built on OpenZeppelin's audited Smart Account framework
- Enterprise-native: Designed for institutional workflows and compliance requirements
- Modular: Extensible architecture allowing custom policies and integrations
- Stellar-optimized: Leverages Stellar's native capabilities (low fees, fast finality, native USDC)

2. System Architecture
┌─────────────────────────────────────────────────────────────────────┐
│                         STELLAR VAULT                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│   │   Web App   │    │   SDK/API   │    │   CLI Tool  │             │
│   │ (Dashboard) │    │             │    │             │             │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘             │
│          │                  │                  │                    │
│          └──────────────────┼──────────────────┘                    │
│                             │                                       │
│                             ▼                                       │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    SOROBAN SMART CONTRACTS                  │   │
│   ├─────────────────────────────────────────────────────────────┤   │
│   │                                                             │   │
│   │  ┌─────────────────────────────────────────────────────┐    │   │
│   │  │           OPENZEPPELIN SMART ACCOUNT                │    │   │
│   │  │  ┌─────────────┬─────────────┬─────────────┐        │    │   │
│   │  │  │   Signers   │   Context   │  Policies   │        │    │   │
│   │  │  │  & Verifiers│    Rules    │             │        │    │   │
│   │  │  └─────────────┴─────────────┴─────────────┘        │    │   │
│   │  └─────────────────────────────────────────────────────┘    │   │
│   │                             │                               │   │
│   │  ┌──────────────────────────┴───────────────────────────┐   │   │
│   │  │              STELLAR VAULT MODULES                   │   │   |
│   │  ├───────────────┬───────────────┬──────────────────────┤   │   │
│   │  │ Policy Engine │  Role Manager │  Treasury Operations │   │   │
│   │  │               │               │                      │   │   │
│   │  │ • Spend Limits│ • Admin       │ • USDC Integration   │   │   │
│   │  │ • Time Locks  │ • Proposer    │ • DEX Operations     │   │   │
│   │  │ • Rate Limits │ • Voter       │ • Batch Transfers    │   │   │
│   │  │ • Allowlists  │ • Executor    │ • Audit Trail        │   │   │
│   │  │               │ • Spender     │                      │   │   │
│   │  └───────────────┴───────────────┴──────────────────────┘   │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                 │                                   │
│                                 ▼                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    STELLAR NETWORK                          │   │
│   │         • Native USDC  • Stellar DEX  • Anchors             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

3. OpenZeppelin Smart Account Integration
Stellar Vault is built on top of the OpenZeppelin Smart Account framework for Stellar, released in December 2025. This provides a battle-tested foundation for account abstraction on Soroban.

## Framework Components
The OpenZeppelin framework provides three core primitives that we extend:

## WHO: Signers & Verifiers
Controls who can authorize transactions.

// Supported signer types
pub enum SignerType {
    Ed25519(BytesN<32>),           // Standard Stellar keypair
    P256(BytesN<65>),              // Passkey/WebAuthn support
    SorobanAccount(Address),       // Other smart contracts
    MultiSig(Vec<SignerType>, u32) // M-of-N configuration
}

## Stellar Vault Extension:

- Role-tagged signers (each signer assigned one or more roles)
- Hierarchical signer groups for organizational structure
- Recovery signers with time-delayed activation

## WHAT: Context Rules
Defines the scope of what actions are permitted.

// Context rule configuration
pub struct ContextRule {
    pub contract: Address,      // Target contract (or wildcard)
    pub function: Symbol,       // Function name (or wildcard)
    pub parameters: ParamRules, // Parameter constraints
}

## Stellar Vault Extension:

- Pre-configured rules for common treasury operations
- USDC-specific context rules
- Stellar DEX interaction rules

## HOW: Policies
Enforces constraints on transactions.

// Policy interface
pub trait Policy {
    fn validate(
        env: &Env,
        context: &TransactionContext,
        signers: &Vec<Address>
    ) -> Result<(), PolicyError>;
}

## Stellar Vault Extension:

- SpendLimitPolicy
- TimeLockPolicy
- RateLimitPolicy
- AllowlistPolicy
- ThresholdPolicy (role-based approval thresholds)

4. Smart Contract Architecture

## Contract Structure

stellar-vault-contracts/
├── vault/
│   ├── src/
│   │   ├── lib.rs              # Main vault contract
│   │   ├── storage.rs          # State management
│   │   └── events.rs           # Event definitions
│   └── Cargo.toml
├── policies/
│   ├── spend_limit/
│   │   └── src/lib.rs          # Spending limit policy
│   ├── time_lock/
│   │   └── src/lib.rs          # Time lock policy
│   ├── rate_limit/
│   │   └── src/lib.rs          # Rate limiting policy
│   └── allowlist/
│       └── src/lib.rs          # Destination allowlist
├── roles/
│   └── src/lib.rs              # Role management contract
└── treasury/
    └── src/lib.rs              # Treasury operations (USDC, DEX)

## Core Vault Contract
#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Vec, BytesN, Symbol};
use openzeppelin_smart_account::{SmartAccount, Signer, Policy, ContextRule};

#[contract]
pub struct StellarVault;

#[contractimpl]
impl StellarVault {
    /// Initialize a new vault
    pub fn initialize(
        env: Env,
        name: Symbol,
        signers: Vec<SignerConfig>,
        threshold: u32,
        policies: Vec<Address>,
    ) -> Result<(), VaultError> {
        // Store vault configuration
        // Initialize OpenZeppelin SmartAccount
        // Set up default policies
    }

    /// Propose a transaction
    pub fn propose(
        env: Env,
        proposer: Address,
        operation: Operation,
        memo: Option<String>,
    ) -> Result<u64, VaultError> {
        // Verify proposer has PROPOSER role
        // Validate operation against context rules
        // Create pending transaction
        // Emit ProposalCreated event
    }

    /// Approve a pending transaction
    pub fn approve(
        env: Env,
        voter: Address,
        proposal_id: u64,
    ) -> Result<(), VaultError> {
        // Verify voter has VOTER role
        // Record approval
        // Check if threshold met
        // Emit ApprovalRecorded event
    }

    /// Execute an approved transaction
    pub fn execute(
        env: Env,
        executor: Address,
        proposal_id: u64,
    ) -> Result<(), VaultError> {
        // Verify executor has EXECUTOR role
        // Verify approval threshold met
        // Validate against all policies
        // Execute operation
        // Record in audit trail
        // Emit TransactionExecuted event
    }

    /// Direct spend (within policy limits)
    pub fn spend(
        env: Env,
        spender: Address,
        token: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), VaultError> {
        // Verify spender has SPENDER role
        // Validate against spend policies
        // Execute transfer
        // Update spend tracking
        // Emit SpendExecuted event
    }
}

## Policy Contracts
Spend Limit Policy

#[contract]
pub struct SpendLimitPolicy;

#[contractimpl]
impl SpendLimitPolicy {
    pub fn initialize(
        env: Env,
        vault: Address,
        token: Address,
        daily_limit: i128,
        per_tx_limit: i128,
    ) -> Result<(), PolicyError>;

    pub fn validate(
        env: Env,
        context: TransactionContext,
    ) -> Result<(), PolicyError> {
        // Check per-transaction limit
        // Check daily aggregate limit
        // Return Ok or PolicyError::LimitExceeded
    }

    pub fn get_remaining_daily(
        env: Env,
        token: Address,
    ) -> i128;
}

## Time Lock Policy
#[contract]
pub struct TimeLockPolicy;

#[contractimpl]
impl TimeLockPolicy {
    pub fn initialize(
        env: Env,
        vault: Address,
        delay_seconds: u64,          // Required delay
        threshold_amount: i128,       // Amount triggering delay
        emergency_threshold: u32,     // Signers to bypass
    ) -> Result<(), PolicyError>;

    pub fn validate(
        env: Env,
        context: TransactionContext,
    ) -> Result<(), PolicyError> {
        // If amount > threshold, check time delay
        // Allow bypass with emergency_threshold signers
    }
}

5. Role-Based Access Control

## Role Definitions
Role	    Description	            Permissions
Admin	    Vault administrator	    Modify policies, manage members, change thresholds
Proposer	Transaction initiator	Create transaction proposals
Voter	    Approval authority	    Approve or reject proposals
Executor	Transaction executor	Execute approved transactions
Spender	    Direct spender	        Transfer funds within policy limits

## Role Assignment
pub struct RoleConfig {
    pub role: Role,
    pub signer: Address,
    pub constraints: Option<RoleConstraints>,
}

pub struct RoleConstraints {
    pub max_amount: Option<i128>,      // Max amount for this role
    pub allowed_tokens: Option<Vec<Address>>, // Restricted tokens
    pub allowed_destinations: Option<Vec<Address>>, // Restricted destinations
    pub time_window: Option<TimeWindow>, // Active hours
}

## Transaction Flow
┌─────────┐      ┌─────────┐     ┌─────────┐      ┌─────────┐
│Proposer │────▶│ Voters  │────▶│Executor │────▶│ Stellar │
│         │      │(M-of-N) │     │         │      │ Network │
└─────────┘      └─────────┘     └─────────┘      └─────────┘
     │               │               │               │
     │  propose()    │   approve()   │   execute()   │
     │───────────────▶              │                │
     │               │───────────────▶               │
     │               │               │───────────────▶
     │               │               │               │
     ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                    POLICY VALIDATION                    │
│  • Spend limits  • Time locks  • Allowlists  • Roles    │
└─────────────────────────────────────────────────────────┘

6. USDC Integration

## Native USDC Support
Stellar Vault provides first-class support for Circle's USDC on Stellar:

impl StellarVault {
    /// USDC-optimized transfer
    pub fn transfer_usdc(
        env: Env,
        spender: Address,
        to: Address,
        amount: i128,
        memo: Option<String>,
    ) -> Result<(), VaultError> {
        let usdc_contract = get_usdc_contract(&env);
        // Validate against USDC-specific policies
        // Execute transfer
        // Record for compliance reporting
    }

    /// Batch USDC payments (payroll, disbursements)
    pub fn batch_transfer_usdc(
        env: Env,
        executor: Address,
        payments: Vec<Payment>,
    ) -> Result<Vec<PaymentResult>, VaultError>;
}

## USDC Contract Address
- Mainnet: CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75
- Testnet: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA

7. Stellar-Specific Optimizations

## Leveraging Stellar's Strengths
Stellar                         Feature	How We Use It
Sub-second finality	            Real-time treasury operations, instant policy enforcement
$0.00001 fees	                Cost-effective for high-volume enterprise operations
Native multisig	                Foundation for our smart account signers
Protocol 23 optimizations	    Efficient cross-contract calls for policy validation
Stellar DEX	                    Built-in swap and liquidity operations
Anchor network	                Fiat on/off ramp integrations

## Soroban-Specific Design
// Optimized storage using Soroban's storage types
#[contracttype]
pub enum StorageKey {
    VaultConfig,                    // Instance storage (persistent)
    Signer(Address),               // Persistent storage
    Policy(Address),               // Persistent storage
    Proposal(u64),                 // Temporary storage (auto-expire)
    DailySpend(Address, u64),      // Temporary storage (24h TTL)
}

// Efficient event emission for indexing
#[contracttype]
pub struct TransactionEvent {
    pub vault: Address,
    pub tx_type: Symbol,
    pub amount: i128,
    pub token: Address,
    pub timestamp: u64,
}

8. Security Considerations

## Security Model
Smart Contract Security
- Built on audited OpenZeppelin framework
- Professional security audit before mainnet (provided by SCF)
- Formal verification of critical policy logic

Access Control Security
- Role separation prevents single points of failure
- Time locks for high-value transactions
- Emergency recovery with elevated thresholds

Operational Security
- All transactions logged on-chain
- Immutable audit trail
- Real-time monitoring capabilities

## Threat Mitigations
Threat	                Mitigation
Compromised signer	    M-of-N threshold, role separation
Malicious proposal	    Voter approval required, policy validation
Unauthorized spend	    Spend limits, allowlists, role verification
Smart contract bug	    OpenZeppelin base, professional audit, upgradability
Key loss	            Recovery mechanism with time delay

9. Dashboard Architecture

## Tech Stack
- Frontend: React + TypeScript
- Wallet Integration: Freighter SDK
- Blockchain Interaction: stellar-sdk, soroban-client
- State Management: React Query
- UI Framework: Tailwind CSS + shadcn/ui

## Dashboard Features
┌─────────────────────────────────────────────────────────────┐
│                    STELLAR VAULT DASHBOARD                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  VAULT OVERVIEW                                     │    │
│  │  • Balance: 1,250,000 USDC                          │    │
│  │  • Pending: 3 transactions                          │    │
│  │  • Members: 5 signers                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │  PENDING APPROVALS   │  │  RECENT ACTIVITY     │         │
│  │  ┌────────────────┐  │  │  • TX #45 executed   │         │
│  │  │ TX #47         │  │  │  • TX #44 executed   │         │
│  │  │ 50,000 USDC    │  │  │  • Policy updated    │         │
│  │  │ 1/3 approved   │  │  │  • Member added      │         │
│  │  │ [Approve]      │  │  │                      │         │
│  │  └────────────────┘  │  └──────────────────────┘         │
│  └──────────────────────┘                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  POLICIES                                           │    │
│  │  • Daily limit: $100,000 (used: $35,000)            │    │
│  │  • Per-tx limit: $25,000                            │    │
│  │  • Time lock: 24h for >$50,000                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

10. Future Extensions

## Phase 2: DeFi Strategy Vaults
- Automated yield strategies
- Lending protocol integration
- Liquidity provision management

## Phase 3: Cross-Border Automation
- Scheduled payments
- FX conversion rules
- Anchor integration for fiat settlement

## Phase 4: Multi-Chain
- Cross-chain vault management
- Bridge integrations
- Unified treasury across chains

11. References

- OpenZeppelin Stellar Contracts
- Soroban Documentation
- Stellar Protocol 23
- Circle USDC on Stellar

Document Version: 1.0 Last Updated: March 2026 