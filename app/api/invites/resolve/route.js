import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
    try {
        const user = await requireAuth(request);
        const { inviteId, action } = await request.json(); // action = 'approve' | 'reject'

        if (!inviteId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // Verify user is an owner of a world
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from('memberships')
            .select('world_id')
            .eq('user_id', user.id)
            .eq('role', 'owner')
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: 'Only world owners can resolve invites' }, { status: 403 });
        }

        const worldId = membership.world_id;

        // Fetch the specific invite to ensure it belongs to their world and is pending
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('invites')
            .select('*')
            .eq('id', inviteId)
            .eq('world_id', worldId)
            .single();

        if (inviteError || !invite) {
            return NextResponse.json({ error: 'Invite not found or you lack permission' }, { status: 404 });
        }

        if (invite.status !== 'pending' || !invite.invitee_user_id) {
            return NextResponse.json({ error: 'Invite is not pending a request' }, { status: 400 });
        }

        // REJECT FLOW
        if (action === 'reject') {
            const { error: updateError } = await supabaseAdmin
                .from('invites')
                .update({ status: 'rejected', resolved_at: new Date().toISOString() })
                .eq('id', inviteId);

            if (updateError) throw updateError;
            return NextResponse.json({ success: true });
        }

        // APPROVE FLOW
        // 1. Double check room < 4
        const { data: currentMembers, error: membersError } = await supabaseAdmin
            .from('memberships')
            .select('plot_index, user_id')
            .eq('world_id', worldId);

        if (membersError) throw membersError;

        if (currentMembers.length >= 4) {
            return NextResponse.json({ error: 'World is already full (max 4 members)' }, { status: 400 });
        }

        // Check if the user is already in somehow
        if (currentMembers.find(m => m.user_id === invite.invitee_user_id)) {
            // Just silently ignore or mark as approved since they are already here
            await supabaseAdmin.from('invites').update({ status: 'approved', resolved_at: new Date().toISOString() }).eq('id', inviteId);
            return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
        }

        // 2. Find lowest available plot index (0-3)
        const takenPlots = new Set(currentMembers.map(m => m.plot_index));
        let nextAvailable = 0;
        while (takenPlots.has(nextAvailable) && nextAvailable < 4) {
            nextAvailable++;
        }

        if (nextAvailable >= 4) {
            return NextResponse.json({ error: 'No plots available' }, { status: 400 }); // Should be caught by length check above but safe
        }

        // 3. Insert new membership
        const { error: insertError } = await supabaseAdmin
            .from('memberships')
            .insert({
                world_id: worldId,
                user_id: invite.invitee_user_id,
                role: 'member',
                plot_index: nextAvailable,
                coins: 0,
                energy: 100
            });

        if (insertError) {
            console.error('Failed to create membership record:', insertError);
            return NextResponse.json({ error: 'Failed to add member to world' }, { status: 500 });
        }

        // 4. Update invite status
        await supabaseAdmin
            .from('invites')
            .update({ status: 'approved', resolved_at: new Date().toISOString() })
            .eq('id', inviteId);

        return NextResponse.json({
            success: true,
            newMember: {
                userId: invite.invitee_user_id,
                plotIndex: nextAvailable
            }
        });

    } catch (err) {
        if (err instanceof Response) return err;
        console.error('Resolve invite API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
