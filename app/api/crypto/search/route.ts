import { NextResponse } from 'next/server';

// Define our types
interface CryptoData {
  tokenName: string;
  tokenSymbol: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  description: string;
  historicalPrices: Array<{ date: string; price: number }>;
  lastUpdated: string;
}

// In-memory cache with expiration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
interface CacheEntry {
  data: CryptoData;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();

// Fetch with timeout to avoid hanging requests
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Default fallback data for when the API is unavailable
const fallbackData: Record<string, CryptoData> = {
  bitcoin: {
    tokenName: 'Bitcoin',
    tokenSymbol: 'BTC',
    currentPrice: 65000,
    priceChange24h: 1.2,
    marketCap: 1200000000000,
    volume24h: 30000000000,
    description: 'Bitcoin is the first decentralized cryptocurrency. This is fallback data shown when the API is unavailable.',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 65000 + (Math.sin(i / 5) * 3000)
    })),
    lastUpdated: new Date().toISOString()
  },
  ethereum: {
    tokenName: 'Ethereum',
    tokenSymbol: 'ETH',
    currentPrice: 3500,
    priceChange24h: 2.1,
    marketCap: 420000000000,
    volume24h: 18000000000,
    description: 'Ethereum is a decentralized blockchain with smart contract functionality. This is fallback data shown when the API is unavailable.',
    historicalPrices: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 3500 + (Math.sin(i / 5) * 200)
    })),
    lastUpdated: new Date().toISOString()
  }
};

export async function GET(request: Request) {
  try {
    // Parse the URL and get the query parameter
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    
    // Check if we have a valid cached result
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `crypto-${normalizedQuery}`;
    const cachedData = cache.get(cacheKey);
    
    // Return cached data if it's still valid
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached data for ${normalizedQuery}`);
      return NextResponse.json(cachedData.data);
    }
    
    // First search for the coin ID using CoinGecko's search endpoint
    const searchResponse = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      {},
      3000
    );
    
    if (!searchResponse.ok) {
      throw new Error(`CoinGecko API error: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    // Check if any coins were found
    if (!searchData.coins || searchData.coins.length === 0) {
      // Check if we have fallback data for this query
      if (normalizedQuery.includes('bitcoin') || normalizedQuery === 'btc') {
        console.log(`No match found for "${query}", returning fallback Bitcoin data`);
        return NextResponse.json(fallbackData.bitcoin);
      }
      
      if (normalizedQuery.includes('ethereum') || normalizedQuery === 'eth') {
        console.log(`No match found for "${query}", returning fallback Ethereum data`);
        return NextResponse.json(fallbackData.ethereum);
      }
      
      return NextResponse.json(
        { error: `No cryptocurrency found matching "${query}"` },
        { status: 404 }
      );
    }
    
    // Use the first result (most relevant)
    const coinId = searchData.coins[0].id;
    const coinSymbol = searchData.coins[0].symbol.toUpperCase();
    const coinName = searchData.coins[0].name;
    
    // Get current price data
    const priceResponse = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      {},
      5000
    );
    
    if (!priceResponse.ok) {
      throw new Error(`CoinGecko API error: ${priceResponse.status}`);
    }
    
    const priceData = await priceResponse.json();
    
    // Get historical data (last 30 days)
    const historyResponse = await fetchWithTimeout(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`,
      {},
      5000
    );
    
    if (!historyResponse.ok) {
      throw new Error(`CoinGecko API error: ${historyResponse.status}`);
    }
    
    const historyData = await historyResponse.json();
    
    // Format the historical prices
    const historicalPrices = historyData.prices.map((item: [number, number]) => {
      const date = new Date(item[0]);
      return {
        date: date.toISOString().split('T')[0],
        price: item[1]
      };
    });
    
    // Construct the response with real data
    const cryptoInfo: CryptoData = {
      tokenName: coinName,
      tokenSymbol: coinSymbol,
      currentPrice: priceData.market_data.current_price?.usd || 0,
      priceChange24h: priceData.market_data.price_change_percentage_24h || 0,
      marketCap: priceData.market_data.market_cap?.usd || 0,
      volume24h: priceData.market_data.total_volume?.usd || 0,
      description: priceData.description?.en?.split('. ').slice(0, 3).join('. ') + '.' || '',
      historicalPrices,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the result
    cache.set(cacheKey, {
      data: cryptoInfo,
      timestamp: Date.now()
    });
    
    console.log(`Crypto search API returning real data for: ${cryptoInfo.tokenName}`);
    return NextResponse.json(cryptoInfo);
  } catch (error) {
    console.error('Error in crypto search API:', error);
    
    // Check if we can return appropriate fallback data
    const query = new URL(request.url).searchParams.get('query')?.toLowerCase() || '';
    
    if (query.includes('bitcoin') || query === 'btc') {
      console.log('Returning fallback Bitcoin data due to API error');
      return NextResponse.json(fallbackData.bitcoin);
    }
    
    if (query.includes('ethereum') || query === 'eth') {
      console.log('Returning fallback Ethereum data due to API error');
      return NextResponse.json(fallbackData.ethereum);
    }
    
    // Otherwise return an error
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch cryptocurrency data' },
      { status: 500 }
    );
  }
}
