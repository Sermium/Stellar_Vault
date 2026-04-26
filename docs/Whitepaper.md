### Orion Safe
## A Multi-Signature Vault Protocol for Stellar
## Version 1.1
## April 2026

## Abstract
Orion Safe is a decentralized multi-signature vault protocol built on Stellar's Soroban smart contract platform. It provides organizations, DAOs, and teams with secure, transparent, and programmable asset management through customizable approval thresholds, time-locked assets, and vesting schedules. All operations—including transfers, locks, and vestings—require multi-signature approval, ensuring no single point of failure in asset custody.

Built with enterprise adoption in mind, Orion Safe leverages Stellar's sub-second finality and near-zero transaction fees to deliver treasury management that scales from small teams to large institutions.

## 1. Introduction

# 1.1 The Problem
Digital asset management faces several critical challenges:

- Single Point of Failure: Traditional wallets rely on a single private key, creating catastrophic risk if compromised or lost.
- Lack of Governance: Teams and organizations need structured approval processes for treasury management.
- Rigid Vesting: Existing solutions offer limited flexibility for token vesting and time-locked distributions.
- Transparency vs. Control: Public blockchains expose transaction data, but controlling assets still requires private key access.
- Limited Stellar Options: While Ethereum has Gnosis Safe and similar solutions, Stellar lacks native enterprise-grade treasury infrastructure.

# 1.2 The Solution
Orion Safe addresses these challenges by providing:

- Multi-signature security with customizable thresholds (M-of-N)
- Role-based access control (SuperAdmin, Admin, Executor)
- Threshold-enforced operations for all asset movements
- Programmable time locks and vesting schedules
- Beneficiary claim portal for lock recipients
- Public vault sharing without exposing control
- Native USDC support for enterprise operations

# 1.3 Why Stellar/Soroban?

Feature	            Stellar Advantage
Transaction Fees	~$0.00001 vs $5-50 on Ethereum
Finality	        5 seconds vs 12+ seconds
USDC Support	    Native Circle USDC integration
Enterprise Ready	Regulated anchors, compliance-friendly
Smart Contracts	Soroban WASM for complex logic

## 2. Architecture

# 2.1 System Overview
┌─────────────────────────────────────────────────────────────────┐
│                        ORION SAFE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │           VAULT ACCOUNT (Contract Address)              │   │
│   │   • Holds XLM, USDC, any Stellar/Soroban asset          │   │
│   │   • Receives payments directly                          │   │
│   │   • Controlled ONLY by the smart contract               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │           SMART CONTRACT (Soroban)                      │   │
│   │   • Multisig logic (M-of-N)                             │   │
│   │   • Proposal system                                     │   │
│   │   • Role-based access                                   │   │
│   │   • Time locks & vesting                                │   │
│   │   • Signs transactions on behalf of vault               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              SIGNERS (Stellar Addresses)                │   │
│   │   • Propose transactions                                │   │
│   │   • Approve/reject proposals                            │   │
│   │   • Execute approved proposals                          │   │
│   │   • Cannot move funds directly                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

# 2.2 Smart Contract Design

Orion Safe consists of two primary Soroban smart contracts:

- Factory Contract
Deploys new vault instances
Tracks all vaults and their creators
Manages creation fees (configurable)
Maintains vault WASM hash for upgrades
Provides vault discovery functions

- Vault Contract
Manages signers and roles
Handles proposal lifecycle (create → approve → execute)
Enforces threshold requirements
Manages time locks and vesting schedules
Tracks locked vs. available balances
Emits events for indexing

# 2.3 Proposal System
All value-affecting operations go through the proposal system:

┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   PROPOSE   │ ───▶ │   APPROVE   │ ───▶ │   EXECUTE   │ ───▶ │  COMPLETED  │
│  (1 vote)   │      │ (threshold) │      │  (action)   │      │   (done)    │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
       │
       ▼
┌─────────────┐
│   REJECT    │
│ (threshold) │
└─────────────┘

- Proposal Types

Type	            Description	On Execution
Transfer (0)	    Send assets to external address	Tokens transferred
TimeLock (1)	    Lock assets until specific date	Lock record created
VestingLock (2)	    Create vesting schedule	Vesting record created

