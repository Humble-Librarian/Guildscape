import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url));
    }
    
    // Add a small delay to ensure session is properly set
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Auth callback successful, redirecting to dashboard');
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
