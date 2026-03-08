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

        const worldId = membership.world_id;

        // Get world stats
        const { data: worldStats, error: worldError } = await supabaseAdmin
            .from('world_state')
            .select('total_coins, milestones_unlocked')
            .eq('world_id', worldId)
            .single();

        if (worldError) {
            console.error('Error fetching world stats:', worldError);
        }

        // Get member count
        const { count: memberCount, error: countError } = await supabaseAdmin
            .from('memberships')
            .select('*', { count: 'exact', head: true })
            .eq('world_id', worldId);

        if (countError) {
            console.error('Error fetching member count:', countError);
        }

        // Get recent activities count
        const { count: activityCount, error: activityError } = await supabaseAdmin
            .from('activities')
            .select('*', { count: 'exact', head: true })
            .eq('world_id', worldId);

        if (activityError) {
            console.error('Error fetching activity count:', activityError);
        }

        return NextResponse.json({
            worldId,
            totalCoins: worldStats?.total_coins || 0,
            milestonesUnlocked: worldStats?.milestones_unlocked || [],
            memberCount: memberCount || 0,
            activityCount: activityCount || 0,
            lastUpdated: worldStats?.last_updated || null
        });

    } catch (err) {
        if (err instanceof Response) return err;
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}