# 2.4 Role System

Role	        Propose	Approve	Execute	Manage Signers	Settings
SuperAdmin	    ✅	  ✅   	 ✅	   ✅	          ✅
Admin	        ✅	  ✅	     ✅	   ❌	          ❌
Executor	    ❌	  ❌	     ✅	   ❌	          ❌

Planned Expansion (Tranche 2):

Role	    Propose	     Vote	    Execute	    Spend (within limits)
Admin	    ✅	        ✅	     ✅	        ✅
Proposer	✅	        ❌	     ❌	        ❌
Voter	    ❌	        ✅	     ❌	        ❌
Executor	❌	        ❌	     ✅	        ❌
Spender	    ❌	        ❌	     ❌	        ✅

## 3. Core Features

# 3.1 Multi-Signature Security

Configurable threshold (M-of-N, e.g., 2-of-3, 3-of-5)
Automatic status progression when threshold met
Rejection requires same threshold as approval
Cannot reduce signers below threshold
Approval tracking with signer addresses

# 3.2 Time Locks

Time locks freeze assets until a specified unlock date:

Parameters:
├── beneficiary: Address receiving funds at unlock
├── token: Asset to lock
├── amount: Quantity to lock
├── unlock_time: Unix timestamp when claimable
├── revocable: Boolean - can admin cancel?
└── description: Human-readable label

Use Cases:

- Scheduled payments
- Escrow arrangements
- Self-custody lockups
- Milestone-based releases

# 3.3 Vesting Schedules
Linear vesting with configurable parameters:

Parameters:
├── beneficiary: Receiving address
├── token: Asset to vest
├── amount: Total vesting amount
├── start_time: Vesting start
├── cliff_time: Initial lockup period end
├── end_time: Full vesting completion
├── release_intervals: Claim frequency (seconds)
├── revocable: Can admin revoke unvested?
└── description: Human-readable label

- Vesting Formula:
vested_amount = total_amount × (time_elapsed / total_duration)
claimable = vested_amount - already_claimed

- Cliff Behavior:
Before cliff: 0 claimable
After cliff: Linear vesting begins
After end_time: 100% claimable

# 3.4 Beneficiary Claims Portal
Beneficiaries receive a dedicated interface to:

- View all locks assigned to them across vaults
- See claimable amounts in real-time
- Claim unlocked/vested tokens
- Track claim history

URL Routing:
?vault=XXX - Direct to specific vault
?vault=XXX&view=claim - Direct to claim page for vault
?view=claim - View all beneficiary locks

# 3.5 Balance Tracking
The protocol tracks three balance states:

Balance Type	    Definition
Total Balance	    All assets in vault
Locked Amount	    Active locks + pending proposal amounts
Available Balance	Total - Locked (for new proposals)
This prevents over-commitment and ensures proposals can always execute.

## 4. Security Model
# 4.1 Threat Mitigation
Threat	Mitigation
Single key compromise	Multi-sig threshold requirement
Insider attack	Threshold prevents unilateral action
Key loss	Other signers maintain access
Unauthorized spending	All transfers require threshold
Front-running	Proposal IDs prevent replay
Invalid lock execution	Parameter validation before execute

# 4.2 Access Control
All state-changing operations require require_auth()
Role verification before sensitive operations
Cannot remove last SuperAdmin
Cannot reduce signers below threshold
Proposal validation prevents malformed locks

# 4.3 Database Security
Supabase with Row Level Security (RLS) enabled
Database serves as cache only
On-chain state is source of truth
All sensitive operations verified on-chain

# 4.4 Economic Security
Transaction fees prevent spam
Creation fees discourage vault abandonment
Fee recipient configurable by factory admin

## 5. Technical Specifications

# 5.1 Contract Constants

const DEFAULT_TX_FEE: i128 = 1_000_000;         // 0.1 XLM
const DEFAULT_CREATE_FEE: i128 = 10_000_000;    // 1 XLM
const MAX_BATCH_SIZE: u32 = 50;                 // Batch lock limit
const MAX_SIGNERS: u32 = 20;                    // Maximum signers per vault

