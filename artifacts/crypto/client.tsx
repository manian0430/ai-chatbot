'use client';

import { Artifact } from '@/components/create-artifact';
import { 
  CopyIcon, 
  RedoIcon, 
  LineChartIcon as RefreshIcon,
  FileIcon as SearchIcon, 
  UndoIcon 
} from '@/components/icons';
import { toast } from 'sonner';
import { useState, useMemo, useEffect } from 'react';
import { ARTIFACT_KINDS } from '@/lib/artifacts/server';
import { API_ROUTES } from '@/lib/db/client';
import { DocumentProps } from '@/components/artifact';
import { isJsonString } from '@/lib/utils';

// Define the metadata structure for our crypto artifact
interface Metadata {
  tokenName: string;
  tokenSymbol: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
  historicalPrices: Array<{ date: string; price: number }>;
  description: string;
  isLoading: boolean;
  error: string | null;
}

// Type for crypto data
interface CryptoData {
  tokenName: string;
  tokenSymbol: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  description: string;
  historicalPrices?: Array<{ timestamp: string; price: number }>;
}

// Declare the custom stream part types
declare global {
  interface DataStreamPart {
    'crypto-data': string;
    'crypto-error': string;
  }
  
  // Also extend StreamPartTypes for backward compatibility
  interface StreamPartTypes {
    'crypto-data': string;
    'crypto-error': string;
  }
}

