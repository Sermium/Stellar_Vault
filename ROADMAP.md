# Stellar Vault Roadmap

## Overview

Stellar Vault development is structured in four phases over approximately 6-9 months, culminating in a mainnet launch with enterprise-grade treasury management capabilities.

---

## Phase 1: Foundation (Months 1-2)

**Objective:** Establish core architecture and deploy basic vault functionality to testnet.

### Deliverables

| Deliverable | Description | Status |
|-------------|-------------|--------|
| Technical Architecture | Complete system design documentation | 🔄 In Progress |
| OpenZeppelin Integration | Integrate Smart Account framework | ⏳ Planned |
| Core Vault Contract | Basic vault with multi-sig support | ⏳ Planned |
| Testnet Deployment | Deploy contracts to Stellar Testnet | ⏳ Planned |

### Technical Milestones

- [ ] Finalize contract architecture
- [ ] Set up development environment with Soroban CLI
- [ ] Implement base vault contract
- [ ] Implement signer management (add/remove/threshold)
- [ ] Deploy to testnet
- [ ] Write comprehensive unit tests

### Success Criteria

- ✅ Vault contract deployed to testnet
- ✅ Basic M-of-N multisig working
- ✅ Documentation published

---

## Phase 2: Policy Engine (Months 3-4)

**Objective:** Implement programmable spending policies and launch dashboard MVP.

### Deliverables

| Deliverable | Description | Status |
|-------------|-------------|--------|
| Spend Limit Policy | Daily/weekly/per-tx limits | ⏳ Planned |
| Time Lock Policy | Delayed execution for high-value tx | ⏳ Planned |
| Rate Limit Policy | Transaction frequency controls | ⏳ Planned |
| Allowlist Policy | Approved destination addresses | ⏳ Planned |
| Dashboard MVP | Basic web interface | ⏳ Planned |
| Beta Program | Onboard 3 beta partners | ⏳ Planned |

### Technical Milestones

- [ ] Design policy interface standard
- [ ] Implement SpendLimitPolicy contract
- [ ] Implement TimeLockPolicy contract
- [ ] Implement RateLimitPolicy contract
- [ ] Implement AllowlistPolicy contract
- [ ] Build dashboard with React + Freighter
- [ ] Transaction proposal/approval workflow UI
- [ ] Policy configuration interface

### Success Criteria

- ✅ All 4 policy types functional on testnet
- ✅ Dashboard MVP deployed to staging
- ✅ 3 beta partners onboarded and testing

---

## Phase 3: Enterprise Features (Months 5-6)

**Objective:** Complete role-based access control, USDC integration, and security audit.

### Deliverables

| Deliverable | Description | Status |
|-------------|-------------|--------|
| Role System | Admin/Proposer/Voter/Executor/Spender | ⏳ Planned |
| USDC Integration | Native USDC support & optimization | ⏳ Planned |
| Audit Trail | On-chain transaction logging | ⏳ Planned |
| Compliance Tools | Reporting & export functionality | ⏳ Planned |
| Security Audit | Professional third-party audit | ⏳ Planned |

### Technical Milestones

- [ ] Implement role management contract
- [ ] Role-based transaction workflows
- [ ] USDC-specific context rules
- [ ] Batch USDC transfer support
- [ ] Event emission for audit trail
- [ ] Export functionality (CSV, JSON)
- [ ] Complete security audit
- [ ] Address audit findings

### Success Criteria

- ✅ Full role system operational
- ✅ USDC operations optimized
- ✅ Security audit completed with no critical issues

---

## Phase 4: Mainnet Launch (Months 7-9)

**Objective:** Launch production-ready platform on Stellar Mainnet.

### Deliverables

| Deliverable | Description | Status |
|-------------|-------------|--------|
| Mainnet Deployment | Deploy all contracts to mainnet | ⏳ Planned |
| Production Dashboard | Launch public web application | ⏳ Planned |
| Documentation | Complete user & developer docs | ⏳ Planned |
| Enterprise Onboarding | Onboard initial enterprise users | ⏳ Planned |
| DeFi Integration | Stellar DEX integration | ⏳ Planned |

### Technical Milestones

- [ ] Final testnet validation
- [ ] Mainnet contract deployment
- [ ] Production dashboard launch
- [ ] SDK release (JavaScript/TypeScript)
- [ ] API documentation
- [ ] Integration guides
- [ ] Stellar DEX swap support
- [ ] Yield strategy foundations

### Success Criteria

- ✅ Mainnet contracts live
- ✅ 20+ vaults created
- ✅ $1M+ TVL secured
- ✅ 3+ enterprise integrations

---

## Future Phases

### Phase 5: DeFi Strategy Vaults (Future)
- Automated yield strategies
- Lending protocol integration
- Liquidity provision management

### Phase 6: Cross-Border Automation (Future)
- Scheduled/recurring payments
- FX conversion rules
- Anchor integration for fiat settlement

### Phase 7: Multi-Chain Expansion (Future)
- Cross-chain vault management
- Bridge integrations
- Unified treasury across chains

---

## Timeline Summary

2026
├── Q2 (Apr-Jun)
│   ├── Month 1-2: Foundation (Phase 1)
│   └── Month 3-4: Policy Engine (Phase 2)
├── Q3 (Jul-Sep)
│   ├── Month 5-6: Enterprise Features and mainnet (Phase 3)
└── Q4+
    └── Future phases: DeFi, Cross-border, Multi-chain

---

## How to Track Progress

- **GitHub Issues:** All tasks tracked as issues
- **GitHub Projects:** Kanban board for each phase
- **Monthly Updates:** Progress reports in Discussions

---

## Get Involved

Interested in contributing or becoming a beta partner?

- Open an issue to discuss features
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
- Contact us for beta program participation