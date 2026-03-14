# Stellar Vault

**Enterprise-Grade Treasury Infrastructure for Stellar**

[![Built on Soroban](https://img.shields.io/badge/Built%20on-Soroban-blue)](https://soroban.stellar.org/)
[![OpenZeppelin](https://img.shields.io/badge/Powered%20by-OpenZeppelin-purple)](https://github.com/OpenZeppelin/stellar-contracts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Stellar Vault is the first enterprise-grade treasury management platform built natively on Soroban, leveraging OpenZeppelin's Smart Account framework. We bring the security and functionality of Safe (Ethereum) and Squads (Solana) to the Stellar ecosystem.

---

## The Problem

Stellar has unprecedented enterprise adoption — MoneyGram, Circle (USDC), Franklin Templeton, UNHCR, and dozens of anchors and fintechs are building on Stellar. Yet **no enterprise-grade treasury management solution exists**.

Current options like LOBSTR and Solar offer only basic multisig with:
- ❌ No programmable spending policies
- ❌ No role-based access control
- ❌ No DeFi integration
- ❌ No compliance/audit tools

**On Ethereum:** Safe secures $100B+
**On Solana:** Squads secures $10B+
**On Stellar:** Nothing. Until now.

---

## The Solution

Stellar Vault provides a complete treasury management stack:

### 🔐 Smart Accounts
Multi-signature vaults built on OpenZeppelin's audited Smart Account framework with flexible signer configurations (Ed25519, P256, Soroban accounts).

### 📜 Policy Engine
Programmable spending controls enforced on-chain:
- Daily/weekly/monthly spending limits
- Per-transaction maximums
- Time locks for high-value transfers
- Destination allowlists/blocklists
- Rate limiting

### 👥 Role-Based Access Control
Enterprise-ready permission system:
| Role | Permissions |
|------|-------------|
| Admin | Modify policies, manage members |
| Proposer | Create transaction proposals |
| Voter | Approve/reject transactions |
| Executor | Execute approved transactions |
| Spender | Direct transfers within policy limits |

### 💱 Native USDC Integration
First-class support for Stellar's dominant stablecoin:
- Optimized USDC operations
- Batch payment support
- MoneyGram ramp compatibility

### 🏢 Enterprise Suite
Built for institutional requirements:
- On-chain audit trails
- Compliance reporting
- Transaction history export

---

## Architecture

For detailed technical documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Why Stellar?

| Stellar Feature           | Vault Application              |
|---------------------------|--------------------------------|
| Sub-second finality       | Real-time treasury operations  |
| $0.00001 fees             | Cost-effective for enterprises |
| Native multisig           | Security foundation            |
| Soroban smart contracts   | Programmable policies          |
| Native USDC               | Seamless stablecoin treasury   |
| MoneyGram integration     | Built-in fiat on/off ramps     |
| Regulatory alignment      | Enterprise compliance ready    |

---

## Roadmap

| Phase       | Timeline  | Milestone                                                            |
|-------------|-----------|----------------------------------------------------------------------|
| **Phase 1** | Month 1-2 | Architecture, OZ integration, testnet contracts                      |
| **Phase 2** | Month 3-4 | Policy engine, Role system, dashboard MVP                            |
| **Phase 3** | Month 7+  | USDC integration, Enterprise Features, beta partners, Mainnet launch |

See [ROADMAP.md](./ROADMAP.md) for detailed milestones.

---

## Project Structure

stellar-vault/
├── contracts/
│   ├── vault/              # Core vault contract
│   ├── policies/           # Policy contracts
│   │   ├── spend-limit/
│   │   ├── time-lock/
│   │   ├── rate-limit/
│   │   └── allowlist/
│   ├── roles/              # Role management
│   └── treasury/           # Treasury operations
├── dashboard/              # Web application
├── sdk/                    # JavaScript/TypeScript SDK
├── docs/                   # Documentation
└── tests/                  # Integration tests

---

## Getting Started
> ⚠️ **Note:** Stellar Vault is currently in development. Testnet contracts coming soon.

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (for smart contracts)
- [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup)
- [Node.js](https://nodejs.org/) 18+ (for dashboard)

### Target Users
Segment	                    Use Case
Anchors & Fintechs	        Operational treasury, reserve management
NGOs & Aid Organizations	Multi-party fund disbursement
DeFi Protocols	            Protocol treasury management
DAOs	                    Governance + treasury
Enterprises	                Corporate treasury, payroll
Fund Managers	            Tokenized fund administration

### Built With
Soroban — Stellar's smart contract platform
OpenZeppelin Smart Accounts — Security framework
Stellar SDK — Blockchain interaction
React — Dashboard frontend
Freighter — Wallet integration

### Contributing
We welcome contributions! Please see CONTRIBUTING.md for guidelines

### Security
Stellar Vault takes security seriously:

- Built on OpenZeppelin's audited framework
- Professional security audit before mainnet launch
- Bug bounty program (coming soon)

To report a security vulnerability, please email security@stellarvault.io (or open a private security advisory).

### License
This project is licensed under the MIT License — see the LICENSE file for details.

### Links
- Technical Architecture
- Roadmap
- OpenZeppelin Stellar Contracts
- Soroban Documentation

### Acknowledgments
- Stellar Development Foundation — For the SCF grant program
- OpenZeppelin — For the Smart Account framework
- Circle — For native USDC on Stellar





New Contract ID:

CDH3LYVDC22E2PF2JMSEHVEA3XI7YU2ICAVNUGC5O6EZ4WC3UWBOPF4P
