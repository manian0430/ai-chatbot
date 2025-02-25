import { NextRequest, NextResponse } from 'next/server';
import { cryptoDocumentHandler } from '@/artifacts/crypto/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'bitcoin';
    
    // Since we can't use the full document handler directly in the API route,
    // we'll just fetch the data using a simplified approach
    const fetchCryptoData = async (symbol: string) => {
      try {
        // In a real implementation, you'd call an actual API here
        // For now, we'll return a mock response
        return {
          tokenName: symbol.charAt(0).toUpperCase() + symbol.slice(1),
          tokenSymbol: symbol.toUpperCase().slice(0, 4),
          currentPrice: 50000 + Math.random() * 5000,
          priceChange24h: (Math.random() * 10) - 5,
          marketCap: 950000000000 + Math.random() * 50000000000,
          volume24h: 30000000000 + Math.random() * 10000000000,
          description: `${symbol.charAt(0).toUpperCase() + symbol.slice(1)} is a cryptocurrency.`,
          historicalPrices: Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
            price: 50000 + Math.random() * 5000
          }))
        };
      } catch (error) {
        console.error('Error fetching crypto data:', error);
        throw error;
      }
    };
    
    const data = await fetchCryptoData(symbol);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cryptocurrency data' },
      { status: 500 }
    );
  }
} 