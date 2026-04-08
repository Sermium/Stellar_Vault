# Orion Safe - MoSCoW Prioritization

**Version:** 1.0  
**Date:** April 5, 2026  
**Sprint/Phase:** v1.0 Release

---

## Overview

This document outlines the feature prioritization for Orion Safe using the MoSCoW method:
- **M**ust Have: Critical for release
- **S**hould Have: Important but not critical
- **C**ould Have: Desirable if time permits
- **W**on't Have: Out of scope for this release

---

## Must Have (M) ✅

*Essential features without which the product would not function*

| ID    | Feature                                      | Status   | Notes                        |
|-------|----------------------------------------------|----------|------------------------------|
| M-001 | Multi-signature vault creation               | ✅ Done | Factory deploys vaults        |  
| M-002 | Configurable threshold (M-of-N)              | ✅ Done | 1 to N signers                |
| M-003 | Transfer proposal system                     | ✅ Done | Propose → Approve → Execute   |
| M-004 | Proposal approval workflow                   | ✅ Done | Threshold enforcement         |
| M-005 | Proposal execution                           | ✅ Done | Transfers funds when approved |
| M-006 | Proposal rejection                           | ✅ Done | Cancel with threshold         |
| M-007 | Role-based access (Admin/Executor/Viewer)    | ✅ Done | Role system working           |
| M-008 | Wallet connection (Freighter)                | ✅ Done | Multiple wallets supported    |
| M-009 | View vault balances                          | ✅ Done | Total, locked, available      |
| M-010 | Time lock functionality                      | ✅ Done | Through proposal system       |
| M-011 | Vesting functionality                        | ✅ Done | Through proposal system       |
| M-012 | Lock claiming (beneficiary)                  | ✅ Done | Claim available funds         |
| M-013 | Available balance calculation                | ✅ Done | Total - locked - pending      |
| M-014 | Basic error handling                         | ✅ Done | User-friendly messages        |
| M-015 | Testnet deployment                           | ✅ Done | Factory + vault contracts     |

**Must Have Status: 15/15 Complete (100%)**

---

## Should Have (S) 🔄

*Important features that add significant value*

| ID    | Feature                           | Status     | Notes                            |
|-------|-----------------------------------|------------|----------------------------------|
| S-001 | Public vault view                 | ✅ Done    | Read-only sharing                |
| S-002 | Public claim page                 | ✅ Done    | Beneficiary claims               |
| S-003 | Contact management                | ✅ Done    | Save addresses                   |
| S-004 | Transaction history               | ✅ Done    | On-chain payments                |
| S-005 | Multiple wallet support           | ✅ Done    | Freighter, xBull, Lobstr, Albedo |
| S-006 | Custom token support              | ✅ Done    | Add any Soroban token            |
| S-007 | Vault selector (multiple vaults)  | ✅ Done    | Switch between vaults            |
| S-008 | Signer management UI              | ✅ Done    | Add/remove signers               |
| S-009 | Threshold adjustment UI           | ✅ Done    | Change threshold                 |
| S-010 | Leave vault function              | ✅ Done    | Self-removal                     |
| S-011 | Proposal type display             | 🔄 Partial | Shows in transactions            |
| S-012 | Lock/vesting details in proposals | 🔄 Partial | Basic info shown                 |
| S-013 | Deposit functionality             | ✅ Done    | Fund vault                       |
| S-014 | Trustline management              | ✅ Done    | For classic assets               |
| S-015 | Dashboard overview                | ✅ Done    | Stats and recent proposals       |

**Should Have Status: 13/15 Complete (87%)**

---

## Could Have (C) 📋

*Desirable features that would enhance the product*

| ID    | Feature                          | Status         | Notes                    |
|-------|----------------------------------|----------------|--------------------------|
| C-001 | Calendar view for locks/vestings | ❌ Not Started | Timeline visualization   |
| C-002 | Batch lock creation UI           | ❌ Not Started | Contract supports it     | 
| C-003 | CSV import for batch vestings    | ❌ Not Started | Bulk employee vesting    |
| C-004 | Email notifications              | ❌ Not Started | Pending approval alerts  |
| C-005 | Mobile responsive design         | 🔄 Partial     | Basic support            |
| C-006 | Dark/light theme toggle          | ❌ Not Started | Currently dark only      |
| C-007 | Transaction export (CSV)         | ❌ Not Started | Accounting integration   |
| C-008 | Spending limits                  | ❌ Not Started | Contract has function    |
| C-009 | Factory admin panel              | ✅ Done        | Manage fees, WASM        |
| C-010 | Proposal templates               | ❌ Not Started | Quick recurring payments |
| C-011 | Address book import/export       | ❌ Not Started | Backup contacts          |
| C-012 | QR code for vault address        | ❌ Not Started | Easy deposits            |
| C-013 | Multi-language support           | ❌ Not Started | i18n                     |
| C-014 | Keyboard shortcuts               | ❌ Not Started | Power user features      |
| C-015 | Audit log                        | ❌ Not Started | All vault actions        |

**Could Have Status: 2/15 Complete (13%)**

---

## Won't Have (W) 🚫

*Explicitly excluded from this release*

| ID    | Feature                | Reason                   | Future Phase |
|-------|------------------------|--------------------------|--------------|
| W-001 | Mainnet deployment     | Requires audit           | Phase 4      |
| W-002 | Native mobile apps     | Web-first approach       | Phase 5      |
| W-003 | Cross-chain support    | Stellar focus first      | Phase 4      |
| W-004 | Fiat on/off ramp       | Regulatory complexity    | TBD          |
| W-005 | Native token           | No tokenomics planned    | N/A          |
| W-006 | DEX integration        | Out of scope             | Phase 5      |
| W-007 | Staking/yield          | Not core feature         | TBD          |
| W-008 | DAO voting             | Different product        | N/A          |
| W-009 | NFT support            | Focus on fungible tokens | Phase 5      |
| W-010 | Hardware wallet direct | Via Freighter supported  | Phase 3      |

---

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

---

## Release Criteria

### v1.0 Release Requirements

| Category      | Required | Achieved |
|---------------|----------|----------|
| Must Have     | 100%     | ✅ 100%  |
| Should Have   | 80%      | ✅ 87%   |
| Could Have    | 0%       | 13%      |
| Critical Bugs | 0        | ✅ 0     |
| Major Bugs    | 0        | ✅ 0     |

**Release Status: ✅ READY FOR RELEASE**

---

## Next Phase Priorities

### Phase 2 (Q2 2026)

**Promoted from Could Have:**
1. C-001: Calendar view for locks/vestings
2. C-002: Batch lock creation UI
3. C-003: CSV import for batch vestings
4. C-005: Mobile responsive improvements

**Promoted from Should Have:**
1. S-011: Enhanced proposal type display
2. S-012: Full lock/vesting details

### Phase 3 (Q3 2026)

**Focus Areas:**
1. Security audit completion
2. Mainnet preparation
3. SDK development
4. Partner integrations

---

## Stakeholder Sign-Off

| Role          | Name | Priority Agreement | Date |
|---------------|------|--------------------|------|
| Product Owner |      | ☐ Approved         |      |
| Tech Lead     |      | ☐ Approved         |      |
| QA Lead       |      | ☐ Approved         |      |
| Design Lead   |      | ☐ Approved         |      |

---

## Revision History

| Version | Date          | Author   | Changes        |
|---------|---------------|----------|----------------|
| 1.0     | April 5, 2026 | Dev Team | Initial MoSCoW |

---

*Document maintained by: Product Team*  
*Last updated: April 5, 2026*
