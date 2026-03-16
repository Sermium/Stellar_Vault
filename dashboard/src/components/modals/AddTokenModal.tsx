import React, { useState, useEffect } from 'react';
import { isSACToken, getTokenIssuer, deriveSACAddress } from '../../lib/stellar';
import { 
  CustomToken, 
  saveCustomToken, 
  getCustomTokens, 
} from '../../services/tokensService';
import { 
  searchAssetsTestnet, 
  getPopularAssets, 
  AssetSearchResult 
} from '../../services/assetSearchService';

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: CustomToken) => void;
}

// Copy icon component
const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

// Check icon component
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const AddTokenModal: React.FC<AddTokenModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AssetSearchResult[]>([]);
  const [popularAssets, setPopularAssets] = useState<AssetSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Manual entry fields
  const [manualAddress, setManualAddress] = useState('');
  const [manualSymbol, setManualSymbol] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualDecimals, setManualDecimals] = useState('7');

  // Copy to clipboard function
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Load popular assets on mount
  useEffect(() => {
    if (isOpen && popularAssets.length === 0) {
      loadPopularAssets();
    }
  }, [isOpen]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPopularAssets = async () => {
    try {
      const assets = await getPopularAssets('testnet');
      setPopularAssets(assets.slice(0, 10));
    } catch (err) {
      console.error('Failed to load popular assets:', err);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const results = await searchAssetsTestnet(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setError('');
    setSelectedAsset(null);
    setManualMode(false);
    setManualAddress('');
    setManualSymbol('');
    setManualName('');
    setManualDecimals('7');
    setCopiedField(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectAsset = async (asset: AssetSearchResult) => {
    setLoading(true);
    setError('');

    try {
      const contractAddress = deriveSACAddress(asset.code, asset.issuer);
      
      if (!contractAddress) {
        setManualMode(true);
        setManualSymbol(asset.code);
        setManualName(asset.name);
        setManualDecimals('7');
        setError(`Could not derive contract address for ${asset.code}`);
        setLoading(false);
        return;
      }

      const existing = getCustomTokens().find(t => t.address === contractAddress);
      if (existing) {
        setError('This token is already in your list');
        setLoading(false);
        return;
      }

      setSelectedAsset({ ...asset, address: contractAddress });
    } catch (err) {
      console.error('Failed to select asset:', err);
      setManualMode(true);
      setManualSymbol(asset.code);
      setManualName(asset.name);
      setError('Failed to derive address. Please enter manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSelectedAsset = () => {
    if (!selectedAsset || !selectedAsset.address) return;

    const token: CustomToken = {
      address: selectedAsset.address,
      symbol: selectedAsset.code,
      name: selectedAsset.name,
      decimals: selectedAsset.decimals,
      icon: selectedAsset.icon,
      isSAC: true,
      issuer: selectedAsset.issuer,
      addedAt: Date.now(),
    };

    saveCustomToken(token);
    onSuccess(token);
    handleClose();
  };

  const handleManualAdd = async () => {
    if (!manualAddress.trim() || !manualSymbol.trim()) {
      setError('Address and symbol are required');
      return;
    }

    if (!manualAddress.startsWith('C') || manualAddress.length !== 56) {
      setError('Invalid contract address (must start with C and be 56 characters)');
      return;
    }

    const existing = getCustomTokens().find(t => t.address === manualAddress.trim());
    if (existing) {
      setError('This token is already in your list');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const isSAC = await isSACToken(manualAddress.trim());
      let issuer: string | undefined;
      
      if (isSAC) {
        issuer = await getTokenIssuer(manualAddress.trim()) ?? undefined;
      }

      const token: CustomToken = {
        address: manualAddress.trim(),
        symbol: manualSymbol.trim().toUpperCase(),
        name: manualName.trim() || manualSymbol.trim().toUpperCase(),
        decimals: parseInt(manualDecimals) || 7,
        isSAC,
        issuer,
        addedAt: Date.now(),
      };

      saveCustomToken(token);
      onSuccess(token);
      handleClose();
    } catch (err) {
      console.error('Failed to add token:', err);
      setError('Failed to add token');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayAssets = searchQuery.length >= 2 ? searchResults : popularAssets;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Add Token</h2>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!manualMode && !selectedAsset ? (
          <>
            {/* Search Input */}
            <div className="p-4 border-b border-slate-700">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, symbol, or issuer..."
                  className="w-full px-4 py-3 pl-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-sm text-slate-400 mb-3">
                {searchQuery.length >= 2 
                  ? `${searchResults.length} results found` 
                  : 'Popular tokens'}
              </p>

              {displayAssets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">
                    {searchQuery.length >= 2 
                      ? 'No tokens found. Try manual entry.' 
                      : 'Loading popular tokens...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayAssets.map((asset, index) => (
                    <button
                      key={`${asset.code}-${asset.issuer}-${index}`}
                      onClick={() => handleSelectAsset(asset)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center overflow-hidden">
                        {asset.icon ? (
                          <img src={asset.icon} alt={asset.code} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-medium text-sm">
                            {asset.code.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{asset.code}</span>
                          {asset.rating && asset.rating >= 7 && (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm truncate">{asset.name}</p>
                        {asset.domain && (
                          <p className="text-slate-500 text-xs">{asset.domain}</p>
                        )}
                      </div>
                      {asset.trustlines && (
                        <span className="text-slate-500 text-xs">
                          {asset.trustlines.toLocaleString()} trustlines
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm mt-3">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={() => setManualMode(true)}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Enter Contract Address Manually
              </button>
            </div>
          </>
        ) : selectedAsset ? (
          <>
            {/* Confirmation View */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                  {selectedAsset.icon ? (
                    <img src={selectedAsset.icon} alt={selectedAsset.code} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-xl">
                      {selectedAsset.code.slice(0, 2)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedAsset.code}</h3>
                  <p className="text-slate-400">{selectedAsset.name}</p>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3 text-sm">
                {/* Contract Address */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 shrink-0">Contract</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white font-mono text-xs truncate">
                      {selectedAsset.address}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedAsset.address, 'contract')}
                      className="p-1.5 hover:bg-slate-600 rounded transition-colors shrink-0"
                      title="Copy contract address"
                    >
                      {copiedField === 'contract' ? (
                        <CheckIcon />
                      ) : (
                        <CopyIcon />
                      )}
                    </button>
                  </div>
                </div>

                {/* Issuer */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 shrink-0">Issuer</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white font-mono text-xs truncate">
                      {selectedAsset.issuer}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedAsset.issuer, 'issuer')}
                      className="p-1.5 hover:bg-slate-600 rounded transition-colors shrink-0"
                      title="Copy issuer address"
                    >
                      {copiedField === 'issuer' ? (
                        <CheckIcon />
                      ) : (
                        <CopyIcon />
                      )}
                    </button>
                  </div>
                </div>

                {/* Decimals */}
                <div className="flex justify-between">
                  <span className="text-slate-400">Decimals</span>
                  <span className="text-white">{selectedAsset.decimals}</span>
                </div>

                {/* Domain */}
                {selectedAsset.domain && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Domain</span>
                    <span className="text-white">{selectedAsset.domain}</span>
                  </div>
                )}

                {/* Type */}
                <div className="flex justify-between">
                  <span className="text-slate-400">Type</span>
                  <span className="text-yellow-400">SAC (Requires Trustline)</span>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAddSelectedAsset}
                  disabled={loading}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Token'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Manual Entry Mode */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Contract Address *
                </label>
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="C..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    value={manualSymbol}
                    onChange={(e) => setManualSymbol(e.target.value)}
                    placeholder="e.g., USDC"
                    maxLength={12}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Decimals
                  </label>
                  <input
                    type="number"
                    value={manualDecimals}
                    onChange={(e) => setManualDecimals(e.target.value)}
                    placeholder="7"
                    min="0"
                    max="18"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g., USD Coin"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setManualMode(false);
                    setError('');
                  }}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleManualAdd}
                  disabled={loading || !manualAddress.trim() || !manualSymbol.trim()}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Adding...' : 'Add Token'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
