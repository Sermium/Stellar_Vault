#### Stellar Vault — MoSCoW Prioritization

# Stellar Vault — MoSCoW Prioritization

## Must Have (MVP)

- [ ] Basic Vault Contract (M-of-N multisig)
- [ ] Signer Management (add/remove/threshold)
- [ ] Transaction Proposals
- [ ] Approval Workflow
- [ ] Transaction Execution
- [ ] Spend Limit Policy
- [ ] USDC Support
- [ ] Basic Dashboard
- [ ] Freighter Integration

## Should Have

- [ ] Time Lock Policy
- [ ] Allowlist Policy
- [ ] Role System (Admin/Proposer/Voter/Executor/Spender)
- [ ] Transaction History
- [ ] Batch Transfers
- [ ] Export Data (CSV/JSON)

## Could Have

- [ ] Rate Limit Policy
- [ ] Stellar DEX Integration
- [ ] Email Notifications
- [ ] Mobile Responsive Dashboard
- [ ] TypeScript SDK
- [ ] Recurring Payments

## Won't Have (This Phase)

- Multi-chain support
- Yield strategies
- Fiat on/off ramp integration
- Mobile app
- Hardware wallet support

### Must Have (MVP - Critical for launch)
These are non-negotiable for the first release:

Feature	                    Description	                                Deliverable
Basic Vault Contract	    Create vault with M-of-N multisig	        Soroban contract
Signer Management	        Add/remove signers, change threshold	    Soroban contract
Transaction Proposals	    Propose transactions for approval	        Soroban contract
Approval Workflow	        Vote yes/no on pending transactions	        Soroban contract
Transaction Execution	    Execute approved transactions	            Soroban contract
Spend Limit Policy	        Daily/per-tx spending limits	            Policy contract
USDC Support	            Transfer USDC from vault	                Integration
Basic Dashboard	            Create vault, propose, approve, execute	    React app
Freighter Integration	    Connect wallet, sign transactions	        React app

### Should Have (Important but not critical for MVP)
Include if time permits in initial release:

Feature	                Description	                                Deliverable
Time Lock Policy	    Delay for high-value transactions	        Policy contract
Allowlist Policy	    Approved destination addresses	            Policy contract
Role System	            Admin/Proposer/Voter/Executor/Spender	    Contract module
Transaction History	    View past transactions	                    Dashboard
Batch Transfers	        Multiple payments in one transaction	    Contract function
Export Data	            CSV/JSON export for compliance	            Dashboard

### Could Have (Nice to have)
Future enhancements after MVP:

Feature	                    Description	                            Deliverable
Rate Limit Policy	        Max transactions per time period	    Policy contract
Stellar DEX Integration	    Swap tokens from vault	                Contract module
Email Notifications	        Alert signers of pending approvals	    Backend service
Mobile Responsive	        Dashboard works on mobile	            Dashboard
SDK/API	                    TypeScript SDK for developers	        npm package
Recurring Payments	        Scheduled automatic transfers	        Contract module

### Won't Have (Not in scope for now)
Explicitly out of scope for this phase:

Feature	                        Reason
Multi-chain support	            Future phase
Yield strategies	            Future phase
Fiat on/off ramp integration	Requires anchor partnerships
Mobile app	                    Web-first approach
Hardware wallet support	        After Freighter works