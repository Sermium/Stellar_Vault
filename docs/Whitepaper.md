# Orion Safe
## A Multi-Signature Vault Protocol for Stellar

**Version 1.0**  
**April 2026**

---

## Abstract

Orion Safe is a decentralized multi-signature vault protocol built on Stellar's Soroban smart contract platform. It provides organizations, DAOs, and teams with secure, transparent, and programmable asset management through customizable approval thresholds, time-locked assets, and vesting schedules. All operations—including transfers, locks, and vestings—require multi-signature approval, ensuring no single point of failure in asset custody.

---

## 1. Introduction

### 1.1 The Problem

Digital asset management faces several critical challenges:

1. **Single Point of Failure**: Traditional wallets rely on a single private key, creating catastrophic risk if compromised or lost.

2. **Lack of Governance**: Teams and organizations need structured approval processes for treasury management.

3. **Rigid Vesting**: Existing solutions offer limited flexibility for token vesting and time-locked distributions.

4. **Transparency vs. Control**: Public blockchains expose transaction data, but controlling assets still requires private key access.

### 1.2 The Solution

Orion Safe addresses these challenges by providing:

- **Multi-signature security** with customizable thresholds
- **Role-based access control** (Admin, Executor, Viewer)
- **Threshold-enforced operations** for all asset movements
- **Programmable time locks** and **vesting schedules**
- **Public sharing** without exposing control

---

## 2. Architecture

### 2.1 Smart Contract Design

Orion Safe consists of two primary Soroban smart contracts:

#### Factory Contract
- Deploys new vault instances
- Tracks all vaults and their owners
- Manages creation fees
- Maintains vault WASM hash for upgrades

#### Vault Contract
- Manages signers and roles
- Handles proposal lifecycle
- Enforces threshold requirements
- Manages time locks and vesting schedules
- Tracks locked vs. available balances

### 2.2 Proposal System

All value-affecting operations go through the proposal system:


┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ 
│ PROPOSE     │ ──▶  │ APPROVE     │ ──▶ │ EXECUTE     │ ──▶ │ COMPLETED   │ 
│ (1 vote)    │      │ (threshold) │      │ (action)    │      │ (done)      │ 
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘ 
        │ 
        ▼ 
┌────────────────────────┐ 
│ REJECT │ │ (threshold) │ 
└────────────────────────┘


#### Proposal Types
1. **Transfer**: Send assets to external address
2. **Time Lock**: Lock assets until specific date
3. **Vesting Lock**: Create vesting schedule

### 2.3 Role System

| Role     | Propose | Approve | Execute | Manage Signers | Settings |
|----------|---------|---------|---------|----------------|----------|
| Admin    | ✅      | ✅     | ✅      | ✅            | ✅       |
| Executor | ✅      | ✅     | ✅      | ❌            | ❌       |
| Viewer   | ❌      | ❌     | ❌      | ❌            | ❌       |

---

## 3. Core Features

### 3.1 Multi-Signature Security

- Configurable threshold (M-of-N)
- Automatic status progression when threshold met
- Rejection requires same threshold as approval
- Cannot reduce signers below threshold

### 3.2 Time Locks

Time locks freeze assets until a specified unlock date:

Parameters:

beneficiary: Address receiving funds at unlock
token: Asset to lock
amount: Quantity to lock
unlock_time: Unix timestamp when claimable
revocable: Boolean - can admin cancel?
description: Human-readable label

**Use Cases:**
- Scheduled payments
- Escrow arrangements
- Self-custody lockups
- Milestone-based releases

### 3.3 Vesting Schedules

Linear vesting with configurable parameters:

Parameters:

beneficiary: Receiving address
token: Asset to vest
amount: Total vesting amount
start_time: Vesting start
cliff_duration: Initial lockup period
total_duration: Full vesting period
release_intervals: Claim frequency (0 = continuous)
revocable: Can admin revoke unvested?

**Vesting Formula:**
vested_amount = total_amount × (time_elapsed / total_duration) claimable = vested_amount - already_claimed


### 3.4 Balance Tracking

The protocol tracks three balance states:

1. **Total Balance**: All assets in vault
2. **Locked Amount**: Sum of active locks + pending proposals
3. **Available Balance**: Total - Locked (available for new proposals)

This prevents over-commitment and ensures proposals can always execute.

---

## 4. Security Model

### 4.1 Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Single key compromise | Multi-sig threshold requirement |
| Insider attack | Threshold prevents unilateral action |
| Key loss | Other signers maintain access |
| Unauthorized spending | All transfers require threshold |
| Front-running | Proposal IDs prevent replay |

