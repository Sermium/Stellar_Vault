## Orion Safe - MoSCoW Prioritization

# Version: 1.1
# Date: April 25, 2026
# Sprint/Phase: v1.0 Release → SCF #43 Submission

## Overview
This document outlines the feature prioritization for Orion Safe using the MoSCoW method:

- Must Have: Critical for release
- Should Have: Important but not critical
- Could Have: Desirable if time permits
- Won't Have: Out of scope for this release

## Must Have (M) ✅
Essential features without which the product would not function

ID	     Feature	                                        Status	     Notes
M-001	Multi-signature vault creation	               ✅ Done	     Factory deploys vaults
M-002	Configurable threshold (M-of-N)	               ✅ Done	     1 to N signers
M-003	Transfer proposal system	                         ✅ Done	     Propose → Approve → Execute
M-004	Proposal approval workflow	                    ✅ Done	     Threshold enforcement
M-005	Proposal execution	                              ✅ Done	     Transfers funds when approved
M-006	Proposal rejection	                              ✅ Done	     Cancel with threshold
M-007	Role-based access (SuperAdmin/Admin/Executor)	✅ Done	     Role hierarchy working
M-008	Wallet connection (Freighter)	                    ✅ Done	     Multiple wallets supported
M-009	View vault balances	                              ✅ Done	     Total, locked, available
M-010	Time lock functionality	                         ✅ Done	     Through proposal system
M-011	Vesting functionality	                         ✅ Done	     Through proposal system
M-012	Lock claiming (beneficiary)	                    ✅ Done	     Claim available funds + DB sync
M-013	Available balance calculation	                    ✅ Done	     Total - locked - pending
M-014	Basic error handling	                         ✅ Done	     User-friendly messages
M-015	Testnet deployment	                              ✅ Done	     Factory + vault contracts
M-016	Database integration (Supabase)	               ✅ Done	     Caching + state sync
M-017	Beneficiary claim page	                         ✅ Done	     Dedicated UI for beneficiaries
M-018	URL-based vault routing	                         ✅ Done	     ?vault=XXX&view=claim support
Must Have Status: 18/18 Complete (100%)

## Should Have (S) 🔄
Important features that add significant value

ID	     Feature	                         Status     Notes
S-001	Public vault view	               ✅ Done    Read-only sharing
S-002	Public claim page	               ✅ Done	Beneficiary claims
S-003	Contact management	               ✅ Done	Wallet-specific contacts
S-004	Transaction history	               ✅ Done	On-chain payments
S-005	Multiple wallet support	          ✅ Done	Freighter, xBull, Lobstr, Albedo
S-006	Custom token support	          ✅ Done	Add any Soroban token
S-007	Vault selector (multiple vaults)	✅ Done	Switch between vaults
S-008	Signer management UI	          ✅ Done	Add/remove signers
S-009	Threshold adjustment UI	          ✅ Done	Change threshold
S-010	Leave vault function	          ✅ Done	Self-removal
S-011	Proposal type display	          ✅ Done	Transfer/TimeLock/Vesting icons
S-012	Lock/vesting details in proposals	✅ Done	Full params shown
S-013	Deposit functionality	          ✅ Done	Fund vault
S-014	Trustline management	          ✅ Done	For classic assets
S-015	Dashboard overview	               ✅ Done	Stats and recent proposals
S-016	Sidebar "Claim Tokens" menu	     ✅ Done	For signers who are beneficiaries
S-017	Proposal validation (execute)	     ✅ Done	Block invalid TimeLock/Vesting
S-018	DB sync after claim	               ✅ Done	Update released_amount, deactivate
Should Have Status: 18/18 Complete (100%)

## Could Have (C) 📋
Desirable features that would enhance the product

ID	     Feature	                         Status	           Notes
C-001	Calendar view for locks/vestings	❌ Not Started	     Timeline visualization
C-002	Batch lock creation UI	          ❌ Not Started	     Contract supports it
C-003	CSV import for batch vestings	     ❌ Not Started	     Bulk employee vesting
C-004	Email notifications	               ❌ Not Started	     Pending approval alerts
C-005	Mobile responsive design	          🔄 Partial	      Basic support
C-006	Dark/light theme toggle	          ❌ Not Started	     Currently dark only
C-007	Transaction export (CSV)	          ❌ Not Started	     Accounting integration
C-008	Spending limits policy	          ❌ Not Started	     OpenZeppelin integration
C-009	Factory admin panel	               ✅ Done	          Manage fees, WASM
C-010	Proposal templates	               ❌ Not Started	     Quick recurring payments
C-011	Address book import/export	     ❌ Not Started	     Backup contacts
C-012	QR code for vault address	     ❌ Not Started	     Easy deposits
C-013	Multi-language support	          ❌ Not Started	     i18n
C-014	Keyboard shortcuts	               ❌ Not Started	     Power user features
C-015	Audit log UI	                    ❌ Not Started	     All vault actions
C-016	Native USDC first-class support	🔄 Partial	      Works, needs optimization
C-017	Vercel deployment	               ✅ Done	          Production hosting
C-018	RLS policies (Supabase)	          ✅ Done	          Security hardening
Could Have Status: 4/18 Complete (22%)

## Won't Have (W) 🚫
Explicitly excluded from this release

