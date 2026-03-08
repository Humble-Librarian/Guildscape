import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
    try {
        const user = await requireAuth(request);
        
        // Get the user's world to verify ownership
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from('memberships')
            .select('world_id, role')
            .eq('user_id', user.id)
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
        }

        // Only owners can access admin panel
        if (membership.role !== 'owner') {
            return NextResponse.json({ error: 'Forbidden: Owner access required' }, { status: 403 });
        }

        // Get all scoring constants
        const { data: constants, error: constantsError } = await supabaseAdmin
            .from('scoring_constants')
            .select('*')
            .order('key');

        if (constantsError) {
            console.error('Error fetching constants:', constantsError);
            return NextResponse.json({ error: 'Failed to fetch constants' }, { status: 500 });
        }

        return NextResponse.json({
            constants: constants || [],
            worldId: membership.world_id
        });

    } catch (err) {
        if (err instanceof Response) return err;
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}