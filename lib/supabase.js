import { createClient } from '@supabase/supabase-js';

// Client-side (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-side (uses service role key — only use in API routes)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function getCurrentUser(supabaseClient) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.user ?? null;
}