ID	     Feature	                         Reason	               Future Phase
W-001	Mainnet deployment	               Requires audit	          Tranche 3
W-002	Native mobile apps	               Web-first approach	     Phase 5
W-003	Cross-chain support 	          Stellar focus first	     Phase 4
W-004	Fiat on/off ramp	               Regulatory complexity	TBD
W-005	Native token	                    No tokenomics planned	N/A
W-006	DEX integration	               Planned for Tranche 3	Tranche 3
W-007	Staking/yield	                    Not core feature	     TBD
W-008	DAO voting	                    Different product	     N/A
W-009	NFT support	                    Focus on fungible tokens	Phase 5
W-010	Hardware wallet direct	          Via Freighter supported	Phase 3
W-011	5-role system	                    Planned for Tranche 2	Tranche 2
W-012	OpenZeppelin full integration	     Planned for Tranche 1-2	Tranche 1-2

## Priority Matrix

                IMPORTANCE
                High        Low
          ┌─────────────┬─────────────┐
     High │   MUST      │   SHOULD    │
URGENCY   │   HAVE      │   HAVE      │
          ├─────────────┼─────────────┤
     Low  │   SHOULD    │   COULD     │
          │   HAVE      │   HAVE      │
          └─────────────┴─────────────┘

## Release Criteria

- v1.0 Testnet Release

Category	      Required	     Achieved
Must Have	      100%	     ✅ 100%
Should Have	 80%	          ✅ 100%
Could Have	 0%	          22%
Critical Bugs	 0	          ✅ 0
Major Bugs	 0	          ✅ 0

Release Status: ✅ TESTNET LIVE - SCF #43 SUBMITTED

## SCF #43 Milestone Roadmap

### Tranche 0 (Upon Approval) - 10% / $15,000
✅ Testnet already deployed
✅ Core functionality complete
Begin OpenZeppelin integration

### Tranche 1 (May 2026) - 20% / $30,000
Deliverable	               Description	                                                  Budget
Technical Architecture	     Complete system design with OpenZeppelin	                    $5,000
OpenZeppelin Integration	     Smart Account Framework (Context Rules, Signers, Policies)	     $12,000
Testnet Smart Contracts	     Deploy enhanced vault contracts with policy engine	          $8,000
Core Spending Policies	     Daily limits, max transaction amounts, destination whitelists	$5,000
Key Deliverable: Public Testnet Launch with policy-enabled vaults

### Tranche 2 (July 2026) - 30% / $45,000
Deliverable	               Description	                                             Budget
Full Role System	          Admin, Proposer, Voter, Executor, Spender roles	          $15,000
Dashboard MVP	               Enterprise-grade UI with policy configuration	          $15,000
Native USDC Integration	     First-class USDC support with MoneyGram-ready architecture	$10,000
Beta Testing	               Onboard 3+ external beta vaults	                         $5,000
Key Deliverable: Dashboard MVP with 3+ Beta Users

### Tranche 3 (October 2026) - 40% / $60,000
Deliverable	          Description	                                        Budget
Security Hardening	     Address all identified vulnerabilities	               $10,000
Security Audit	          Professional audit (via SCF Audit Bank)	               $0
Mainnet Deployment	     Deploy factory and vault contracts to mainnet	     $15,000
DeFi Connectors	     Integration with Stellar DEX	                         $15,000
Enterprise Features	     Compliance reporting, audit trails, advanced policies	$10,000
Documentation & Launch	Complete user/developer docs, public launch	          $10,000
Key Deliverable: Mainnet Launch with 20+ vaults

### Bug Fixes Completed (April 2026)
Issue	                                        Resolution
Proposal approval_count mismatch	               DB now stores approvals array, syncs with on-chain
TimeLock/Vesting execution with null params	     Added validation before execute
Lock creation inserted wrong table	               Now creates proposal, lock on execution
ClaimPage getAllVaults[i] object bug	          Fixed to use vault_address property
CreateVaultModal scValToNative [object Object]	Added proper Address parsing
ClaimPage wallet state lost on redirect	          Added initialPublicKey/initialWalletId props
Supabase VITE_* vs REACT_APP_* env vars	          Fixed for CRA (react-scripts)
Corrupted DB entries [object Object]	          Cleaned and fixed insertion logic
Beneficiary not redirected to ClaimPage	          Added URL routing + vault-specific check
Contacts global instead of per-wallet	          Added wallet-specific storage keys

### Next Phase Priorities
# Immediate (Before Tranche 1)
- Fix env vars for Vercel deployment ✅
- Complete ClaimPage vault-specific routing ✅
- Contract TTL extension (testnet)
- USDC/EURC trustlines for demo
# Tranche 1 Focus
- OpenZeppelin Smart Account integration
- Policy engine (SpendLimit, TimeLock, RateLimit)
- Enhanced role system (5 roles)
- Contract events for indexing
# Tranche 2 Focus
- Enterprise dashboard UI
- Policy configuration interface
- Batch operations
- Beta user onboarding

### Stakeholder Sign-Off
Role	               Name	                    Priority Agreement	     Date
Product Owner	     Christopher Fourquier	☑ Approved	          2026-04-25
Tech Lead	          Christopher Fourquier	☑ Approved	          2026-04-25
Full Stack	     Alexis Fourquier	     ☐ Approved	
GTM Lead	          Frances Regina	          ☐ Approved	

### Revision History
Version	Date	               Author	               Changes
1.0	     April 5, 2026	     Dev Team	               Initial MoSCoW
1.1	     April 25, 2026	     Christopher Fourquier	SCF #43 submission updates, bug fixes, milestone roadmap

### Document maintained by: Orion Safe Team
Last updated: April 25, 2026
SCF Submission: #43 Open Track