# 5.2 Data Structures

- Vault Configuration:

struct VaultConfig {
    name: Symbol,
    threshold: u32,
    signer_count: u32,
    proposal_count: u64,
    lock_count: u64,
    fee_amount: i128,
}

- Proposal:

struct Proposal {
    proposal_type: ProposalType,  // 0=Transfer, 1=TimeLock, 2=Vesting
    proposer: Address,
    token: Address,
    recipient: Address,
    amount: i128,
    approval_count: u32,
    rejection_count: u32,
    is_executed: bool,
    is_rejected: bool,
    // Lock-specific fields
    start_time: u64,
    end_time: u64,
    cliff_time: u64,
    release_intervals: u64,
    revocable: bool,
}

-  Asset Lock:

struct AssetLock {
    beneficiary: Address,
    token: Address,
    total_amount: i128,
    released_amount: i128,
    lock_type: u32,        // 0=TimeLock, 1=Vesting
    start_time: u64,
    end_time: u64,
    cliff_time: u64,
    release_intervals: u64,
    revocable: bool,
    is_active: bool,
}

# 5.3 Status Enums

enum ProposalType {
    Transfer = 0,
    TimeLock = 1,
    VestingLock = 2,
}

enum LockType {
    TimeLock = 0,
    Vesting = 1,
}
# 5.4 Key Functions

Factory Contract:

- create_vault(creator, name, signers, threshold) → Address
- get_config() → FactoryConfig
- get_vaults_by_owner(owner) → Vec<Address>

Vault Contract:

- create_proposal(...) → u64
- approve(caller, proposal_id)
- reject(caller, proposal_id)
- execute(caller, proposal_id, ...) → u64
- claim_lock(caller, lock_id) → i128
- cancel_lock(caller, lock_id)
- add_signer(caller, signer, role)
- remove_signer(caller, signer)
- set_threshold(caller, threshold)

## 6. Use Cases

# 6.1 DAO Treasury
- A DAO with 5 council members uses a 3-of-5 vault for their treasury. Any 3 members can approve spending, preventing both unilateral action and gridlock.

# 6.2 Team Token Vesting
- A startup creates vesting schedules for 10 employees:
- 4-year vesting with 1-year cliff
- Monthly claim intervals
- HR admin can revoke if employee leaves

# 6.3 Escrow Service
- Two parties create a 2-of-2 vault for an escrow arrangement. Neither party can move funds without the other's consent.

# 6.4 Investment Fund
- An investment club uses a 4-of-7 vault. Threshold prevents any small group from controlling funds while allowing operational flexibility.

# 6.5 Payroll Automation
- Company treasury creates monthly time-locked payments:
- Salary locked until end of month
- Employees claim when unlocked
- Full audit trail on-chain

## 7. Dashboard Features

# 7.1 Current Implementation
Feature	Status
Vault Creation	        ✅ Live
Multi-wallet Support	✅ Freighter, Albedo, xBull, LOBSTR
Dashboard Overview	    ✅ Stats, balances, recent activity
Asset Management	    ✅ View, deposit, send
Proposal System     	✅ Create, approve, execute, reject
Member Management	    ✅ Add/remove signers, roles
Time Locks	            ✅ Create, view, claim
Vesting Schedules	    ✅ Create, view, claim
Beneficiary Portal	    ✅ Dedicated claim page
Public Vault View	    ✅ Read-only sharing
Contact Management	    ✅ Wallet-specific address book
Settings	            ✅ Threshold, roles, leave vault

# 7.2 Planned Features (SCF Tranches)
Feature	                        Tranche
OpenZeppelin Policy Engine	    1
Spending Limits	                1
Destination Allowlists	        1
5-Role System	                2
Batch Operations UI	            2
Native USDC Optimization	    2
Stellar DEX Integration	        3
Compliance Reporting	        3
TypeScript SDK	                3

## 8. Roadmap

