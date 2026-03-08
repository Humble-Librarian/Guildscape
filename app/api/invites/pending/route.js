import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
    try {
        const user = await requireAuth(request);

        // Verify user is an owner of a world
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from('memberships')
            .select('world_id')
            .eq('user_id', user.id)
            .eq('role', 'owner')
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: 'Only world owners can view pending invites' }, { status: 403 });
        }

        const worldId = membership.world_id;

        // Fetch all pending invites for this world where someone has requested to join
        const { data: invites, error: invitesError } = await supabaseAdmin
            .from('invites')
            .select(`
        id, created_at, invite_code,
        users!invites_invitee_user_id_fkey (
          id, github_username, display_name, avatar_url
        )
      `)
            .eq('world_id', worldId)
            .eq('status', 'pending')
            .not('invitee_user_id', 'is', null)
            .order('created_at', { ascending: false });

        if (invitesError) {
            console.error('Error fetching pending invites:', invitesError);
            return NextResponse.json({ error: 'Failed to fetch pending requests' }, { status: 500 });
        }

        // Format the response to be cleaner for the frontend
        const pendingRequests = invites.map(inv => ({
            inviteId: inv.id,
            code: inv.invite_code,
            createdAt: inv.created_at,
            user: inv.users
        }));

        return NextResponse.json({ requests: pendingRequests });

    } catch (err) {
        if (err instanceof Response) return err;
        console.error('Pending invites API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
