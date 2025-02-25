import { generateUUID } from '@/lib/utils';
import { DataStreamWriter, tool } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';
import { getCryptoDocumentHandler } from '@/artifacts/actions';
import { ARTIFACT_KINDS } from '@/lib/artifacts/server';

interface RequestCryptoProps {
  session: Session;
  dataStream: DataStreamWriter;
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

      dataStream.writeData({
        type: 'clear',
        content: '',
      });

      // Get the crypto document handler
      const cryptoDocumentHandler = await getCryptoDocumentHandler();

      // Create the crypto document
      await cryptoDocumentHandler.onCreateDocument({
        id,
        title: cryptoName,
        dataStream,
        session,
      });

      dataStream.writeData({ type: 'finish', content: '' });

      return {
        result: `I've displayed information about ${cryptoName} including current price, market data, and price history.`,
      };
    },
  }); 