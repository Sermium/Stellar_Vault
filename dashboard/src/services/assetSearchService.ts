export interface StellarAsset {
  asset: string;  // Format: "CODE-ISSUER-type"
  code: string;
  issuer: string;
  domain?: string;
  name?: string;
  image?: string;
  supply?: string;
  trustlines?: {
    total: number;
    funded: number;
  };
  rating?: {
    average: number;
  };
  tomlInfo?: {
    name?: string;
    orgName?: string;
    image?: string;
    desc?: string;
  };
}

export interface AssetSearchResult {
  address: string;      // Contract address (for SAC)
  code: string;
  issuer: string;
  name: string;
  domain?: string;
  icon?: string;
  decimals: number;
  rating?: number;
  trustlines?: number;
}

// Parse asset string "CODE-ISSUER-type" format
const parseAssetString = (assetStr: string): { code: string; issuer: string } | null => {
  const parts = assetStr.split('-');
  if (parts.length >= 2) {
    return {
      code: parts[0],
      issuer: parts[1],
    };
  }
  return null;
};

// Search assets on Stellar Expert (mainnet)
export const searchAssetsMainnet = async (query: string): Promise<AssetSearchResult[]> => {
  try {
    const response = await fetch(
      `https://api.stellar.expert/explorer/public/asset?search=${encodeURIComponent(query)}&limit=20&order=desc`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch assets');
    }
    
    const data = await response.json();
    const records = data._embedded?.records || [];
    
    return records.map((asset: StellarAsset) => {
      const parsed = parseAssetString(asset.asset);
      return {
        address: '', // Will need to derive SAC address
        code: parsed?.code || asset.asset.split('-')[0],
        issuer: parsed?.issuer || '',
        name: asset.tomlInfo?.name || parsed?.code || 'Unknown',
        domain: asset.domain,
        icon: asset.tomlInfo?.image,
        decimals: 7, // Stellar assets default to 7
        rating: asset.rating?.average,
        trustlines: asset.trustlines?.total,
      };
    });
  } catch (error) {
    console.error('Asset search failed:', error);
    return [];
  }
};

// Search assets on Stellar Expert (testnet)
export const searchAssetsTestnet = async (query: string): Promise<AssetSearchResult[]> => {
  try {
    const response = await fetch(
      `https://api.stellar.expert/explorer/testnet/asset?search=${encodeURIComponent(query)}&limit=20&order=desc`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch assets');
    }
    
    const data = await response.json();
    const records = data._embedded?.records || [];
    
    return records.map((asset: StellarAsset) => {
      const parsed = parseAssetString(asset.asset);
      return {
        address: '', // Will need to derive SAC address
        code: parsed?.code || asset.asset.split('-')[0],
        issuer: parsed?.issuer || '',
        name: asset.tomlInfo?.name || parsed?.code || 'Unknown',
        domain: asset.domain,
        icon: asset.tomlInfo?.image,
        decimals: 7,
        rating: asset.rating?.average,
        trustlines: asset.trustlines?.total,
      };
    });
  } catch (error) {
    console.error('Asset search failed:', error);
    return [];
  }
};

// Get top/popular assets
export const getPopularAssets = async (network: 'public' | 'testnet' = 'testnet'): Promise<AssetSearchResult[]> => {
  try {
    const response = await fetch(
      `https://api.stellar.expert/explorer/${network}/asset?limit=50&order=desc`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch popular assets');
    }
    
    const data = await response.json();
    const records = data._embedded?.records || [];
    
    return records
      .filter((asset: StellarAsset) => asset.rating && asset.rating.average >= 5)
      .map((asset: StellarAsset) => {
        const parsed = parseAssetString(asset.asset);
        return {
          address: '',
          code: parsed?.code || asset.asset.split('-')[0],
          issuer: parsed?.issuer || '',
          name: asset.tomlInfo?.name || parsed?.code || 'Unknown',
          domain: asset.domain,
          icon: asset.tomlInfo?.image,
          decimals: 7,
          rating: asset.rating?.average,
          trustlines: asset.trustlines?.total,
        };
      });
  } catch (error) {
    console.error('Failed to fetch popular assets:', error);
    return [];
  }
};

// Get asset details by code and issuer
export const getAssetDetails = async (
  code: string, 
  issuer: string, 
  network: 'public' | 'testnet' = 'testnet'
): Promise<AssetSearchResult | null> => {
  try {
    const response = await fetch(
      `https://api.stellar.expert/explorer/${network}/asset/${code}-${issuer}`
    );
    
    if (!response.ok) {
      return null;
    }
    
    const asset = await response.json();
    const parsed = parseAssetString(asset.asset);
    
    return {
      address: '',
      code: parsed?.code || code,
      issuer: parsed?.issuer || issuer,
      name: asset.tomlInfo?.name || code,
      domain: asset.domain,
      icon: asset.tomlInfo?.image,
      decimals: 7,
      rating: asset.rating?.average,
      trustlines: asset.trustlines?.total,
    };
  } catch (error) {
    console.error('Failed to get asset details:', error);
    return null;
  }
};
