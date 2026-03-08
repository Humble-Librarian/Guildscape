import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Default constants (matching the seeded values)
const DEFAULT_CONSTANTS = [
    { key: 'MERGED_PR_COINS', value: 100, description: 'Coins for merging a PR' },
    { key: 'MERGED_PR_ENERGY', value: 50, description: 'Energy for merging a PR' },
    { key: 'ISSUE_CLOSED_COINS', value: 30, description: 'Coins for closing an issue' },
    { key: 'ISSUE_CLOSED_ENERGY', value: 10, description: 'Energy for closing an issue' },
    { key: 'PUSH_COIN_MULTIPLIER', value: 5, description: 'Coin multiplier for push events' },
    { key: 'PUSH_ENERGY_MULTIPLIER', value: 1, description: 'Energy multiplier for push events' },
    { key: 'DAILY_ENERGY_REFILL', value: 100, description: 'Energy refilled each day' },
    { key: 'MAX_EVENTS_PER_DAY', value: 200, description: 'Max scoreable events per user per day' }
];

export async function POST(request) {
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

        // Reset all constants to default values
        const updates = DEFAULT_CONSTANTS.map(constant => 
            supabaseAdmin
                .from('scoring_constants')
                .update({ 
                    value: constant.value,
                    updated_at: new Date().toISOString()
                })
                .eq('key', constant.key)
        );

        const results = await Promise.all(updates);
        
        // Check for any errors
        const errors = results.filter(result => result.error);
        if (errors.length > 0) {
            console.error('Errors resetting constants:', errors);
            return NextResponse.json({ error: 'Failed to reset some constants' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'All constants reset to default values',
            resetConstants: DEFAULT_CONSTANTS
        });

    } catch (err) {
        if (err instanceof Response) return err;
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}