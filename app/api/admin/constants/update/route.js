import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
    try {
        const user = await requireAuth(request);
        const { key, value } = await request.json();

        // Validate input
        if (!key || value === undefined) {
            return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
        }

        // Validate value is a positive number
        const numValue = Number(value);
        if (isNaN(numValue) || numValue <= 0) {
            return NextResponse.json({ error: 'Value must be a positive number' }, { status: 400 });
        }

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

        // Update the constant
        const { data, error } = await supabaseAdmin
            .from('scoring_constants')
            .update({ 
                value: numValue,
                updated_at: new Date().toISOString()
            })
            .eq('key', key)
            .select()
            .single();

        if (error) {
            console.error('Error updating constant:', error);
            return NextResponse.json({ error: 'Failed to update constant' }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Constant not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            key: data.key,
            newValue: data.value,
            updatedAt: data.updated_at
        });

    } catch (err) {
        if (err instanceof Response) return err;
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}