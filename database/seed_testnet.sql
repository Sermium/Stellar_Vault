-- =============================================================================
-- SEED DATA: Testnet Contract Deployments (April 2026)
-- =============================================================================

-- Insert current testnet deployments
INSERT INTO contract_deployments (contract_type, network, version, address, wasm_hash, is_active, deployed_by, capabilities, metadata)
VALUES 
    (
        'registry', 
        'testnet', 
        1, 
        'CDJCQNXYTWZ3VF2FL2MCWMZB6RPQYRAFNNO6KEKW2MN7ALXGB5SGYTJ4',
        'c5274ab0050e2e6f9275d730e4c58917228254877e12a359fe1c1c0fc5eab92a',
        true,
        'GAKGT2Y47BCTOTBREDAUJFPYVR2AU4G2ELY4QNKIPTCTAS7QZPXFEFZO',
        '[]'::jsonb,
        '{"tx_hash": "fbbce06dea4e7b4ae4e7b633e8ad284c93f141e44c2a59401357f22353e4264d"}'::jsonb
    ),
    (
        'factory', 
        'testnet', 
        1, 
        'CBHCDXMDDE6ROMMZFHS5P4LT2JNDIWJENA3UQMRV2OF2QX6WSOXRQJPP',
        'f7b0c925041ecdec1ff0b6c3fba4e33f68d8f47a6466d988578e3db493165a98',
        true,
        'GAKGT2Y47BCTOTBREDAUJFPYVR2AU4G2ELY4QNKIPTCTAS7QZPXFEFZO',
        '[0,1,2,3,4,5,6,7]'::jsonb,
        '{"tx_hash": "7d1a9c0eda5273d2ec5662e1493a5585a1bc01b5760c2eb01b1bf8aa1a20a8db", "fee_amount": 100000000}'::jsonb
    ),
    (
        'vault_wasm', 
        'testnet', 
        1, 
        NULL,
        'b91b39b1a9550d09138234e09ef306edd265383db6a919ea21a04787840cc4d9',
        true,
        'GAKGT2Y47BCTOTBREDAUJFPYVR2AU4G2ELY4QNKIPTCTAS7QZPXFEFZO',
        '[]'::jsonb,
        '{"tx_hash": "7643b6311deac3255ae63a1cd068ed75aa332faff3ebacda0d72acd5e60a271b"}'::jsonb
    )
ON CONFLICT (contract_type, network, version) DO UPDATE SET
    address = EXCLUDED.address,
    wasm_hash = EXCLUDED.wasm_hash,
    is_active = EXCLUDED.is_active,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- Insert app configuration
INSERT INTO app_config (network, key, value, description)
VALUES 
    ('testnet', 'horizon_url', 'https://horizon-testnet.stellar.org', 'Stellar Horizon API URL'),
    ('testnet', 'soroban_rpc_url', 'https://soroban-testnet.stellar.org', 'Soroban RPC URL'),
    ('testnet', 'native_token', 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', 'Native XLM token address'),
    ('testnet', 'fee_recipient', 'GDI33VCZUVNOPLHPBL5AIQXRO34XY2U4OLS3GFBPJRGGSA2UUCWTE37R', 'Platform fee recipient'),
    ('testnet', 'default_tx_fee', '1000000', 'Default transaction fee (0.1 XLM)'),
    ('mainnet', 'horizon_url', 'https://horizon.stellar.org', 'Stellar Horizon API URL'),
    ('mainnet', 'soroban_rpc_url', 'https://soroban.stellar.org', 'Soroban RPC URL')
ON CONFLICT (network, key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
