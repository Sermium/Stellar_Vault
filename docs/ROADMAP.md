## Orion Safe Roadmap

# Overview
Orion Safe development follows the SCF #43 Build Award milestone structure, targeting mainnet launch by October 2026 with enterprise-grade treasury management capabilities.

Current Status: Testnet Live | SCF #43 Submitted | Awaiting Award Decision

# Completed: Pre-SCF Development ✅
Objective: Build functional MVP and submit for SCF funding.

Achievements
Deliverable	Description	Status
Core Vault Contract	    Multi-sig vault with threshold enforcement	✅ Complete
Factory Contract	    Deploy and manage vault instances	        ✅ Complete
Proposal System	        Transfer, TimeLock, Vesting proposals	    ✅ Complete
Role-Based Access	    SuperAdmin/Admin/Executor hierarchy	        ✅ Complete
Dashboard MVP	        Full-featured web application	            ✅ Complete
Testnet Deployment	    All contracts live on testnet	            ✅ Complete
Multi-Wallet Support	Freighter, Albedo, xBull, LOBSTR	        ✅ Complete
Beneficiary Claims	    Dedicated claim page with routing	        ✅ Complete
Database Integration	Supabase with RLS policies	                ✅ Complete
SCF Submission	        Build Award application submitted	        ✅ Complete

# Testnet Evidence
- Factory Contract: CCNGOW6UCZKELBAR377HDHWAJJLKD6SJHUFCDT4UM6M2AYPSOEBYLDVA
- Test Vault: CBJ4BFOUDMQWFPCBALQTO2565STNGFMGQWDYVQ7MBWRZF5WSI2Z4VT5W
- Live Dashboard: https://stellar-vault-eta.vercel.app

## Tranche 0: Upon Approval (10% - $15,000)
Objective: Kickoff development, begin OpenZeppelin integration.

# Deliverables
Deliverable	                Description	                        Status
Project Setup	            Development environment, CI/CD	    ✅ Complete
Technical Architecture Doc	Published on GitHub	                ✅ Complete
OpenZeppelin Research	    Smart Account framework analysis	🔄 In Progress
Contract TTL Extension	    Extend testnet contract lifetimes	⏳ Pending

# Immediate Actions (Post-Approval)
- Extend contract TTLs on testnet
- Set up OpenZeppelin development branch
- Create detailed Tranche 1 task breakdown
- Establish beta partner communications

## Tranche 1: MVP Enhancement (20% - $30,000)
Target: May 25, 2026

Objective: Integrate OpenZeppelin Smart Account framework and core policies.

# Deliverables

Deliverable	                Description	                                                    Budget	Status
Technical Architecture	    Complete system design with OpenZeppelin	                    $5,000	⏳ Planned
OpenZeppelin Integration	Smart Account Framework (Context Rules, Signers, Policies)	    $12,000	⏳ Planned
Testnet Smart Contracts	    Deploy enhanced vault contracts with policy engine	            $8,000	⏳ Planned
Core Spending Policies	    Daily limits, max transaction amounts, destination whitelists	$5,000	⏳ Planned

# Technical Milestones
- Fork and integrate OpenZeppelin Smart Account contracts
- Implement SpendLimitPolicy contract
- Implement AllowlistPolicy contract
- Create policy configuration storage
- Update vault contract to enforce policies
- Deploy enhanced contracts to testnet
- Update dashboard for policy management
- Write integration tests (>70% coverage)

# Success Criteria
✅ OpenZeppelin framework integrated
✅ 2+ policy types functional on testnet
✅ Enhanced contracts deployed
✅ Documentation updated

## Tranche 2: Dashboard & Beta (30% - $45,000)
Target: July 25, 2026

Objective: Complete role system, enterprise dashboard, and onboard beta users.

# Deliverables

Deliverable	                Description	                                                Budget	Status
Full Role System	        Admin, Proposer, Voter, Executor, Spender (5 roles)	        $15,000	⏳ Planned
Dashboard MVP	            Enterprise-grade UI with policy configuration	            $15,000	⏳ Planned
Native USDC Integration	    First-class USDC support with MoneyGram-ready architecture	$10,000	⏳ Planned
Beta Testing	            Onboard 3+ external beta vaults	                            $5,000	⏳ Planned

# Technical Milestones
- Implement 5-role permission system
- Role-based UI visibility controls
- Policy configuration dashboard
- USDC-optimized transfer flows
- Batch USDC operations
- Mobile responsive improvements
- Beta partner onboarding process
- Feedback collection system
- Test coverage >80%

# Success Criteria
✅ All 5 roles operational with correct permissions
✅ Dashboard usable by 3+ beta testers
✅ USDC transfers working with policy enforcement
✅ 3 external beta vaults created

## Tranche 3: Mainnet Launch (40% - $60,000)
Target: October 25, 2026

Objective: Security hardening, audit, mainnet deployment, and public launch.

