





CONTRACT BEHAVIOUR DOCUMENT
VaultFactory v2 — Soroban / Stellar


Date: April 2026
Version: 2.0 (Post-Audit)
Classification: Confidential
 
1. Purpose
The VaultFactory contract is the single entry point for deploying, initializing, and indexing multisig vault contracts on the Stellar Soroban network. It acts as a root of trust: users interact with the factory, the factory deploys vault instances from a verified WASM hash, collects fees, and maintains lookup indexes so that front-end applications and beneficiaries can locate their vaults without scanning the full ledger.
This document describes every external function, its expected inputs, outputs, authorization requirements, storage effects, emitted events, and failure modes. It serves as the reference for developers, integrators, auditors, and governance reviewers.

2. Architecture Overview
The system consists of two contract types working together:
•	VaultFactory (this contract): Deploys vault instances, manages governance, maintains indexes.
•	Vault (child contract): Manages multisig operations, token locks, and beneficiary claims. Deployed by the factory from a stored WASM hash.

The factory stores minimal governance data in instance storage (survives contract upgrades, shared size limit) and all per-vault, per-user index data in persistent storage (individual entries, larger capacity, independent TTLs).

2.1 Storage Layout

Key	                        Storage Type	Data Type	    Description
Config	                    Instance	    FactoryConfig	Admin, WASM hash, fee settings
VaultCount	                Instance	    u64	            Total vaults deployed
PendingUpgrade	            Instance	    PendingUpgrade	Timelock for WASM changes
VaultInfo(addr)	            Persistent	    VaultInfo	    Creation-time vault metadata
VaultsByOwner(addr)	        Persistent	    Vec<Address>	Vaults owned by address
VaultsBySigner(addr)	    Persistent	    Vec<Address>	Vaults where address is signer
VaultsByBeneficiary(addr)	Persistent	    Vec<Address>	Vaults where address is beneficiary
AllVaults	                Persistent	    Vec<Address>	Global vault registry

3. Initialization

3.1 initialize

Sets the factory configuration. Must be called exactly once, atomically with deployment to prevent front-running.

Authorization: The admin address must sign the transaction (require_auth).

Parameter	        Type	    Constraints
admin               Address	    Becomes the factory administrator
vault_wasm_hash	    BytesN<32>	SHA-256 of the vault WASM to deploy
fee_token	        Address	    Soroban token contract address for fees
fee_amount	        i128	    Must be >= 0. Set to 0 for no fee.
fee_recipient	    Address	    Address that receives collected fees

Errors: AlreadyInitialized (2) if called twice. InvalidFeeAmount (8) if fee_amount is negative.
Events: factory_init with admin address.
Storage: Writes Config and VaultCount to instance. Writes empty AllVaults to persistent. Extends instance TTL.

4. Vault Creation

4.1 create_vault

Deploys a new vault contract, initializes it with the provided signers and threshold, indexes all relationships, and collects the creation fee. This is the primary user-facing function.

Authorization: Creator must sign the transaction.

Parameter	    Type	        Constraints
creator	        Address	        Must be present in the signers list
name	        Symbol	        Unique per owner. Checked against existing vaults.
signers	        Vec<Address>	1 to 20 addresses. No duplicates. Creator must be included.
threshold	    u32	            1 <= threshold <= signers.len(). Number of signatures required.
beneficiaries	Vec<Address>	Addresses to register in the beneficiary index at creation time.

Execution Order
The function executes in this exact sequence. The order is security-relevant.
1.	Validate inputs: signers not empty, no duplicates, creator present, threshold in range, vault cap not reached.
2.	Load config from instance storage.
3.	Check vault name uniqueness against owner's existing vaults.
4.	Generate salt from counter + timestamp + creator address.
5.	Deploy vault contract using WASM hash and salt.
6.	Initialize deployed vault with name, signers, and threshold.
7.	Collect fee (only after successful deploy + init).
8.	Write VaultInfo, update VaultsByOwner, VaultsBySigner, VaultsByBeneficiary, AllVaults.
9.	Increment vault counter and config.total_vaults_created. Extend TTLs. Emit vault_created event.

Returns: Address of the deployed vault contract.
Events: vault_created with (vault_address, creator, name, threshold).

