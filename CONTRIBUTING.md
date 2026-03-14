# Contributing to Stellar Vault

Thank you for your interest in contributing to Stellar Vault! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Open a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Soroban CLI version, etc.)

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the feature and use case
3. Explain why it benefits Stellar Vault users

### Code Contributions

1. **Fork the repository**

2. **Create a feature branch**
 
git checkout -b feature/your-feature-name
Make your changes

Follow the code style guidelines below
Write tests for new functionality
Update documentation as needed
Run tests

cargo test

3. **Commit your changes**

git commit -m "feat: add your feature description"

## We use Conventional Commits:

- feat: new feature
- fix: bug fix
- docs: documentation
- test: tests
- refactor: code refactoring

4. **Push and create a Pull Request**

git push origin feature/your-feature-name

Pull Request Guidelines
- Clear description of changes
- Reference related issues
- Include tests for new functionality
- Update documentation if needed
- Ensure CI passes

### Code Style

## Rust (Smart Contracts)
- Follow Rust style guidelines
- Use cargo fmt for formatting
- Use cargo clippy for linting
- Document public functions with /// comments

/// Creates a new vault with the specified configuration.
///
/// # Arguments
/// * `env` - The Soroban environment
/// * `name` - Vault name (max 32 characters)
/// * `signers` - Initial signer configurations
/// * `threshold` - Required signatures for transactions
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(VaultError)` on failure
pub fn initialize(
    env: Env,
    name: Symbol,
    signers: Vec<SignerConfig>,
    threshold: u32,
) -> Result<(), VaultError> {
    // Implementation
}

## TypeScript (Dashboard/SDK)
- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting

## Development Setup
Prerequisites
- Rust 1.70+
- Soroban CLI
- Node.js 18+
- Git

## Setup Steps
Clone the repository
- git clone https://github.com/Sermium/Stellar_Vault.git
- cd Stellar_Vault
Install Rust dependencies
- cd contracts
- cargo build
Install Soroban CLI
- cargo install soroban-cli
Run tests
- cargo test

## Project Structure

stellar-vault/
├── contracts/           # Soroban smart contracts
│   ├── vault/          # Core vault contract
│   ├── policies/       # Policy contracts
│   ├── roles/          # Role management
│   └── treasury/       # Treasury operations
├── dashboard/          # React web application
├── sdk/                # TypeScript SDK
├── docs/               # Documentation
└── tests/              # Integration tests

## Questions?
- Open a GitHub Discussion for general questions
- Join our community channels (coming soon)

Thank you for contributing to Stellar Vault!