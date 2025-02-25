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
  historicalPrices?: Array<{ date: string; price: number }>;
  lastUpdated?: string;
}

interface HistoricalPrice {
  date: string;
  price: number;
}

// Function to generate historical price data
function generateHistoricalPrices(
  basePrice: number,
  volatility: number = 0.05,
  days: number = 30
): Array<HistoricalPrice> {
  const prices: Array<HistoricalPrice> = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Random walk algorithm with some trend
    let changePercent = (Math.random() - 0.5) * 2 * volatility;
    if (i < days / 2) {
      // Add a slight upward trend for the second half of the period
      changePercent += 0.002;
    }
    
    // Calculate price based on previous price or base price for first entry
    const prevPrice = prices.length > 0 ? prices[prices.length - 1].price : basePrice;
    const price = prevPrice * (1 + changePercent);
    
    prices.push({
      date: date.toISOString().split('T')[0],
      price: +price.toFixed(2)
    });
  }
  
  return prices;
}

// Map to store commonly used data for frequent requests
const cryptoDataCache = new Map<string, CryptoData>();

// Default information for common cryptocurrencies
const defaultCryptoInfo: Record<string, CryptoData> = {
  'bitcoin': {
    tokenName: 'Bitcoin',
    tokenSymbol: 'BTC',
    currentPrice: 57000,
    priceChange24h: 2.5,
    marketCap: 1100000000000,
    volume24h: 32000000000,
    description: 'Bitcoin is the first decentralized cryptocurrency, based on blockchain technology that enables peer-to-peer transactions without the need for intermediaries.'
  },
  'ethereum': {
    tokenName: 'Ethereum',
    tokenSymbol: 'ETH',
    currentPrice: 3200,
    priceChange24h: 1.8,
    marketCap: 380000000000,
    volume24h: 18000000000,
    description: 'Ethereum is a decentralized, open-source blockchain with smart contract functionality. It enables developers to build and deploy decentralized applications.'
  },
  'binance coin': {
    tokenName: 'Binance Coin',
    tokenSymbol: 'BNB',
    currentPrice: 620,
    priceChange24h: -0.5,
    marketCap: 96000000000,
    volume24h: 1800000000,
    description: 'Binance Coin is the cryptocurrency issued by the Binance exchange. It is used to pay for transaction fees on the exchange and can be used for other services within the Binance ecosystem.'
  },
  'cardano': {
    tokenName: 'Cardano',
    tokenSymbol: 'ADA',
    currentPrice: 0.59,
    priceChange24h: -1.2,
    marketCap: 19500000000,
    volume24h: 650000000,
    description: 'Cardano is a proof-of-stake blockchain platform that aims to enable "changemakers, innovators and visionaries" to bring about positive global change.'
  },
  'solana': {
    tokenName: 'Solana',
    tokenSymbol: 'SOL',
    currentPrice: 130,
    priceChange24h: 3.8,
    marketCap: 52000000000,
    volume24h: 2300000000,
    description: 'Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale. It is known for its fast processing times and low transaction costs.'
  }
};

// Normalize search query
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

// Function to get information for a cryptocurrency
function getCryptoInfo(query: string): CryptoData {
  const normalizedQuery = normalizeQuery(query);
  
  // Check if this is a common cryptocurrency with default data
  let result: CryptoData | null = null;
  
  // First check exact matches in our default data
  if (defaultCryptoInfo[normalizedQuery]) {
    result = { ...defaultCryptoInfo[normalizedQuery] };
  } else {
    // Check for partial matches (e.g., "btc" for Bitcoin)
    for (const [key, value] of Object.entries(defaultCryptoInfo)) {
      if (
        key.includes(normalizedQuery) || 
        value.tokenName.toLowerCase().includes(normalizedQuery) || 
        value.tokenSymbol.toLowerCase() === normalizedQuery
      ) {
        result = { ...value };
        break;
      }
    }
  }
  
  // If no match was found, generate some data
  if (!result) {
    // Try to guess if this is a symbol (usually 3-4 uppercase characters)
    const isLikelySymbol = normalizedQuery.length <= 5;
    const guessedName = isLikelySymbol 
      ? normalizedQuery.toUpperCase()
      : normalizedQuery.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    
    let basePrice = Math.random() * 1000;
    if (basePrice < 1) {
      basePrice = Math.random() * 10;
    }
    
    result = {
      tokenName: isLikelySymbol ? `Unknown (${guessedName})` : guessedName,
      tokenSymbol: isLikelySymbol ? guessedName : normalizedQuery.substring(0, 3).toUpperCase(),
      currentPrice: +basePrice.toFixed(2),
      priceChange24h: +(Math.random() * 10 - 5).toFixed(2),
      marketCap: +(Math.random() * 10000000000).toFixed(0),
      volume24h: +(Math.random() * 1000000000).toFixed(0),
      description: `This is a cryptocurrency called ${guessedName}. Limited information is available.`
    };
  }
  
  // Add historical prices if not cached
  if (!result.historicalPrices) {
    result.historicalPrices = generateHistoricalPrices(result.currentPrice);
  }
  
  // Add last updated timestamp
  result.lastUpdated = new Date().toISOString();
  
  return result;
}

export async function GET(request: Request) {
  try {
    // Parse the URL and get the query parameter
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }
    
    console.log(`Crypto search API called with query: ${query}`);
    
    // Get cryptocurrency information
    const cryptoInfo = getCryptoInfo(query);
    
    // Add this data to our cache for future requests
    cryptoDataCache.set(normalizeQuery(query), cryptoInfo);
    
    return NextResponse.json(cryptoInfo);
  } catch (error) {
    console.error('Error in crypto search API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency data' },
      { status: 500 }
    );
  }
}
