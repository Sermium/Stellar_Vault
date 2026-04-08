import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the stellar SDK and related modules
jest.mock('./lib/stellar', () => ({}));
jest.mock('./hooks/useStellarVault', () => ({
  useStellarVault: () => ({
    connected: false,
    publicKey: null,
    loading: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
  })
}));
jest.mock('./services/walletService', () => ({
  getStoredConnection: () => null,
  disconnectWallet: jest.fn(),
  setWalletConnection: jest.fn(),
}));

import App from './App';

test('renders landing page when not connected', () => {
  render(<App />);
  // Update this to match your actual landing page content
  expect(screen.getByText(/Stellar Vault/i)).toBeInTheDocument();
});