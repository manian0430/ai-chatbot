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

// Function to generate historical price data
function generateHistoricalPrices(basePrice: number, days = 30) {
  const prices = [];
  const volatility = 0.05;
  
  let currentPrice = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Add some random price movement
    const change = (Math.random() - 0.5) * 2 * volatility * currentPrice;
    currentPrice = Math.max(0.01, currentPrice + change);
    
    prices.push({
      date: date.toISOString().split('T')[0],
      price: +currentPrice.toFixed(2)
    });
  }
  
  return prices;
}

// Cryptocurrency information database
const cryptoDatabase: Record<string, CryptoData> = {
  bitcoin: {
    tokenName: 'Bitcoin',
    tokenSymbol: 'BTC',
    currentPrice: 57000 + Math.random() * 2000,
    priceChange24h: 2.5 + (Math.random() * 2 - 1),
    marketCap: 1100000000000,
    volume24h: 32000000000,
    description: 'Bitcoin is the first decentralized cryptocurrency, based on blockchain technology that enables peer-to-peer transactions without the need for intermediaries.',
    historicalPrices: [],
    lastUpdated: new Date().toISOString()
  },
  ethereum: {
    tokenName: 'Ethereum',
    tokenSymbol: 'ETH',
    currentPrice: 3200 + Math.random() * 100,
    priceChange24h: 1.8 + (Math.random() * 2 - 1),
    marketCap: 380000000000,
    volume24h: 15000000000,
    description: 'Ethereum is a decentralized, open-source blockchain featuring smart contract functionality. It enables developers to build and deploy decentralized applications (dApps).',
    historicalPrices: [],
    lastUpdated: new Date().toISOString()
  },
  solana: {
    tokenName: 'Solana',
    tokenSymbol: 'SOL',
    currentPrice: 145 + Math.random() * 15,
    priceChange24h: 3.2 + (Math.random() * 3 - 1.5),
    marketCap: 63000000000,
    volume24h: 2000000000,
    description: 'Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale.',
    historicalPrices: [],
    lastUpdated: new Date().toISOString()
  },
  cardano: {
    tokenName: 'Cardano',
    tokenSymbol: 'ADA',
    currentPrice: 0.5 + Math.random() * 0.05,
    priceChange24h: 1.1 + (Math.random() * 2 - 1),
    marketCap: 18000000000,
    volume24h: 500000000,
    description: 'Cardano is a proof-of-stake blockchain platform with a focus on sustainability, scalability, and transparency.',
    historicalPrices: [],
    lastUpdated: new Date().toISOString()
  },
  dogecoin: {
    tokenName: 'Dogecoin',
    tokenSymbol: 'DOGE',
    currentPrice: 0.12 + Math.random() * 0.02,
    priceChange24h: 0.8 + (Math.random() * 4 - 2),
    marketCap: 16000000000,
    volume24h: 800000000,
    description: 'Dogecoin is a cryptocurrency created by software engineers as a "joke," making fun of the wild speculation in cryptocurrencies at the time.',
    historicalPrices: [],
    lastUpdated: new Date().toISOString()
  }
};

// Generate historical prices for all cryptocurrencies
Object.keys(cryptoDatabase).forEach(key => {
  cryptoDatabase[key].historicalPrices = generateHistoricalPrices(cryptoDatabase[key].currentPrice);
});

export async function GET(request: Request) {
  try {
    // Parse the URL and get the query parameter
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    
    // Find the matching cryptocurrency by name or symbol
    const matchedCrypto = Object.values(cryptoDatabase).find(crypto => 
      crypto.tokenName.toLowerCase().includes(query) || 
      crypto.tokenSymbol.toLowerCase() === query
    );
    
    if (matchedCrypto) {
      // Add some randomness to price each time
      const cryptoInfo = {
        ...matchedCrypto,
        currentPrice: +(matchedCrypto.currentPrice + (Math.random() * (matchedCrypto.currentPrice * 0.02) - matchedCrypto.currentPrice * 0.01)).toFixed(2),
        priceChange24h: +(matchedCrypto.priceChange24h + (Math.random() - 0.5)).toFixed(2),
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`Crypto search API returning data for: ${cryptoInfo.tokenName}`);
      return NextResponse.json(cryptoInfo);
    } else {
      // Default to Bitcoin if no match found
      console.log(`No match found for "${query}", returning Bitcoin data instead`);
      return NextResponse.json({
        ...cryptoDatabase.bitcoin,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error in crypto search API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency data' },
      { status: 500 }
    );
  }
}