Error Table
Error	Code	Trigger Condition
NotInitialized	1	Factory not initialized
NoSigners	5	Empty signers list or exceeds 20 signers
InvalidThreshold	4	threshold == 0 or threshold > signer count
CreatorNotInSigners	11	Creator address not found in signers list
DuplicateSigner	10	Same address appears more than once in signers
VaultNameExists	7	Owner already has a vault with this name
MaxVaultsReached	14	Total vault count has reached 10,000 cap

5. Beneficiary Management
The beneficiary index replaces the previous design that scanned all vaults with cross-contract calls. The index is maintained by the vault contracts themselves (or the factory admin) through two registration functions.

5.1 register_beneficiary
Adds a vault to a beneficiary's lookup index. Called by the vault contract when a new token lock is created with a designated beneficiary.

Authorization: Caller must be the vault contract address itself or the factory admin. All other callers are rejected with NotAdmin (3).
Deduplication: If the beneficiary is already indexed for this vault, the function returns Ok without writing.
Events: beneficiary_registered with (beneficiary, vault_address).

5.2 unregister_beneficiary
Removes a vault from a beneficiary's lookup index. Called by the vault contract when a lock is claimed or cancelled.

Authorization: Same as register_beneficiary. Vault contract or factory admin only.
Events: beneficiary_removed with (beneficiary, vault_address).

5.3 get_vaults_by_beneficiary
View function. Returns the list of vault addresses where the given address is a registered beneficiary. No authorization required. O(1) storage read with no cross-contract calls.

Front-end workflow: call get_vaults_by_beneficiary to get vault addresses, then query each vault contract for lock details (token, amount, unlock timestamp, status).

6. Governance Functions
All governance functions require admin.require_auth() and verify the caller matches config.admin. Every state change emits an event and extends the instance TTL.

6.1 WASM Hash Upgrade (Timelocked)
The WASM hash determines what code future vaults run. Because the factory is a root of trust, changes to this hash use a two-step timelock process.

propose_wasm_upgrade
Records a PendingUpgrade with the new hash and an activation timestamp set to current_timestamp + 17,280 ledgers (approximately 1 day). Does not change the active WASM hash.
Events: wasm_upgrade_proposed with (new_hash, activate_at).

execute_wasm_upgrade
Applies the pending upgrade if the current timestamp is past the activation time. Replaces config.vault_wasm_hash and removes the PendingUpgrade record.
Errors: NoUpgradePending (13) if no proposal exists. UpgradeNotReady (12) if timelock has not expired.
Events: wasm_upgrade_executed with the new hash.

cancel_wasm_upgrade
Removes the pending upgrade without applying it. Available at any time.
Events: wasm_upgrade_cancelled with admin address.

6.2 Fee Management
Function	Parameter	Validation	Event
set_fee	new_fee_amount: i128	Must be >= 0	fee_updated
set_fee_token	new_fee_token: Address	None	fee_token_updated
set_fee_recipient	new_recipient: Address	None	fee_recipient_updated

6.3 Admin Transfer
set_admin
Transfers admin control to a new address. Immediate effect, no timelock. The current admin loses all privileges in the same transaction.
Events: admin_transferred with (old_admin, new_admin).
Warning: This action is irreversible. If the new address is incorrect, admin access is permanently lost.

7. View Functions
All view functions are read-only, require no authorization, and return data from storage without cross-contract calls.

Function	Returns	Notes
get_config	Option<FactoryConfig>	Full config including admin, fee, hash
get_vault_info(addr)	Option<VaultInfo>	Creation-time snapshot. Signers may have changed on-chain.
get_vaults_by_owner(addr)	Vec<Address>	All vaults created by this address
get_vaults_by_signer(addr)	Vec<Address>	Reflects creation-time signers only
get_vaults_by_beneficiary(addr)	Vec<Address>	Updated via register/unregister callbacks
get_all_vaults	Vec<Address>	Full registry. May be large.
get_vault_count	u64	Total vaults deployed
get_fee	i128	Current fee amount (0 if unset)
is_vault_owner(addr)	bool	True if address owns any vault
is_vault_signer(addr)	bool	True if address is signer on any vault
is_beneficiary(addr)	bool	Indexed lookup. No cross-contract calls.
get_pending_upgrade	Option<PendingUpgrade>	Current timelock proposal, if any

8. Safety Constraints and Limits

