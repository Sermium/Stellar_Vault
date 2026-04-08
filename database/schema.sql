-- ============================================================================
-- STELLAR VAULT DATABASE SCHEMA (Supabase/PostgreSQL)
-- ============================================================================
-- Indexer populates this from Soroban events.
-- Frontend reads from DB, writes to contracts.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Factories
CREATE TABLE IF NOT EXISTS factories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(56) UNIQUE NOT NULL,
    admin_address VARCHAR(56) NOT NULL,
    wasm_hash VARCHAR(64) NOT NULL,
    fee_amount BIGINT DEFAULT 0,
    fee_token VARCHAR(56),
    fee_recipient VARCHAR(56),
    total_vaults INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vaults
CREATE TABLE IF NOT EXISTS vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(56) UNIQUE NOT NULL,
    factory_address VARCHAR(56) NOT NULL,
    name VARCHAR(100) NOT NULL,
    creator_address VARCHAR(56) NOT NULL,
    threshold INTEGER NOT NULL DEFAULT 1,
    signer_count INTEGER NOT NULL DEFAULT 1,
    proposal_count INTEGER DEFAULT 0,
    lock_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vault Signers
CREATE TABLE IF NOT EXISTS vault_signers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_address VARCHAR(56) NOT NULL,
    signer_address VARCHAR(56) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'Executor',
    is_active BOOLEAN DEFAULT true,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    UNIQUE(vault_address, signer_address)
);

-- Proposals
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_address VARCHAR(56) NOT NULL,
    proposal_id BIGINT NOT NULL,
    proposal_type INTEGER NOT NULL,
    proposer_address VARCHAR(56) NOT NULL,
    token_address VARCHAR(56),
    recipient_address VARCHAR(56),
    amount DECIMAL(38,0),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    cliff_time TIMESTAMPTZ,
    release_intervals BIGINT,
    revocable BOOLEAN DEFAULT false,
    description VARCHAR(100),
    approval_count INTEGER DEFAULT 1,
    rejection_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Pending',
    executed_at TIMESTAMPTZ,
    result_lock_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vault_address, proposal_id)
);

-- Proposal Votes
CREATE TABLE IF NOT EXISTS proposal_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_address VARCHAR(56) NOT NULL,
    proposal_id BIGINT NOT NULL,
    signer_address VARCHAR(56) NOT NULL,
    vote_type VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vault_address, proposal_id, signer_address)
);

-- Locks
CREATE TABLE IF NOT EXISTS locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_address VARCHAR(56) NOT NULL,
    lock_id BIGINT NOT NULL,
    lock_type INTEGER NOT NULL,
    beneficiary_address VARCHAR(56) NOT NULL,
    token_address VARCHAR(56) NOT NULL,
    total_amount DECIMAL(38,0) NOT NULL,
    released_amount DECIMAL(38,0) DEFAULT 0,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    cliff_time TIMESTAMPTZ,
    release_intervals BIGINT DEFAULT 0,
    revocable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vault_address, lock_id)
);

-- Lock Claims
CREATE TABLE IF NOT EXISTS lock_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_address VARCHAR(56) NOT NULL,
    lock_id BIGINT NOT NULL,
    claimer_address VARCHAR(56) NOT NULL,
    amount DECIMAL(38,0) NOT NULL,
    tx_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events Log (for replay/debugging)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_sequence BIGINT NOT NULL,
    tx_hash VARCHAR(64) NOT NULL,
    contract_address VARCHAR(56) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (optional - for display names)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    address VARCHAR(56) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_address VARCHAR(56) NOT NULL,
    contact_address VARCHAR(56) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_address, contact_address)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vaults_creator ON vaults(creator_address);
CREATE INDEX IF NOT EXISTS idx_vaults_factory ON vaults(factory_address);
CREATE INDEX IF NOT EXISTS idx_vault_signers_signer ON vault_signers(signer_address);
CREATE INDEX IF NOT EXISTS idx_vault_signers_vault ON vault_signers(vault_address);
CREATE INDEX IF NOT EXISTS idx_proposals_vault ON proposals(vault_address);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_locks_vault ON locks(vault_address);
CREATE INDEX IF NOT EXISTS idx_locks_beneficiary ON locks(beneficiary_address);
CREATE INDEX IF NOT EXISTS idx_locks_active ON locks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_events_contract ON events(contract_address);
CREATE INDEX IF NOT EXISTS idx_events_unprocessed ON events(processed) WHERE processed = false;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;

$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS tr_vaults_updated ON vaults;
CREATE TRIGGER tr_vaults_updated BEFORE UPDATE ON vaults FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_proposals_updated ON proposals;
CREATE TRIGGER tr_proposals_updated BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_locks_updated ON locks;
CREATE TRIGGER tr_locks_updated BEFORE UPDATE ON locks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW v_user_vaults AS
SELECT 
    vs.signer_address,
    vs.role,
    v.*
FROM vault_signers vs
JOIN vaults v ON vs.vault_address = v.address
WHERE vs.is_active = true AND v.is_active = true;

CREATE OR REPLACE VIEW v_pending_proposals AS
SELECT 
    p.*,
    v.name as vault_name,
    v.threshold
FROM proposals p
JOIN vaults v ON p.vault_address = v.address
WHERE p.status = 'Pending';

CREATE OR REPLACE VIEW v_active_locks AS
SELECT 
    l.*,
    v.name as vault_name
FROM locks l
JOIN vaults v ON l.vault_address = v.address
WHERE l.is_active = true;

CREATE OR REPLACE VIEW v_beneficiary_locks AS
SELECT 
    l.beneficiary_address,
    l.*,
    v.name as vault_name
FROM locks l
JOIN vaults v ON l.vault_address = v.address
WHERE l.is_active = true;
-- =============================================================================
-- CONTRACT CONFIGURATION (for versioning and deployment management)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contract_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_type VARCHAR(50) NOT NULL, -- 'registry', 'factory', 'vault_wasm'
    network VARCHAR(20) NOT NULL DEFAULT 'testnet', -- 'testnet', 'mainnet'
    version INTEGER NOT NULL DEFAULT 1,
    address VARCHAR(56), -- Contract address (null for WASM hashes)
    wasm_hash VARCHAR(64), -- WASM hash (for uploadable contracts)
    is_active BOOLEAN DEFAULT true,
    capabilities JSONB DEFAULT '[]'::jsonb, -- Factory capabilities
    deployed_at TIMESTAMPTZ DEFAULT NOW(),
    deployed_by VARCHAR(56), -- Admin address who deployed
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_type, network, version)
);

CREATE INDEX idx_deployments_type_network ON contract_deployments(contract_type, network);
CREATE INDEX idx_deployments_active ON contract_deployments(is_active) WHERE is_active = true;

CREATE TRIGGER update_contract_deployments_updated_at
    BEFORE UPDATE ON contract_deployments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- View for current active contracts per network
CREATE OR REPLACE VIEW active_contracts AS
SELECT 
    contract_type,
    network,
    version,
    address,
    wasm_hash,
    capabilities,
    deployed_at
FROM contract_deployments
WHERE is_active = true
ORDER BY contract_type, network, version DESC;

-- =============================================================================
-- APP CONFIGURATION (for dynamic settings)
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network VARCHAR(20) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_by VARCHAR(56),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(network, key)
);

CREATE TRIGGER update_app_config_updated_at
    BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

