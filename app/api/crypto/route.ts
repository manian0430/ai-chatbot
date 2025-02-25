import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol') || 'bitcoin';
    
    // Redirect to the search API with the symbol as the query
    const searchUrl = new URL('/api/crypto/search', url.origin);
    searchUrl.searchParams.set('query', symbol);
    
    return NextResponse.redirect(searchUrl.toString());
  } catch (error) {
    console.error('Error in crypto API:', error);
    return NextResponse.json(
      { error: 'Failed to redirect to crypto search' },
      { status: 500 }
    );
  }
} 