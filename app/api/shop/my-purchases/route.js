import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request) {
    try {
        const user = await requireAuth(request);

        // Parse worldId from the query params
        const { searchParams } = new URL(request.url);
        const worldId = searchParams.get('worldId');

        if (!worldId) {
            return NextResponse.json({ error: 'worldId query parameter is required' }, { status: 400 });
        }

        // Returns all purchases for the current user in the current world
        // Joins with shop_items to return item details
        const { data: purchases, error } = await supabaseAdmin
            .from('purchases')
            .select(`
         id, purchased_at,
         shop_items (*)
      `)
            .eq('user_id', user.id)
            .eq('world_id', worldId)
            .order('purchased_at', { ascending: false });

        if (error) {
            console.error('Error fetching purchases:', error);
            return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
        }

        // Format the response to hoist the inner shop_item optionally or just return the joint array
        const formattedPurchases = (purchases || []).map(p => ({
            purchase_id: p.id,
            purchased_at: p.purchased_at,
            item: p.shop_items
        }));

        return NextResponse.json({ purchases: formattedPurchases });
    } catch (err) {
        if (err instanceof Response) return err; // 401 response from requireAuth
        console.error('My-purchases API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
