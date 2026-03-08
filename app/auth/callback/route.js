import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
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
    
    // Extract GitHub access token from the provider data
    const providerToken = data?.session?.provider_token;
    const user = data?.session?.user;
    
    console.log('Auth callback - provider token exists:', !!providerToken);
    console.log('Auth callback - user exists:', !!user);
    
    // Store the GitHub access token in the database
    if (providerToken && user) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const github_id = user.identities?.[0]?.provider_id ?? user.user_metadata?.provider_id ?? user.id;
      
      // Update user with the access token
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ github_access_token: providerToken })
        .eq('github_id', github_id);
      
      if (updateError) {
        console.error('Failed to store GitHub access token:', updateError);
      } else {
        console.log('GitHub access token stored successfully');
      }
    }
    
    // Add a small delay to ensure session is properly set
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Auth callback successful, redirecting to dashboard');
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}