Constraint	Value	Rationale
Maximum signers per vault	20	Bounds deduplication check (O(n^2), n <= 20)
Maximum total vaults	10,000	Prevents unbounded persistent storage growth
WASM upgrade delay	17,280 ledgers	Approximately 1 day. Allows community review.
Instance TTL threshold	17,280	Refreshes when below ~1 day remaining
Instance TTL extension	518,400	Extends to ~30 days on refresh
Persistent TTL threshold	17,280	Same as instance
Persistent TTL extension	518,400	Same as instance
Minimum fee amount	0	Negative values rejected

9. Event Reference
All state-changing functions emit events for off-chain indexing, monitoring, and audit trails.

Event Name	Payload	Emitted By
factory_init	admin: Address	initialize
vault_created	(addr, creator, name, threshold)	create_vault
beneficiary_registered	(beneficiary, vault_address)	register_beneficiary
beneficiary_removed	(beneficiary, vault_address)	unregister_beneficiary
wasm_upgrade_proposed	(new_hash, activate_at)	propose_wasm_upgrade
wasm_upgrade_executed	new_hash: BytesN<32>	execute_wasm_upgrade
wasm_upgrade_cancelled	admin: Address	cancel_wasm_upgrade
fee_updated	new_fee_amount: i128	set_fee
fee_token_updated	new_fee_token: Address	set_fee_token
fee_recipient_updated	new_recipient: Address	set_fee_recipient
admin_transferred	(old_admin, new_admin)	set_admin

10. Integration Requirements for Vault Contract
The beneficiary index is maintained by callbacks from the vault contract. For the index to stay accurate, the vault contract must implement these two calls:

On Lock Creation
When a vault creates a token lock with a beneficiary, it must call factory.register_beneficiary(self_address, vault_address, beneficiary_address). The vault contract authenticates as itself (the contract address is the caller). The factory verifies the caller matches a known vault address.

On Lock Claim or Cancellation
When a beneficiary claims their locked tokens or the lock is cancelled, the vault must call factory.unregister_beneficiary(self_address, vault_address, beneficiary_address). This removes the vault from the beneficiary's index.

Failure Handling
If the vault contract does not implement these callbacks, the beneficiary index will be incomplete. The core vault operations (locking, claiming) are not affected. Only the factory-level beneficiary lookup will have gaps. Front-end applications should treat the index as a convenience layer, not a source of truth, and can fall back to querying individual vault contracts if needed.

Signer Data Freshness
The factory stores signers and threshold at vault creation time in VaultInfo. If the vault contract allows adding or removing signers after creation, the factory's VaultInfo becomes stale. Applications that need current signer lists should query the vault contract directly. The factory index is optimized for discovery (finding which vaults exist for a given address), not for live state.

11. Known Limitations
•	Vault name uniqueness is per-owner, not global. Two different owners can create vaults with the same name.
•	VaultInfo reflects creation-time state. Signer changes on the vault contract are not reflected in factory storage.
•	The AllVaults vector grows without bound (up to MAX_VAULTS_TOTAL cap). Large-scale deployments should consider pagination or off-chain indexing.
•	Admin transfer is immediate with no timelock or multi-step confirmation.
•	The extend_ttl function is public. Anyone can pay to keep the contract alive. This is intentional.
•	The 10,000 vault cap is a safety measure. It can be raised by deploying an updated factory contract.
•	Salt includes creator and timestamp but remains deterministic for a given (count, creator, timestamp) tuple. Addresses are predictable if all three values are known.

12. Complete Error Code Reference
Code	Name	Description
1	NotInitialized	Factory has not been initialized
2	AlreadyInitialized	initialize called more than once
3	NotAdmin	Caller is not the factory admin
4	InvalidThreshold	Threshold is 0 or exceeds signer count
5	NoSigners	Signers list is empty or exceeds 20
6	InsufficientFee	Reserved for future use
7	VaultNameExists	Owner already has a vault with this name
8	InvalidFeeAmount	Fee amount is negative
9	ZeroAddress	Reserved for future zero-address validation
10	DuplicateSigner	Same address appears more than once in signers
11	CreatorNotInSigners	Creator address not found in signers list
12	UpgradeNotReady	Timelock has not expired for WASM upgrade
13	NoUpgradePending	No WASM upgrade has been proposed
14	MaxVaultsReached	Total vault count has reached the 10,000 cap

