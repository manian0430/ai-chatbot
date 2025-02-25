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

export async function GET(request: Request) {
  try {
    // Parse the URL and get the query parameter
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.toLowerCase() || '';
    
    // First search for the coin ID using CoinGecko's search endpoint
    const searchResponse = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
    if (!searchResponse.ok) {
      throw new Error(`CoinGecko API error: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    // Check if any coins were found
    if (!searchData.coins || searchData.coins.length === 0) {
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
    const priceResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
    );
    
    if (!priceResponse.ok) {
      throw new Error(`CoinGecko API error: ${priceResponse.status}`);
    }
    
    const priceData = await priceResponse.json();
    
    // Get historical data (last 30 days)
    const historyResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=30&interval=daily`
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
      currentPrice: priceData.market_data.current_price.usd,
      priceChange24h: priceData.market_data.price_change_percentage_24h || 0,
      marketCap: priceData.market_data.market_cap.usd || 0,
      volume24h: priceData.market_data.total_volume.usd || 0,
      description: priceData.description.en?.split('. ').slice(0, 3).join('. ') + '.' || '',
      historicalPrices,
      lastUpdated: new Date().toISOString()
    };
    
    console.log(`Crypto search API returning real data for: ${cryptoInfo.tokenName}`);
    return NextResponse.json(cryptoInfo);
  } catch (error) {
    console.error('Error in crypto search API:', error);
    
    // Fall back to mock data for Bitcoin if the API call fails
    // This is temporary for resilience until the API integration is fully tested
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch cryptocurrency data' },
      { status: 500 }
    );
  }
}
