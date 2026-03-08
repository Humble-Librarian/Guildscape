import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
    try {
        const user = await requireAuth(request);
        const { inviteCode } = await request.json();

        if (!inviteCode) {
            return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
        }

        // Find the invite
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('invites')
            .select('*')
            .eq('invite_code', inviteCode)
            .eq('status', 'pending')
            .single();

        if (inviteError || !invite) {
            return NextResponse.json({ error: 'Invalid, used, or expired invite code' }, { status: 400 });
        }

        // Check if the invite has already been requested by someone else (race condition / shared link)
        if (invite.invitee_user_id && invite.invitee_user_id !== user.id) {
            return NextResponse.json({ error: 'Invite already used' }, { status: 400 });
        }

        // Prevent owner from accepting their own invite (redundant, but good practice)
        if (invite.invited_by === user.id) {
            return NextResponse.json({ error: 'You are already the owner of this world' }, { status: 400 });
        }

        // Check if requesting user is already a member of this world
        const { data: existingMembership, error: membershipError } = await supabaseAdmin
            .from('memberships')
            .select('id')
            .eq('world_id', invite.world_id)
            .eq('user_id', user.id)
            .single();

        // If a row exists, they are already a member
        if (existingMembership) {
            return NextResponse.json({ error: 'Already a member' }, { status: 400 });
        }

        // Update invite row with their user_id to "claim" the request (status remains pending)
        const { error: updateError } = await supabaseAdmin
            .from('invites')
            .update({ invitee_user_id: user.id })
            .eq('id', invite.id)
            .eq('status', 'pending');

        if (updateError) {
            console.error('Invite update error:', updateError);
            return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Request sent. Waiting for approval.' });

    } catch (err) {
        if (err instanceof Response) return err;
        console.error('Invite request API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
