// This file is safe to import in client components
// It re-exports the types and provides functions for accessing data via API

// Re-export all types from the types file
export * from './types';

// Define helper functions for client components to fetch data
export const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  
  return res.json();
};

// Base API URLs for fetching data
export const API_ROUTES = {
  CHAT: '/api/chat',
  HISTORY: '/api/history',
  VOTE: '/api/vote',
  DOCUMENT: '/api/document',
  SUGGESTIONS: '/api/suggestions',
  CRYPTO: '/api/crypto/search',
}; 