import { z } from 'zod';
import { streamObject } from 'ai';
import { myProvider } from '@/lib/ai/models';
import { createDocumentHandler, registerDocumentHandler, ARTIFACT_KINDS } from '@/lib/artifacts/server';

// Define our schema for crypto data
const cryptoSchema = z.object({
  tokenName: z.string(),
  tokenSymbol: z.string(),
  currentPrice: z.number(),
  priceChange24h: z.number(),
  marketCap: z.number(),
  volume24h: z.number(),
  description: z.string(),
  recentNews: z.array(z.string()).optional(),
});

// Helper function to generate sample historical prices
function generateSampleHistoricalPrices(currentPrice: number, priceChange24h: number) {
  const prices = [];
  const days = 30;
  const now = new Date();
  
  // Calculate starting price based on current price and 24h change
  const startingPrice = currentPrice / (1 + (priceChange24h / 100));
  
  // Generate random-ish prices that trend toward the current price
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Create more realistic price evolution
    const randomFactor = Math.random() * 0.06 - 0.03; // Random ±3% daily change
    const progressFactor = (days - i) / days; // Progress toward current price
    const dayPrice = startingPrice * (1 + progressFactor * (priceChange24h / 100)) * (1 + randomFactor);
    
    prices.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat(dayPrice.toFixed(2)),
    });
  }
  
  return prices;
}

// Crypto research prompt for AI
const cryptoResearchPrompt = `You are a helpful expert in cryptocurrency research. The user will provide a cryptocurrency name or symbol, and you'll provide detailed, accurate information about that cryptocurrency.

For each request, research the cryptocurrency and provide the following information:
- Full name and symbol
- Current price (in USD)
- 24-hour price change percentage
- Market capitalization
- 24-hour trading volume
- A brief description of the cryptocurrency's purpose and technology
- Any recent significant news or developments

Your responses should be objective, factual, and based on real data. If you don't have information about a specific cryptocurrency, please acknowledge that and suggest researching more established cryptocurrencies. Don't make up data. If the cryptocurrency mentioned doesn't exist or you're unsure about it, please state that clearly.`;

// Helper function to fetch crypto data
async function fetchCryptoData(query: string) {
  try {
    // Try to use our API endpoint first
    const response = await fetch(`http://localhost:3000/api/crypto/search?query=${encodeURIComponent(query)}`);
    
    if (response.ok) {
      return await response.json();
    }
    
    // If API fails, fall back to AI
    console.log('API fetch failed, using AI fallback');
    throw new Error('API unavailable');
    
  } catch (error) {
    console.log('Using AI to generate crypto data');
    
    // Make call to AI to get crypto research information
    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifacts-model'),
      system: cryptoResearchPrompt,
      prompt: `Please research the cryptocurrency "${query}" and provide detailed information.`,
      schema: cryptoSchema,
    });

    // The first complete object will be our result
    for await (const delta of fullStream) {
      if (delta.type === 'object') {
        const { object } = delta;
        
        // Make sure we have the required values with fallbacks
        const price = object.currentPrice ?? 0;
        const priceChange = object.priceChange24h ?? 0;
        
        // Generate sample historical prices
        const historicalPrices = generateSampleHistoricalPrices(price, priceChange);
        
        return {
          tokenName: object.tokenName ?? 'Unknown',
          tokenSymbol: object.tokenSymbol ?? 'UNKNOWN',
          currentPrice: price,
          priceChange24h: priceChange,
          marketCap: object.marketCap ?? 0,
          volume24h: object.volume24h ?? 0,
          lastUpdated: new Date().toLocaleString(),
          historicalPrices,
          description: object.description ?? '',
          recentNews: object.recentNews || [],
        };
      }
    }
    
    throw new Error('Failed to generate crypto data');
  }
}

// Create the document handler
export const cryptoDocumentHandler = createDocumentHandler({
  kind: ARTIFACT_KINDS.CRYPTO,
  onCreateDocument: async ({ title, dataStream }) => {
    try {
      // Get current data for the requested crypto
      const cryptoData = await fetchCryptoData(title);
      
      // Stream the data to the client
      dataStream.writeData({
        type: 'crypto-data',
        content: JSON.stringify(cryptoData),
      });
      
      // Return formatted crypto info as the document content
      return JSON.stringify(cryptoData, null, 2);
    } catch (error) {
      console.error('Error in crypto document handler:', error);
      
      dataStream.writeData({
        type: 'crypto-error',
        content: error instanceof Error ? error.message : 'Failed to fetch crypto data',
      });
      
      return JSON.stringify({ error: 'Failed to fetch crypto data' });
    }
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    try {
      // This is called when a user requests an update with a new description
      
      // Safely parse document content with a default empty object
      const content = document.content || '{}';
      const parsedContent = JSON.parse(content);
      
      // Ensure we have a valid query string
      const tokenSymbol = parsedContent.tokenSymbol || description || 'bitcoin';
      
      // Get fresh data for the crypto
      const cryptoData = await fetchCryptoData(tokenSymbol);
      
      // Stream the updated data to the client
      dataStream.writeData({
        type: 'crypto-data',
        content: JSON.stringify(cryptoData),
      });
      
      // Return updated crypto info as the document content
      return JSON.stringify(cryptoData, null, 2);
    } catch (error) {
      console.error('Error updating crypto document:', error);
      
      dataStream.writeData({
        type: 'crypto-error',
        content: error instanceof Error ? error.message : 'Failed to update crypto data',
      });
      
      return document.content || '{}'; // Return original content on error, with fallback
    }
  },
});

// Register the handler to avoid circular dependencies
registerDocumentHandler(cryptoDocumentHandler); 