Deliverables
Deliverable	            Description	                                            Budget	Status
Security Hardening	    Address all identified vulnerabilities	                $10,000	⏳ Planned
Security Audit	        Professional audit (via SCF Audit Bank)	                $0	    ⏳ Planned
Mainnet Deployment	    Deploy factory and vault contracts to mainnet	        $15,000	⏳ Planned
DeFi Connectors	        Integration with Stellar DEX	                        $15,000	⏳ Planned
Enterprise Features	    Compliance reporting, audit trails, advanced policies	$10,000	⏳ Planned
Documentation & Launch	Complete user/developer docs, public launch	            $10,000	⏳ Planned

# Technical Milestones
- Internal security review
- Submit for SCF Audit Bank
- Address all audit findings
- Mainnet contract deployment
- Production dashboard launch
- Stellar DEX swap integration
- Transaction export (CSV/JSON)
- On-chain audit trail events
- SDK release (TypeScript)
- API documentation
- User guides and tutorials

# Success Criteria
✅ Security audit passed (no critical issues)
✅ Mainnet contracts live and verified
✅ 20+ vaults created
✅ At least 1 DeFi integration operational
✅ Full documentation published

## Future Phases (Post-SCF)

# Phase 5: DeFi Strategy Vaults (Q1 2027)
- Automated yield strategies
- Lending protocol integration (if available on Stellar)
- Liquidity provision management
- Strategy templates

# Phase 6: Cross-Border Automation (Q2 2027)
- Scheduled/recurring payments
- FX conversion rules
- Anchor integration for fiat settlement
- Payroll automation

# Phase 7: Multi-Chain Expansion (Q3+ 2027)
- Cross-chain vault management
- Bridge integrations
- Unified treasury across chains
- EVM compatibility layer

# Timeline Summary
2026
├── April
│   └── ✅ SCF #43 Submission (Complete)
│
├── May (Tranche 0 + 1)
│   ├── Award decision
│   ├── OpenZeppelin integration
│   └── Policy engine development
│
├── June-July (Tranche 2)
│   ├── 5-role system implementation
│   ├── Enterprise dashboard
│   ├── USDC optimization
│   └── Beta partner onboarding
│
├── August-September (Tranche 3 Prep)
│   ├── Security hardening
│   ├── Audit submission
│   └── DeFi connector development
│
└── October (Tranche 3 Complete)
    ├── Mainnet launch
    ├── Public release
    └── 20+ vaults target

2027
├── Q1: DeFi Strategy Vaults
├── Q2: Cross-Border Automation
└── Q3+: Multi-Chain Expansion

## Budget Summary

Tranche	    Percentage	Amount	    Focus
Tranche 0	10%	        $15,000	    Kickoff, setup
Tranche 1	20%	        $30,000	    OpenZeppelin, policies
Tranche 2	30%	        $45,000	    Roles, dashboard, beta
Tranche 3	40%	        $60,000	    Audit, mainnet, launch
Total	    100%	    $150,000	

# Budget Allocation
- Engineering: 60% ($90,000)
- Security Audit: Via SCF Audit Bank ($0)
- Design/UX: 10% ($15,000)
- Testing/QA: 15% ($22,500)
- Documentation: 5% ($7,500)
- Go-to-Market: 10% ($15,000)

# Risk Mitigation
Risk	                                Mitigation
OpenZeppelin integration complexity	    Early prototyping in Tranche 1
Audit delays	                        Submit early, maintain buffer time
Beta partner availability	            Identify 5+ candidates, need 3
Mainnet launch issues	                Extensive testnet validation
Market conditions	                    Focus on enterprise use cases

## Success Metrics
# Tranche 1 (May 2026)
- OpenZeppelin framework integrated
- 2+ policy types working
- Test coverage >70%
# Tranche 2 (July 2026)
- 5-role system complete
- 3+ beta vaults active
- Test coverage >80%
# Tranche 3 (October 2026)
- Audit passed
- Mainnet live
- 20+ vaults created
- $1M+ TVL (stretch goal)
# 12-Month Post-Launch
- 100+ active vaults
- $10M+ TVL
- 3+ enterprise integrations
- SDK adoption by 5+ projects

## How to Track Progress
- GitHub Issues: All tasks tracked as issues with milestone labels
- GitHub Projects: Kanban board for each tranche
- Monthly Updates: Progress reports in GitHub Discussions
- SCF Reports: Tranche completion submissions

## Get Involved

# For Beta Partners
Interested in testing Orion Safe for your organization?
Requirements: Active Stellar/Soroban usage, feedback commitment

# For Developers
Want to contribute or integrate?
- See CONTRIBUTING.md
- Review ARCHITECTURE.md
- Join our Discord (coming soon)

# For Investors/Partners
Enterprise partnership inquiries welcome.

# Document maintained by: Orion Safe Team
Last updated: April 25, 2026
SCF Submission: #43 Open Track - $150,000 Request