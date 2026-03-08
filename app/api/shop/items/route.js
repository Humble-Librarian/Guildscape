import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    try {
        const { data: items, error } = await supabaseAdmin
            .from('shop_items')
            .select('*')
            .eq('available', true)
            .order('coin_cost', { ascending: true });

        if (error) {
            console.error('Error fetching shop items:', error);
            return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
        }

        return NextResponse.json({ items: items || [] });
    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
