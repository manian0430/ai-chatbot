import { generateUUID } from '@/lib/utils';
import { DataStreamWriter, tool } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';

// Define artifact kinds for the tool
const ARTIFACT_KINDS = {
  CRYPTO: 'crypto'
};

interface RequestCryptoProps {
  session: Session;
  dataStream: DataStreamWriter;
}

// Helper to generate mock cryptocurrency data
function generateCryptoData(cryptoName: string) {
  const basePrice = 50000 + Math.random() * 5000;
  const priceChange = (Math.random() * 10) - 5;
  
  // Generate random historical prices
  const historicalPrices = [];
  let price = basePrice;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Add some random price movement
    const change = (Math.random() - 0.5) * 2 * 0.05 * price;
    price = Math.max(0.01, price + change);
    
    historicalPrices.push({
      date: date.toISOString().split('T')[0],
      price: +price.toFixed(2)
    });
  }
  
  return {
    tokenName: cryptoName.charAt(0).toUpperCase() + cryptoName.slice(1),
    tokenSymbol: cryptoName.slice(0, 3).toUpperCase(),
    currentPrice: basePrice,
    priceChange24h: priceChange,
    marketCap: 950000000000 + Math.random() * 50000000000,
    volume24h: 30000000000 + Math.random() * 10000000000,
    lastUpdated: new Date().toISOString(),
    description: `${cryptoName.charAt(0).toUpperCase() + cryptoName.slice(1)} is a cryptocurrency.`,
    historicalPrices
  };
}

export const requestCrypto = ({ session, dataStream }: RequestCryptoProps) =>
  tool({
    description:
      'Request cryptocurrency information and price data. Use this tool when users ask about cryptocurrency prices, charts, or information on specific cryptocurrencies like Bitcoin, Ethereum, etc.',
    parameters: z.object({
      cryptoName: z.string().describe('The name or symbol of the cryptocurrency (e.g., "Bitcoin", "ETH").'),
      display: z.boolean().default(true).describe('Whether to display the crypto artifact.'),
    }),
    execute: async ({ cryptoName, display }) => {
      if (!display) {
        return { result: `Information about ${cryptoName} is available.` };
      }

      try {
        // Generate a unique ID for this artifact
        const id = generateUUID();
        
        // Signal to the client that we're creating a crypto artifact
        dataStream.writeData({
          type: 'kind',
          content: ARTIFACT_KINDS.CRYPTO,
        });

        dataStream.writeData({
          type: 'id',
          content: id,
        });

        dataStream.writeData({
          type: 'title',
          content: cryptoName,
        });

        try {
          // Generate mock data directly instead of trying to call the API
          const data = generateCryptoData(cryptoName);
          
          // Send the data to the client
          dataStream.writeData({
            type: 'crypto-data',
            content: JSON.stringify(data),
          });
        } catch (error) {
          console.error('Error generating crypto data:', error);
          dataStream.writeData({
            type: 'crypto-error',
            content: error instanceof Error ? error.message : 'Failed to generate cryptocurrency data',
          });
        }

        dataStream.writeData({ type: 'finish', content: '' });

        return {
          result: `I've displayed information about ${cryptoName} including current price, market data, and price history.`,
        };
      } catch (error) {
        console.error('Error in request crypto tool:', error);
        return {
          result: `I'm sorry, there was an error retrieving information about ${cryptoName}.`,
        };
      }
    },
  }); 