# Completed: Pre-SCF Development ✅
✅ Multi-sig vault creation
✅ Proposal system with threshold enforcement
✅ Role-based access control (SuperAdmin/Admin/Executor)
✅ Time locks and vesting schedules
✅ Beneficiary claim portal
✅ Public vault view
✅ Full-featured dashboard
✅ Testnet deployment
✅ SCF #43 submission

# Tranche 1: Policy Engine (May 2026)
- OpenZeppelin Smart Account integration
- SpendLimitPolicy contract
- AllowlistPolicy contract
- Policy configuration storage
- Enhanced testnet deployment
# Tranche 2: Enterprise Features (July 2026)
- 5-role permission system
- Enterprise dashboard UI
- Native USDC optimization
- Batch operations
- 3+ beta partners
# Tranche 3: Mainnet Launch (October 2026)
- Security audit (SCF Audit Bank)
- Mainnet deployment
- Stellar DEX integration
- Compliance/audit features
- TypeScript SDK
- Full documentation
- 20+ vaults target
# Future Phases
- DeFi Strategy Vaults: Automated yield strategies
- Cross-Border Automation: Scheduled payments, FX rules
- Multi-Chain Expansion: Cross-chain vault management

## 9. Tokenomics
Note: Orion Safe does not have a native token. Fees are collected in XLM.

# Fee Structure
Action	                Fee
Vault Creation	        1 XLM
Transaction Execution	~0.01 XLM (network fee)
Lock/Vest Creation	    ~0.01 XLM (network fee)
Claim	                ~0.01 XLM (network fee)
Fees are distributed to the protocol treasury for ongoing development and maintenance. Factory admin can adjust creation fees.

## 10. Team
# Christopher Fourquier - Founder & Lead Developer
20 years in enterprise management
8 years blockchain development
Expertise: Rust, Solidity, Move, React/TypeScript
# Alexis Fourquier - Full Stack Developer
4 years blockchain development
Expertise: React/TypeScript, Java, Python, Solidity

# Frances Regina - GTM & Business Development
8 years in blockchain go-to-market
20 years international sales experience

## 11. Conclusion
Orion Safe brings enterprise-grade multi-signature security to the Stellar ecosystem. By combining programmable vesting, time locks, and threshold-based governance, it provides organizations with the tools needed for secure, transparent, and efficient asset management.

The protocol's design ensures that no single party can compromise funds while maintaining operational flexibility through role-based permissions and configurable thresholds. With Stellar's low fees and fast finality, Orion Safe enables high-frequency treasury operations that would be cost-prohibitive on other chains.

Current Status: Testnet live, SCF #43 submitted, awaiting award decision.

# References
- Stellar Development Foundation. "Soroban Smart Contracts." https://soroban.stellar.org
- OpenZeppelin. "Smart Account Framework for Stellar." December 2025.
- Gnosis Safe. "Multi-Signature Wallet Design Patterns."
- Circle. "USDC on Stellar." https://www.circle.com/en/usdc/stellar

# Appendix A: Contract Addresses (Testnet)
Contract	        Address
Factory	            CCNGOW6UCZKELBAR377HDHWAJJLKD6SJHUFCDT4UM6M2AYPSOEBYLDVA
Test Vault	        CBJ4BFOUDMQWFPCBALQTO2565STNGFMGQWDYVQ7MBWRZF5WSI2Z4VT5W
Vault WASM Hash	    f434965dafa094f90a27a09065562da9fe5aeb00f8208da1665bb4ebebe475ec

Explorer: https://stellar.expert/explorer/testnet/contract/CBJ4BFOUDMQWFPCBALQTO2565STNGFMGQWDYVQ7MBWRZF5WSI2Z4VT5W

# Appendix B: Dashboard URLs
Environment	            URL
Production (Testnet)	https://stellar-vault-eta.vercel.app
GitHub Repository	    https://github.com/Sermium/Stellar_Vault

# Appendix C: SCF #43 Submission
Field	            Value
Track	            Open Track
Requested Amount	$150,000
Timeline	        6 months (May - October 2026)
Final Deliverable	Mainnet launch with 20+ vaults

© 2026 Orion Safe. All rights reserved.

Version 1.1 - Updated April 26, 2026