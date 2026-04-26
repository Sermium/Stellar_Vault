import React, { useState } from 'react';

import { ChevronDown, ChevronRight, ExternalLink, Copy, Check, Book, Code, Shield, Layers, Users, Clock, Coins, FileText, GitBranch } from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const Docs: React.FC = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const sections: DocSection[] = [
    { id: 'overview', title: 'Overview', icon: <Book className="w-4 h-4" /> },
    { id: 'architecture', title: 'Architecture', icon: <Layers className="w-4 h-4" /> },
    { id: 'contracts', title: 'Smart Contracts', icon: <Code className="w-4 h-4" /> },
    { id: 'features', title: 'Core Features', icon: <FileText className="w-4 h-4" /> },
    { id: 'roles', title: 'Roles & Permissions', icon: <Users className="w-4 h-4" /> },
    { id: 'locks', title: 'Time Locks & Vesting', icon: <Clock className="w-4 h-4" /> },
    { id: 'usdc', title: 'USDC Integration', icon: <Coins className="w-4 h-4" /> },
    { id: 'security', title: 'Security Model', icon: <Shield className="w-4 h-4" /> },
    { id: 'roadmap', title: 'Roadmap', icon: <GitBranch className="w-4 h-4" /> },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'rust' }) => (
    <div className="relative bg-gray-900 rounded-lg p-4 my-4 overflow-x-auto">
      <button
        onClick={() => copyToClipboard(code)}
        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white transition-colors"
      >
        {copiedText === code ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className="text-sm text-gray-300 font-mono">{code}</pre>
    </div>
  );

  const ContractAddress: React.FC<{ label: string; address: string; explorer?: boolean }> = ({ label, address, explorer }) => (
    <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3 my-2">
      <div>
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="font-mono text-sm text-white">{address}</div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => copyToClipboard(address)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          {copiedText === address ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
        {explorer && (
          <a
            href={`https://stellar.expert/explorer/testnet/contract/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Orion Safe – Multi-Signature Vault Protocol</h2>
              <p className="text-gray-300 leading-relaxed">
                Orion Safe is an enterprise-grade, multi-signature treasury platform built on Stellar's Soroban smart contract platform. 
                It provides secure, programmable vaults with configurable approval thresholds, role-based access control, 
                time-locked tokens, and vesting schedules.
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white mb-3">Key Highlights</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>M-of-N multi-signature security (e.g., 2-of-3, 3-of-5)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Proposal-based transaction workflow with approval tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Time-locked tokens with revocable/non-revocable options</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Vesting schedules with cliff periods and linear release</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Native USDC support on Stellar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Sub-second finality with ~$0.00001 transaction fees</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Use Cases</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'DAO Treasury', desc: '3-of-5 approval for fund management' },
                  { title: 'Employee Vesting', desc: '4-year vesting with 1-year cliff' },
                  { title: 'Escrow Services', desc: '2-of-2 mutual agreement execution' },
                  { title: 'Investment Funds', desc: '4-of-7 committee approval' },
                ].map((item) => (
                  <div key={item.title} className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="font-semibold text-white">{item.title}</h4>
                    <p className="text-gray-400 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Current Status</h3>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-green-400 font-semibold">Live on Testnet</span>
                </div>
                <p className="text-gray-400 text-sm">
                  SCF #43 Build Award submitted. Targeting mainnet launch Q4 2026.
                </p>
              </div>
            </div>
          </div>
        );

      case 'architecture':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">System Architecture</h2>
            
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Technology Stack</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-purple-400 font-semibold mb-2">Frontend</h4>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>React 18 + TypeScript</li>
                    <li>Tailwind CSS</li>
                    <li>Freighter SDK</li>
                    <li>Vercel Hosting</li>
                  </ul>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">Smart Contracts</h4>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>Rust + Soroban SDK</li>
                    <li>OpenZeppelin Integration</li>
                    <li>WASM Compilation</li>
                  </ul>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-2">Infrastructure</h4>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>Stellar Network</li>
                    <li>Supabase (cache + RLS)</li>
                    <li>Horizon / Soroban RPC</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Contract Hierarchy</h3>
              <div className="bg-gray-900 rounded-lg p-6 font-mono text-sm">
                <pre className="text-gray-300">
{`┌─────────────────────────────────────────────────┐
│                  Web Dashboard                   │
│         (React + TypeScript + Tailwind)          │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│              Stellar SDK / Freighter             │
│           (Transaction Signing & RPC)            │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│                Registry Contract                 │
│        (Factory versions, WASM hashes)           │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│                Factory Contract                  │
│     (Vault deployment, configuration, fees)      │
└─────────────────────┬───────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
     ┌─────────┐ ┌─────────┐ ┌─────────┐
     │ Vault 1 │ │ Vault 2 │ │ Vault N │
     └─────────┘ └─────────┘ └─────────┘`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Data Flow</h3>
              <p className="text-gray-300 mb-4">
                The vault account holds all assets and is controlled exclusively by the smart contract. 
                No single signer can move funds without meeting the approval threshold.
              </p>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                <pre className="text-gray-300">
{`User Action → Sign with Wallet → Create Proposal
                                      │
                                      ▼
                            Other Signers Approve
                                      │
                                      ▼
                         Threshold Met? ─────No────→ Wait
                                      │
                                     Yes
                                      │
                                      ▼
                            Execute Transaction
                                      │
                                      ▼
                              Stellar Network`}
                </pre>
              </div>
            </div>
          </div>
        );

      case 'contracts':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Smart Contracts</h2>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Deployed Contracts (Testnet)</h3>
              <ContractAddress 
                label="Registry Contract" 
                address="CDJCQNXYTWZ3VF2FL2MCWMZB6RPQYRAFNNO6KEKW2MN7ALXGB5SGYTJ4" 
                explorer 
              />
              <ContractAddress 
                label="Factory Contract" 
                address="CCNGOW6UCZKELBAR377HDHWAJJLKD6SJHUFCDT4UM6M2AYPSOEBYLDVA" 
                explorer 
              />
              <ContractAddress 
                label="Test Vault" 
                address="CBJ4BFOUDMQWFPCBALQTO2565STNGFMGQWDYVQ7MBWRZF5WSI2Z4VT5W" 
                explorer 
              />
              <ContractAddress 
                label="Vault WASM Hash" 
                address="f434965dafa094f90a27a09065562da9fe5aeb00f8208da1665bb4ebebe475ec" 
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Factory Contract API</h3>
              <CodeBlock code={`// Initialize factory with admin and vault WASM hash
fn initialize(env: Env, admin: Address, vault_wasm_hash: BytesN<32>);

// Create a new vault instance
fn create_vault(
    env: Env,
    name: String,
    signers: Vec<Address>,
    threshold: u32
) -> Address;

// Get factory configuration
fn get_config(env: Env) -> FactoryConfig;

// Update vault WASM for future deployments
fn update_vault_wasm(env: Env, new_wasm_hash: BytesN<32>);`} />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Vault Contract API</h3>
              <CodeBlock code={`// Create a new proposal (Transfer, TimeLock, or VestingLock)
fn create_proposal(
    env: Env,
    proposer: Address,
    proposal_type: ProposalType,
    token: Address,
    amount: i128,
    destination: Address,
    unlock_time: Option<u64>,
    cliff_time: Option<u64>,
    end_time: Option<u64>,
    release_interval: Option<u64>,
    revocable: bool
) -> u64;

// Approve a pending proposal
fn approve(env: Env, signer: Address, proposal_id: u64);

// Reject a proposal
fn reject(env: Env, signer: Address, proposal_id: u64);

// Execute a proposal after threshold is met
fn execute(env: Env, executor: Address, proposal_id: u64);

// Claim tokens from a lock (for beneficiaries)
fn claim_lock(env: Env, beneficiary: Address, lock_id: u64) -> i128;

// Cancel a revocable lock
fn cancel_lock(env: Env, admin: Address, lock_id: u64);`} />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Data Structures</h3>
              <CodeBlock code={`#[derive(Clone)]
pub struct VaultConfig {
    pub name: String,
    pub threshold: u32,
    pub signer_count: u32,
    pub proposal_count: u64,
    pub lock_count: u64,
    pub fee_amount: i128,
}

#[derive(Clone)]
pub struct Proposal {
    pub proposal_type: ProposalType,  // 0=Transfer, 1=TimeLock, 2=VestingLock
    pub proposer: Address,
    pub token: Address,
    pub amount: i128,
    pub destination: Address,
    pub approvals: Vec<Address>,
    pub rejections: Vec<Address>,
    pub executed: bool,
    pub created_at: u64,
    pub unlock_time: Option<u64>,
    pub cliff_time: Option<u64>,
    pub end_time: Option<u64>,
    pub release_interval: Option<u64>,
    pub revocable: bool,
}

#[derive(Clone)]
pub struct Lock {
    pub beneficiary: Address,
    pub token: Address,
    pub total_amount: i128,
    pub released_amount: i128,
    pub lock_type: LockType,  // TimeLock or Vesting
    pub start_time: u64,
    pub unlock_time: u64,
    pub cliff_time: Option<u64>,
    pub end_time: Option<u64>,
    pub release_interval: Option<u64>,
    pub revocable: bool,
    pub active: bool,
}`} />
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Core Features</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Multi-Signature Security</h3>
              <p className="text-gray-300 mb-4">
                Configure any M-of-N approval threshold. No single signer can move funds without 
                meeting the required number of approvals.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['2-of-3', '3-of-5', '4-of-7', '5-of-9'].map((config) => (
                  <div key={config} className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <span className="text-purple-400 font-mono">{config}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Proposal System</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">1</div>
                  <div>
                    <h4 className="text-white font-semibold">Create Proposal</h4>
                    <p className="text-gray-400 text-sm">Any signer can propose a transfer, time-lock, or vesting schedule</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">2</div>
                  <div>
                    <h4 className="text-white font-semibold">Collect Approvals</h4>
                    <p className="text-gray-400 text-sm">Other signers review and approve or reject the proposal</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">3</div>
                  <div>
                    <h4 className="text-white font-semibold">Execute</h4>
                    <p className="text-gray-400 text-sm">Once threshold is met, any signer can execute the transaction</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Proposal Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">💸</div>
                  <h4 className="text-white font-semibold">Transfer</h4>
                  <p className="text-gray-400 text-sm">Immediate token transfer to any address after approval</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">🔒</div>
                  <h4 className="text-white font-semibold">Time Lock</h4>
                  <p className="text-gray-400 text-sm">Lock tokens until a specific unlock date</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="text-2xl mb-2">📈</div>
                  <h4 className="text-white font-semibold">Vesting</h4>
                  <p className="text-gray-400 text-sm">Gradual release with cliff and linear vesting</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Dashboard Views</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  'Dashboard Overview',
                  'Assets & Balances',
                  'Transactions',
                  'Members',
                  'Time Locks',
                  'Vesting Schedules',
                  'Contacts',
                  'Settings'
                ].map((view) => (
                  <div key={view} className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <span className="text-gray-300 text-sm">{view}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'roles':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Roles & Permissions</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Current Role System (v1.0)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Role</th>
                      <th className="text-left py-3 px-4 text-gray-400">Value</th>
                      <th className="text-left py-3 px-4 text-gray-400">Permissions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-purple-400 font-semibold">SuperAdmin</td>
                      <td className="py-3 px-4 text-gray-300">0</td>
                      <td className="py-3 px-4 text-gray-300">Full control: manage signers, update threshold, cancel locks</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-blue-400 font-semibold">Admin</td>
                      <td className="py-3 px-4 text-gray-300">1</td>
                      <td className="py-3 px-4 text-gray-300">Create proposals, approve, execute, manage members</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-green-400 font-semibold">Executor</td>
                      <td className="py-3 px-4 text-gray-300">2</td>
                      <td className="py-3 px-4 text-gray-300">Approve proposals, execute approved transactions</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Planned Extended Roles (v2.0)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Role</th>
                      <th className="text-left py-3 px-4 text-gray-400">Create</th>
                      <th className="text-left py-3 px-4 text-gray-400">Approve</th>
                      <th className="text-left py-3 px-4 text-gray-400">Execute</th>
                      <th className="text-left py-3 px-4 text-gray-400">Constraints</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-purple-400">Admin</td>
                      <td className="py-3 px-4 text-green-400">✓</td>
                      <td className="py-3 px-4 text-green-400">✓</td>
                      <td className="py-3 px-4 text-green-400">✓</td>
                      <td className="py-3 px-4 text-gray-400">None</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-blue-400">Proposer</td>
                      <td className="py-3 px-4 text-green-400">✓</td>
                      <td className="py-3 px-4 text-red-400">✗</td>
                      <td className="py-3 px-4 text-red-400">✗</td>
                      <td className="py-3 px-4 text-gray-400">Max amount, allowed tokens</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-cyan-400">Voter</td>
                      <td className="py-3 px-4 text-red-400">✗</td>
                      <td className="py-3 px-4 text-green-400">✓</td>
                      <td className="py-3 px-4 text-red-400">✗</td>
                      <td className="py-3 px-4 text-gray-400">Vote weight</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-green-400">Executor</td>
                      <td className="py-3 px-4 text-red-400">✗</td>
                      <td className="py-3 px-4 text-red-400">✗</td>
                      <td className="py-3 px-4 text-green-400">✓</td>
                      <td className="py-3 px-4 text-gray-400">Time windows</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-yellow-400">Spender</td>
                      <td className="py-3 px-4 text-green-400">✓</td>
                      <td className="py-3 px-4 text-red-400">✗</td>
                      <td className="py-3 px-4 text-green-400">✓</td>
                      <td className="py-3 px-4 text-gray-400">Daily limit, destinations</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-400 text-sm mt-4">
                Coming in Tranche 2 with OpenZeppelin Smart Account integration.
              </p>
            </div>
          </div>
        );

      case 'locks':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Time Locks & Vesting</h2>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Time Lock</h3>
              <p className="text-gray-300 mb-4">
                Lock tokens until a specific date. The beneficiary can claim the full amount only after the unlock time.
              </p>
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-400">Lock Amount</span>
                  <span className="text-white font-mono">10,000 USDC</span>
                </div>
                <div className="relative h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-purple-500 w-1/3"></div>
                  <div className="absolute inset-y-0 left-1/3 right-0 bg-gray-600 flex items-center justify-center">
                    <span className="text-xs text-gray-300">🔒 Locked until unlock_time</span>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-400">
                  <span>Start</span>
                  <span>Unlock Date</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vesting Schedule</h3>
              <p className="text-gray-300 mb-4">
                Gradual token release over time with optional cliff period. Tokens vest linearly between cliff and end date.
              </p>
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-400">Total Vesting</span>
                  <span className="text-white font-mono">100,000 XLM</span>
                </div>
                <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-red-500/50 w-1/4 flex items-center justify-center">
                    <span className="text-xs text-white">Cliff</span>
                  </div>
                  <div className="absolute inset-y-0 left-1/4 bg-gradient-to-r from-purple-500 to-green-500 w-1/2"></div>
                  <div className="absolute inset-y-0 right-0 bg-green-500/30 w-1/4 flex items-center justify-center">
                    <span className="text-xs text-white">100%</span>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-400">
                  <span>Start</span>
                  <span>Cliff (1yr)</span>
                  <span>End (4yr)</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vesting Calculation</h3>
              <CodeBlock code={`// Calculate claimable amount for vesting lock
fn get_claimable_amount(lock: &Lock, current_time: u64) -> i128 {
    // Before cliff: nothing claimable
    if let Some(cliff) = lock.cliff_time {
        if current_time < cliff {
            return 0;
        }
    }
    
    // After end time: full amount
    if let Some(end) = lock.end_time {
        if current_time >= end {
            return lock.total_amount - lock.released_amount;
        }
    }
    
    // Linear vesting calculation
    let start = lock.cliff_time.unwrap_or(lock.start_time);
    let end = lock.end_time.unwrap_or(lock.unlock_time);
    let elapsed = current_time - start;
    let duration = end - start;
    
    let vested = (lock.total_amount * elapsed as i128) / duration as i128;
    vested - lock.released_amount
}`} />
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Lock Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-green-400 font-semibold mb-2">Revocable</h4>
                  <p className="text-gray-400 text-sm">
                    Admin can cancel the lock and return unvested tokens to the vault. 
                    Good for employee vesting with termination clause.
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-red-400 font-semibold mb-2">Non-Revocable</h4>
                  <p className="text-gray-400 text-sm">
                    Lock cannot be cancelled once created. Provides guaranteed 
                    vesting for beneficiaries.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'usdc':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">USDC Integration</h2>

            <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">$</div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Native USDC on Stellar</h3>
                  <p className="text-gray-400 text-sm">Circle's official stablecoin integration</p>
                </div>
              </div>
              <p className="text-gray-300">
                Orion Safe supports native USDC transfers, time-locks, and vesting schedules. 
                No wrapped tokens or bridges required.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Contract Addresses</h3>
              <ContractAddress 
                label="USDC (Mainnet)" 
                address="CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75" 
              />
              <ContractAddress 
                label="USDC (Testnet)" 
                address="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA" 
                explorer
              />
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">USDC Features</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <div>
                    <span className="text-white font-semibold">Direct Transfers</span>
                    <p className="text-gray-400 text-sm">Send USDC to any Stellar address via multi-sig approval</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <div>
                    <span className="text-white font-semibold">Time-Locked USDC</span>
                    <p className="text-gray-400 text-sm">Lock USDC for escrow, milestone payments, or scheduled releases</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <div>
                    <span className="text-white font-semibold">USDC Vesting</span>
                    <p className="text-gray-400 text-sm">Create salary or grant vesting schedules in stable dollars</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 mt-1">✓</span>
                  <div>
                    <span className="text-white font-semibold">Trustline Management</span>
                    <p className="text-gray-400 text-sm">Automatic trustline creation for USDC recipients</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Getting Testnet USDC</h3>
              <ol className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="bg-purple-500/20 text-purple-400 rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                  <span>Add USDC trustline to your wallet (use Freighter "Manage Assets")</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-purple-500/20 text-purple-400 rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                  <span>Visit the Circle USDC faucet for Stellar testnet</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-purple-500/20 text-purple-400 rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                  <span>Enter your testnet address and request tokens</span>
                </li>
              </ol>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Security Model</h2>

            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4">Security Principles</h3>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <span className="text-white font-semibold">On-Chain Enforcement</span>
                    <p className="text-gray-400 text-sm">All access control is enforced by the smart contract. The database is a cache only.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <span className="text-white font-semibold">No Single Point of Failure</span>
                    <p className="text-gray-400 text-sm">M-of-N threshold ensures no single compromised key can move funds.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <span className="text-white font-semibold">Immutable Locks</span>
                    <p className="text-gray-400 text-sm">Non-revocable locks cannot be cancelled, even by admins.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Threat Mitigations</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400">Threat</th>
                      <th className="text-left py-3 px-4 text-gray-400">Mitigation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-red-400">Compromised Signer</td>
                      <td className="py-3 px-4 text-gray-300">Multi-sig threshold prevents single-key compromise</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-red-400">Malicious Proposal</td>
                      <td className="py-3 px-4 text-gray-300">Requires multiple approvals; signers can reject</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-red-400">Unauthorized Spend</td>
                      <td className="py-3 px-4 text-gray-300">Only approved proposals can execute; role checks enforced</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-4 text-red-400">Contract Bugs</td>
                      <td className="py-3 px-4 text-gray-300">Planned professional audit before mainnet</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-red-400">Key Loss</td>
                      <td className="py-3 px-4 text-gray-300">M-of-N allows recovery if some keys are lost (within threshold)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Database Security</h3>
              <p className="text-gray-300 mb-4">
                Supabase with Row-Level Security (RLS) policies on all tables. The database is a read-through 
                cache only; the blockchain is the source of truth.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['vaults', 'vault_signers', 'proposals', 'locks', 'transactions', 'activity_log', 'notifications', 'app_config'].map((table) => (
                  <div key={table} className="bg-gray-900/50 rounded-lg p-2 text-center">
                    <span className="text-green-400 text-xs">RLS ✓</span>
                    <div className="text-gray-300 text-sm font-mono">{table}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Planned Security Enhancements</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">⏳</span>
                  <span>OpenZeppelin Smart Account integration (Tranche 1)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">⏳</span>
                  <span>Spending limit policies (Tranche 1)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">⏳</span>
                  <span>Professional security audit (Tranche 3)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">⏳</span>
                  <span>Bug bounty program (Post-mainnet)</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 'roadmap':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Development Roadmap</h2>

            <div className="relative">
              {/* Timeline */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-purple-500 to-gray-600"></div>

              {/* Completed */}
              <div className="relative pl-12 pb-8">
                <div className="absolute left-2 w-5 h-5 rounded-full bg-green-500 border-4 border-gray-900"></div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400 font-semibold">Phase 0: Foundation</span>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">COMPLETE</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">Feb - Apr 2026</p>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>✓ Core vault smart contract</li>
                    <li>✓ Factory deployment system</li>
                    <li>✓ Multi-sig proposal workflow</li>
                    <li>✓ Time-lock & vesting features</li>
                    <li>✓ React dashboard with wallet integrations</li>
                    <li>✓ Testnet deployment</li>
                    <li>✓ SCF #43 submission</li>
                  </ul>
                </div>
              </div>

              {/* Tranche 1 */}
              <div className="relative pl-12 pb-8">
                <div className="absolute left-2 w-5 h-5 rounded-full bg-purple-500 border-4 border-gray-900"></div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-purple-400 font-semibold">Tranche 1: Policy Engine</span>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">$30k - May 2026</span>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>○ OpenZeppelin Smart Account integration</li>
                    <li>○ SpendLimitPolicy contract</li>
                    <li>○ AllowlistPolicy contract</li>
                    <li>○ Enhanced testnet vaults</li>
                    <li>○ Policy engine documentation</li>
                  </ul>
                </div>
              </div>

              {/* Tranche 2 */}
              <div className="relative pl-12 pb-8">
                <div className="absolute left-2 w-5 h-5 rounded-full bg-blue-500 border-4 border-gray-900"></div>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400 font-semibold">Tranche 2: Enterprise Features</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">$45k - July 2026</span>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>○ Full 5-role permission system</li>
                    <li>○ Enterprise dashboard with policy configuration</li>
                    <li>○ Native USDC optimization</li>
                    <li>○ Beta onboarding (3+ external vaults)</li>
                  </ul>
                </div>
              </div>

              {/* Tranche 3 */}
              <div className="relative pl-12 pb-8">
                <div className="absolute left-2 w-5 h-5 rounded-full bg-gray-500 border-4 border-gray-900"></div>
                <div className="bg-gray-800/50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-300 font-semibold">Tranche 3: Mainnet Launch</span>
                    <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded">$60k - Oct 2026</span>
                  </div>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li>○ Security hardening</li>
                    <li>○ Professional security audit</li>
                    <li>○ Mainnet deployment</li>
                    <li>○ Stellar DEX integration</li>
                    <li>○ Enterprise compliance reporting</li>
                    <li>○ Full documentation & SDK</li>
                  </ul>
                </div>
              </div>

              {/* Future */}
              <div className="relative pl-12">
                <div className="absolute left-2 w-5 h-5 rounded-full bg-gray-700 border-4 border-gray-900"></div>
                <div className="bg-gray-800/30 rounded-xl p-6 border border-dashed border-gray-700">
                  <span className="text-gray-500 font-semibold">Future Phases</span>
                  <ul className="text-gray-500 text-sm space-y-1 mt-2">
                    <li>• DeFi strategy vaults</li>
                    <li>• Cross-border automation</li>
                    <li>• Multi-chain expansion</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Success Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">20+</div>
                  <div className="text-gray-400 text-sm">Mainnet Vaults</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">$1M+</div>
                  <div className="text-gray-400 text-sm">TVL Target</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">3+</div>
                  <div className="text-gray-400 text-sm">Enterprise Integrations</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-cyan-400">80%+</div>
                  <div className="text-gray-400 text-sm">Test Coverage</div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 min-h-screen bg-gray-900/50 border-r border-gray-800 p-4 sticky top-0">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Documentation</h1>
            <p className="text-gray-400 text-sm">v1.1 • April 2026</p>
          </div>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === section.id
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {section.icon}
                <span>{section.title}</span>
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t border-gray-800">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Resources</h3>
            <div className="space-y-2">
              <a
                href="https://github.com/Sermium/Stellar_Vault"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                GitHub Repository
              </a>
              <a
                href="https://stellar.expert/explorer/testnet/contract/CBJ4BFOUDMQWFPCBALQTO2565STNGFMGQWDYVQ7MBWRZF5WSI2Z4VT5W"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Explorer (Testnet)
              </a>
              <a
                href="https://soroban.stellar.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Soroban Docs
              </a>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 max-w-4xl">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Docs;