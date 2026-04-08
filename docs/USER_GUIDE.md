# Orion Safe - User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Creating a Vault](#creating-a-vault)
4. [Managing Assets](#managing-assets)
5. [Transactions & Proposals](#transactions--proposals)
6. [Time Locks & Vesting](#time-locks--vesting)
7. [Public Access & Sharing](#public-access--sharing)
8. [Settings & Administration](#settings--administration)

---

## Introduction

Orion Safe is a multi-signature vault solution built on the Stellar blockchain using Soroban smart contracts. It enables teams, DAOs, and organizations to securely manage digital assets with customizable approval thresholds.

### Key Features
- **Multi-signature security**: Require multiple approvals for transactions
- **Role-based access**: Admin, Executor, and Viewer roles
- **Time Locks**: Lock assets until a specific date
- **Vesting Schedules**: Gradual token release over time
- **Public Sharing**: Share vault status without exposing private keys
- **Threshold-based approvals**: All actions (transfers, locks, vestings) require threshold approval

---

## Getting Started

### Prerequisites
- A Stellar wallet (Freighter, xBull, Lobstr, or Albedo)
- Some XLM for transaction fees (minimum 10 XLM recommended)
- Testnet XLM for testing (use Stellar Friendbot)

### Connecting Your Wallet
1. Visit the Orion Safe dashboard
2. Click "Connect Wallet"
3. Select your preferred wallet provider
4. Approve the connection request in your wallet
5. You're now connected!

---

## Creating a Vault

### Step 1: Initiate Vault Creation
1. Click "Create Your First Vault" or the "+" button in the sidebar
2. Enter a name for your vault (e.g., "Team Treasury")

### Step 2: Add Signers
1. Your address is automatically added as the first signer (Admin)
2. Click "Add Signer" to add additional signers
3. Enter the Stellar address (starts with G...)
4. You can add signers from your contacts list

### Step 3: Set Threshold
1. Choose the approval threshold (1 to N signers)
2. Example: 2-of-3 means 2 approvals needed out of 3 signers
3. Higher thresholds = more security, slower execution

### Step 4: Pay Creation Fee
1. Review the vault creation fee (10 XLM)
2. Confirm the transaction in your wallet
3. Wait for confirmation (~5 seconds)

### Step 5: Vault Ready!
Your vault is now created and ready to receive assets.

---

## Managing Assets

### Depositing Assets
1. Go to "Assets" view
2. Click "Deposit"
3. Select the token (XLM, USDC, etc.)
4. Enter the amount
5. Confirm in your wallet

### Viewing Balances
The Assets view shows:
- **Total Balance**: Your vault's holdings
- **Locked Amount**: Assets in time locks or vesting
- **Available Balance**: Assets available for transactions

### Adding Custom Tokens
1. Click "Add Token" in Assets view
2. Enter the token contract address
3. The token will appear in your asset list

---

## Transactions & Proposals

### How Proposals Work
All outgoing transactions require threshold approval:
1. **Propose**: Any signer creates a proposal
2. **Approve**: Signers vote to approve
3. **Execute**: Once threshold is met, execute the transfer

### Creating a Transaction Proposal
1. Click "New Transaction"
2. Select the token to send
3. Enter the recipient address
4. Enter the amount (cannot exceed available balance)
5. Click "Create Proposal"

### Approving Proposals
1. Go to "Transactions" view
2. Find pending proposals
3. Click "Approve" to add your approval
4. Progress shows as "X/Y approvals"

### Executing Proposals
1. Once threshold is met, "Execute" button appears
2. Click "Execute" to complete the transfer
3. Transaction is broadcast to the network

### Rejecting Proposals
1. Click "Reject" on a pending proposal
2. Other signers can also vote to reject
3. Once rejection threshold is met, proposal is cancelled

---

## Time Locks & Vesting

### Time Locks
Lock assets until a specific date. Useful for:
- Scheduled payments
- Escrow arrangements
- Self-custody lockups

**Creating a Time Lock Proposal:**
1. Go to "Locks" view
2. Click "Create Time Lock"
3. Select beneficiary (who receives the funds)
4. Select token and amount
5. Set unlock date/time
6. Choose if revocable (can be cancelled by admin)
7. Submit - creates a proposal requiring threshold approval

### Vesting Schedules
Gradual release of tokens over time. Useful for:
- Employee token grants
- Investor allocations
- Advisor compensation

**Creating a Vesting Proposal:**
1. Go to "Vesting" view
2. Click "Create Vesting"
3. Configure:
   - Beneficiary address
   - Token and total amount
   - Start date
   - Cliff period (initial lockup)
   - Total duration
   - Release intervals (monthly, weekly, etc.)
4. Submit - creates a proposal requiring threshold approval

### Claiming Locked/Vested Assets
Beneficiaries can claim available funds:
1. Connect wallet as beneficiary
2. Go to Claims page or use public link
3. Click "Claim" on available locks
4. Funds transfer to beneficiary wallet

---

## Public Access & Sharing

### Public View Links
Share your vault's status without exposing control:

https://orionsafe.app/?vault=CXXX...&view=public


Public view shows:
- Vault balances
- Active locks and vesting schedules
- Lock/vesting progress and timelines
- No ability to modify or transact

### Claim Links
Beneficiaries can claim from a direct link:
https://orionsafe.app/?view=claim

---

## Settings & Administration

### Managing Signers
**Add Signer (Admin only):**
1. Go to Settings
2. Enter new signer address
3. Select role (Admin, Executor, Viewer)
4. Confirm transaction

**Remove Signer (Admin only):**
1. Go to Settings
2. Click remove on the signer
3. Cannot remove last admin
4. Cannot reduce below threshold

### Changing Roles
- **Admin**: Full control, can manage signers and settings
- **Executor**: Can propose and approve transactions
- **Viewer**: Read-only access

### Adjusting Threshold
1. Go to Settings
2. Adjust threshold slider
3. Cannot exceed signer count
4. Confirm transaction

### Leaving a Vault
Signers can voluntarily leave:
1. Go to Settings
2. Click "Leave Vault"
3. Confirm transaction
4. You lose access to the vault

---

## Troubleshooting

### Transaction Failed
- Check you have enough XLM for fees
- Verify the recipient address is correct
- Ensure you have sufficient available balance

### Wallet Won't Connect
- Refresh the page
- Check wallet extension is enabled
- Try a different browser

### Proposal Stuck
- Ensure threshold approvals are met
- Check if proposal was rejected
- Verify vault has sufficient balance

---

## Support

- GitHub: https://github.com/your-org/orion-safe
- Discord: https://discord.gg/orionsafe
- Email: support@orionsafe.app

---

*Orion Safe v1.0 - Built on Stellar Soroban*
