// This file is safe to import in client components
// It re-exports the types and provides functions for accessing data via API

// Import types only from the types file, not schema
import type { Document, Message, Vote, User, Suggestion } from './types';

// Re-export the types for use in client components
export type { Document, Message, Vote, User, Suggestion };

// Base API URLs for client components to use
export const API_ROUTES = {
  DOCUMENT: '/api/document',
  SUGGESTIONS: '/api/suggestions',
  VOTE: '/api/vote',
  CHAT: '/api/chat',
  CRYPTO: '/api/crypto',
  CRYPTO_SEARCH: '/api/crypto/search',
};

// Define a fetcher function for client components
export async function fetcher(url: string) {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    throw error;
  }
  
  return res.json();
}

// Use this function for safely getting documents on the client
export async function getDocumentById(id: string): Promise<Document | null> {
  try {
    const response = await fetch(`${API_ROUTES.DOCUMENT}?id=${id}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching document:', error);
    return null;
  }
}

// Explicitly isolate server-only code with conditional imports
if (typeof window === 'undefined') {
  // Server-side only imports will go here
  // This code won't be included in client bundles
} 