import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const user = await requireAuth(request);

        // Get the user's world membership
        // We only create an invite if they are the owner of their current/main world.
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from('memberships')
            .select('world_id, role')
            .eq('user_id', user.id)
            .eq('role', 'owner')
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: 'Only the world owner can generate invites' }, { status: 403 });
        }

        const worldId = membership.world_id;

        // Check if world is full (4 max members)
        const { count, error: countError } = await supabaseAdmin
            .from('memberships')
            .select('*', { count: 'exact', head: true })
            .eq('world_id', worldId);

        if (countError) {
            return NextResponse.json({ error: 'Failed to check world capacity' }, { status: 500 });
        }

        if (count >= 4) {
            return NextResponse.json({ error: 'World is full (max 4 members)' }, { status: 400 });
        }

        // Generate relatively simple uppercase 8-character invite code
        const inviteCode = crypto.randomUUID().split('-')[0].toUpperCase();

        // Insert pending invite
        const { error: insertError } = await supabaseAdmin
            .from('invites')
            .insert({
                world_id: worldId,
                invited_by: user.id,
                invite_code: inviteCode,
                status: 'pending'
            });

        if (insertError) {
            console.error('Invite create error:', insertError);
            return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
        }

        // Using NEXTAUTH_URL as the base origin
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const inviteUrl = `${baseUrl}/invite/${inviteCode}`;

        return NextResponse.json({ inviteCode, inviteUrl });

    } catch (err) {
        if (err instanceof Response) return err;
        console.error('Invite create API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
