'use server';

import { getSuggestionsByDocumentId } from '@/lib/db/queries';
import { textDocumentHandler } from './text/server';
import { codeDocumentHandler } from './code/server';
import { imageDocumentHandler } from './image/server';
import { sheetDocumentHandler } from './sheet/server';
import { cryptoDocumentHandler } from './crypto/server';
import { DocumentHandler } from '@/lib/artifacts/server';

export async function getSuggestions({ documentId }: { documentId: string }) {
  const suggestions = await getSuggestionsByDocumentId({ documentId });
  return suggestions ?? [];
}

// Create an async wrapper function to expose the crypto handler
export async function getCryptoDocumentHandler(): Promise<DocumentHandler<'crypto'>> {
  return cryptoDocumentHandler;
}
