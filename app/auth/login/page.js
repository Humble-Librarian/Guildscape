'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
export default function LoginPage() {
  const supabase = createClientComponentClient();

  async function handleGitHubLogin() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'read:user public_repo',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('GitHub login error:', error);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Guildscape</h1>
        <p className="login-subtitle">Developer gamification platform</p>
        <button
          type="button"
          onClick={handleGitHubLogin}
          className="login-button"
        >
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}