### 4.2 Access Control

- All state-changing operations require `require_auth()`
- Role verification before sensitive operations
- Cannot remove last admin
- Cannot reduce below threshold

### 4.3 Economic Security

- Transaction fees prevent spam
- Creation fees discourage vault abandonment
- Fee recipient configurable by factory admin

---

## 5. Technical Specifications

### 5.1 Contract Constants

```rust
const DEFAULT_TX_FEE: i128 = 1_000_000;  // 0.1 XLM
const MAX_BATCH_SIZE: u32 = 50;          // Batch lock limit
5.2 Data Structures
Proposal:

struct Proposal {
    id: u64,
    proposal_type: ProposalType,  // Transfer, TimeLock, VestingLock
    proposer: Address,
    token: Address,
    recipient: Address,
    amount: i128,
    status: ProposalStatus,
    approvals: Vec<Address>,
    cancel_approvals: Vec<Address>,
    created_at: u64,
    // Lock-specific fields
    lock_start_time: u64,
    lock_end_time: u64,
    lock_cliff_time: u64,
    lock_release_intervals: u64,
    lock_revocable: bool,
    lock_description: Symbol,
}
Asset Lock:

struct AssetLock {
    id: u64,
    creator: Address,
    beneficiary: Address,
    token: Address,
    total_amount: i128,
    released_amount: i128,
    lock_type: LockType,
    status: LockStatus,
    created_at: u64,
    start_time: u64,
    end_time: u64,
    cliff_time: u64,
    release_intervals: u64,
    revocable: bool,
    description: Symbol,
}
5.3 Status Enums
enum ProposalStatus {
    Pending = 0,
    Approved = 1,
    Executed = 2,
    Rejected = 3,
}

enum LockStatus {
    Active = 0,
    PartiallyReleased = 1,
    FullyReleased = 2,
    Cancelled = 3,
}
6. Use Cases
6.1 DAO Treasury
A DAO with 5 council members uses a 3-of-5 vault for their treasury. Any 3 members can approve spending, preventing both unilateral action and gridlock.

6.2 Team Token Vesting
A startup creates vesting schedules for 10 employees through batch vesting proposals. Each employee can independently claim their vested tokens.

6.3 Escrow Service
Two parties create a 2-of-2 vault for an escrow arrangement. Neither party can move funds without the other's consent.

6.4 Investment Fund
An investment club uses a 4-of-7 vault. Threshold prevents any small group from controlling funds while allowing operational flexibility.

7. Roadmap
Phase 1: Core Protocol ✅
 Multi-sig vault creation
 Proposal system with threshold
 Role-based access control
 Time locks and vesting
 Public view and claim pages
Phase 2: Enhanced Features (Q2 2026)
 Calendar view for locks/vestings
 Batch operations UI
 CSV import for batch vestings
 Mobile-responsive improvements
 Notification system
Phase 3: Advanced Governance (Q3 2026)
 Spending limits with auto-reset
 Time-delayed execution
 Proposal templates
 Integration APIs
 Audit completion
Phase 4: Ecosystem (Q4 2026)
 Mainnet deployment
 Multi-chain support
 SDK and developer tools
 Partner integrations
8. Tokenomics
Note: Orion Safe does not have a native token. Fees are collected in XLM.

Fee Structure

Action	                Fee
Vault Creation	        10 XLM
Transaction	            0.1 XLM
Lock/Vest Creation	    0.1 XLM
Claim	                0.1 XLM

Fees are distributed to the protocol treasury for ongoing development and maintenance.

9. Team
Orion Safe is developed by a team of blockchain engineers and security experts with experience in Stellar, Ethereum, and traditional finance.

10. Conclusion
Orion Safe brings enterprise-grade multi-signature security to the Stellar ecosystem. By combining programmable vesting, time locks, and threshold-based governance, it provides organizations with the tools needed for secure, transparent, and efficient asset management.

The protocol's design ensures that no single party can compromise funds while maintaining operational flexibility through role-based permissions and configurable thresholds.

References
Stellar Development Foundation. "Soroban Smart Contracts." https://soroban.stellar.org
Buterin, V. "A Formal Specification of Multi-Signature Wallets."
Gnosis Safe. "Multi-Signature Wallet Design Patterns."
Appendix A: Contract Addresses (Testnet)
Factory Contract: CCNGOW6UCZKELBAR377HDHWAJJLKD6SJHUFCDT4UM6M2AYPSOEBYLDVA
Vault WASM Hash: f434965dafa094f90a27a09065562da9fe5aeb00f8208da1665bb4ebebe475ec


© 2026 Orion Safe. All rights reserved.