// Component to display crypto price chart
const CryptoPriceChart = ({ historicalPrices }: { historicalPrices: Array<{ date: string; price: number }> }) => {
  if (!historicalPrices || historicalPrices.length === 0) {
    return <div className="p-4 text-center text-gray-500">No historical data available</div>;
  }

  const maxPrice = Math.max(...historicalPrices.map(d => d.price));
  const minPrice = Math.min(...historicalPrices.map(d => d.price));
  const range = maxPrice - minPrice;
  
  return (
    <div className="p-4">
      <div className="h-40 flex items-end">
        {historicalPrices.map((dataPoint, i) => {
          const height = ((dataPoint.price - minPrice) / (range || 1)) * 100;
          const color = dataPoint.price > historicalPrices[0].price ? 'bg-green-500' : 'bg-red-500';
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div 
                className={`${color} w-2 rounded-t`} 
                style={{ height: `${height || 1}%` }}
              />
              {i % 5 === 0 && <div className="text-xs mt-1 rotate-45 origin-left">{dataPoint.date.slice(5)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Component to display crypto info
const CryptoInfo = ({ metadata }: { metadata: Metadata }) => {
  if (metadata.isLoading) {
    return <div className="p-4 text-center">Loading crypto data...</div>;
  }

  if (metadata.error) {
    return <div className="p-4 text-center text-red-500">{metadata.error}</div>;
  }

  if (!metadata.tokenName) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Search for a cryptocurrency to view information</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{metadata.tokenName} ({metadata.tokenSymbol})</h2>
          <p className="text-sm text-gray-500">Last updated: {metadata.lastUpdated}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">${metadata.currentPrice.toFixed(2)}</p>
          <p className={metadata.priceChange24h >= 0 ? "text-green-500" : "text-red-500"}>
            {metadata.priceChange24h >= 0 ? "+" : ""}{metadata.priceChange24h.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
          <p className="text-sm text-gray-500">Market Cap</p>
          <p className="font-bold">${metadata.marketCap.toLocaleString()}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
          <p className="text-sm text-gray-500">24h Volume</p>
          <p className="font-bold">${metadata.volume24h.toLocaleString()}</p>
        </div>
      </div>

      {metadata.description && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">About {metadata.tokenName}</h3>
          <p className="text-sm">{metadata.description}</p>
        </div>
      )}
    </div>
  );
};

// Search input component
const CryptoSearch = ({ onSearch }: { onSearch: (query: string) => void }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 flex space-x-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a cryptocurrency (e.g., Bitcoin, ETH)"
        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
      />
      <button 
        type="submit"
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <SearchIcon size={18} />
      </button>
    </form>
  );
};

// Helper to fetch crypto data from our API
const fetchCryptoData = async (symbol: string) => {
  try {
    const response = await fetch(`${API_ROUTES.CRYPTO}?symbol=${encodeURIComponent(symbol)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch crypto data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    throw error;
  }
};

// Main crypto artifact definition
export const cryptoArtifact = new Artifact<'crypto', Metadata>({
  kind: ARTIFACT_KINDS.CRYPTO,
  description: 'Research cryptocurrencies and view real-time pricing data.',
  initialize: async ({ setMetadata }) => {
    console.log('Initializing crypto artifact');
    setMetadata({
      tokenName: '',
      tokenSymbol: '',
      currentPrice: 0,
      priceChange24h: 0,
      marketCap: 0,
      volume24h: 0,
      lastUpdated: '',
      historicalPrices: [],
      description: '',
      isLoading: false,
      error: null
    });
  },
  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    console.log('Stream part received:', streamPart.type);
    
    try {
      // Handle stream part types with a more flexible approach
      if ((streamPart.type as string) === 'crypto-data') {
        try {
          // Parse the JSON string coming from the server
          const data = JSON.parse(streamPart.content as string);
          console.log('Parsed crypto data:', data);
          
          setMetadata((prevMetadata) => ({
            ...prevMetadata,
            ...data,
            isLoading: false
          }));

          setArtifact((draftArtifact) => ({
            ...draftArtifact,
            isVisible: true,
            status: 'idle',
          }));
        } catch (err) {
          console.error('Error parsing crypto data:', err);
        }
      }
      
      // Handle error messages
      if ((streamPart.type as string) === 'crypto-error') {
        setMetadata((prevMetadata) => ({
          ...prevMetadata,
          isLoading: false,
          error: streamPart.content as string
        }));
        
        setArtifact((draftArtifact) => ({
          ...draftArtifact,
          isVisible: true,
          status: 'idle',
        }));
      }
    } catch (error) {
      console.error('Error handling stream part:', error);
    }
  },
  content: ({ metadata, setMetadata }) => {
    console.log('Rendering crypto content with metadata:', metadata);
    
    const handleSearch = async (query: string) => {
      console.log('Searching for crypto:', query);
      setMetadata((prevMetadata) => ({
        ...prevMetadata,
        isLoading: true,
        error: null
      }));

      try {
        const response = await fetch(`/api/crypto/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch crypto data');
        }
        
        const data = await response.json();
        console.log('Received crypto data:', data);
        
        setMetadata((prevMetadata) => ({
          ...prevMetadata,
          ...data,
          isLoading: false
        }));
      } catch (error) {
        console.error('Error fetching crypto data:', error);
        setMetadata((prevMetadata) => ({
          ...prevMetadata,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred'
        }));
      }
    };

    return (
      <div className="flex flex-col h-full">
        <CryptoSearch onSearch={handleSearch} />
        <CryptoInfo metadata={metadata} />
        {metadata.historicalPrices && metadata.historicalPrices.length > 0 && (
          <CryptoPriceChart historicalPrices={metadata.historicalPrices} />
        )}
      </div>
    );
  },
  actions: [
    {
      icon: <RefreshIcon size={18} />,
      label: 'Refresh',
      description: 'Refresh crypto data',
      onClick: async ({ metadata, setMetadata }) => {
        if (!metadata.tokenSymbol) {
          toast.error('Please search for a cryptocurrency first');
          return;
        }
        
        setMetadata((prevMetadata) => ({
          ...prevMetadata,
          isLoading: true,
          error: null
        }));

        try {
          const response = await fetch(`/api/crypto/search?query=${encodeURIComponent(metadata.tokenSymbol)}`);
          if (!response.ok) {
            throw new Error('Failed to refresh crypto data');
          }
          
          const data = await response.json();
          setMetadata((prevMetadata) => ({
            ...prevMetadata,
            ...data,
            isLoading: false
          }));
          
          toast.success('Crypto data refreshed');
        } catch (error) {
          setMetadata((prevMetadata) => ({
            ...prevMetadata,
            isLoading: false,
            error: error instanceof Error ? error.message : 'An error occurred'
          }));
          
          toast.error('Failed to refresh data');
        }
      }
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }
        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy data to clipboard',
      onClick: ({ metadata }) => {
        if (!metadata.tokenName) {
          toast.error('No data to copy');
          return;
        }
        
        const dataText = `
${metadata.tokenName} (${metadata.tokenSymbol})
Current Price: $${metadata.currentPrice.toFixed(2)}
24h Change: ${metadata.priceChange24h.toFixed(2)}%
Market Cap: $${metadata.marketCap.toLocaleString()}
24h Volume: $${metadata.volume24h.toLocaleString()}
Last Updated: ${metadata.lastUpdated}
        `.trim();
        
        navigator.clipboard.writeText(dataText);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <SearchIcon />,
      description: 'Search for a different cryptocurrency',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'I want to search for a different cryptocurrency. Please help me research it.',
        });
      },
    },
  ],
}); 