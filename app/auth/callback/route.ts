import { NextRequest, NextResponse } from 'next/server';

// Auth callback stub — Supabase auth removed for MVP
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/simulation`);
}
