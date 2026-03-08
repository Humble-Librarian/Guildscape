import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { MedievalSharp } from 'next/font/google';
import Link from 'next/link';

const fontMedieval = MedievalSharp({ weight: '400', subsets: ['latin'] });

// Add custom client-side button component for the Request action
import RequestToJoinButton from './RequestToJoinButton';

export default async function InvitePage({ params }) {
    const code = params.code;

    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    // If user is not logged in
    if (!session) {
        return (
            <div style={{ backgroundColor: '#1A2410', color: '#e0d8c8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ backgroundColor: '#0f1409', padding: '3rem', borderRadius: '8px', border: '2px solid #3D3527', textAlign: 'center', maxWidth: '400px' }}>
                    <h1 className={fontMedieval.className} style={{ color: '#C9A84C', marginBottom: '1.5rem', fontSize: '2rem' }}>A New Realm Awaits</h1>
                    <p style={{ color: '#a0a0a0', marginBottom: '2rem', lineHeight: '1.5' }}>
                        You've been invited to join a Guildscape world. Please sign in to accept your invitation.
                    </p>
                    <Link
                        href="/auth/login"
                        className={fontMedieval.className}
                        style={{ display: 'inline-block', padding: '0.75rem 2rem', backgroundColor: '#C9A84C', color: '#1A2410', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.2rem' }}
                    >
                        Sign in with GitHub
                    </Link>
                </div>
            </div>
        );
    }

    // User IS logged in: Fetch invite details
    const { data: invite, error } = await supabase
        .from('invites')
        .select(`
       id, status, invite_code, invitee_user_id,
       worlds ( name ),
       users!invites_invited_by_fkey ( github_username, avatar_url, display_name )
    `)
        .eq('invite_code', code)
        .single();

    if (error || !invite) {
        return (
            <div style={{ backgroundColor: '#1A2410', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h2 className={fontMedieval.className} style={{ color: '#ff6b6b' }}>Invalid or expired invite link.</h2>
            </div>
        );
    }

    // Pre-validate conditions for UI feedback
    if (invite.status !== 'pending') {
        return (
            <div style={{ backgroundColor: '#1A2410', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h2 className={fontMedieval.className} style={{ color: '#ff6b6b' }}>This invite has already been resolved.</h2>
            </div>
        );
    }

    if (invite.invitee_user_id && invite.invitee_user_id !== session.user.id) {
        return (
            <div style={{ backgroundColor: '#1A2410', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <h2 className={fontMedieval.className} style={{ color: '#ff6b6b' }}>This invite was submitted by someone else.</h2>
            </div>
        );
    }

    const worldName = invite.worlds?.name || 'an unknown world';
    const inviter = invite.users;
    const isAlreadyRequested = invite.invitee_user_id === session.user.id;

    return (
        <div style={{ backgroundColor: '#1A2410', color: '#e0d8c8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ backgroundColor: '#212B16', padding: '3rem', borderRadius: '12px', border: '2px solid #C9A84C', textAlign: 'center', maxWidth: '500px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {inviter?.avatar_url && (
                    <img
                        src={inviter.avatar_url}
                        alt={`${inviter.github_username}'s avatar`}
                        style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #C9A84C', marginBottom: '1rem' }}
                    />
                )}

                <h1 className={fontMedieval.className} style={{ color: '#e0d8c8', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
                    You've been invited to join
                </h1>
                <h2 className={fontMedieval.className} style={{ color: '#C9A84C', marginBottom: '2rem', fontSize: '2.5rem', margin: '0 0 2rem 0' }}>
                    {worldName}!
                </h2>

                {isAlreadyRequested ? (
                    <div style={{ padding: '1rem', backgroundColor: '#2A3F24', border: '1px solid #4A6B3A', borderRadius: '8px', color: '#e0d8c8' }}>
                        <p style={{ margin: 0 }}>Request sent! Waiting for <strong>{inviter?.github_username}</strong> to approve.</p>
                        <br />
                        <Link href="/dashboard" style={{ color: '#C9A84C', textDecoration: 'underline' }}>Return to your dashboard</Link>
                    </div>
                ) : (
                    <RequestToJoinButton inviteCode={code} />
                )}
            </div>
        </div>
    );
}
