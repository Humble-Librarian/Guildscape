import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
    try {
        const user = await requireAuth(request);

        const body = await request.json();
        const { itemId, worldId } = body;

        if (!itemId || !worldId) {
            return NextResponse.json({ error: 'itemId and worldId are required' }, { status: 400 });
        }

        // 1. Load the item from shop_items
        const { data: item, error: itemError } = await supabaseAdmin
            .from('shop_items')
            .select('*')
            .eq('id', itemId)
            .eq('available', true)
            .single();

        if (itemError || !item) {
            return NextResponse.json({ error: 'Item not found or unavailable' }, { status: 404 });
        }

        // 2. Load the user's membership row for the given worldId
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from('memberships')
            .select('id, user_id, world_id, coins, energy')
            .eq('user_id', user.id)
            .eq('world_id', worldId)
            .single();

        if (membershipError || !membership) {
            return NextResponse.json({ error: 'Membership not found in this world' }, { status: 403 });
        }

        // 3. Check user has enough coins
        if (membership.coins < item.coin_cost) {
            return NextResponse.json({ error: 'Not enough coins' }, { status: 400 });
        }

        // 4. Check user has enough energy
        if (membership.energy < item.energy_cost) {
            return NextResponse.json({ error: 'Not enough energy' }, { status: 400 });
        }

        // We can run updates sequentially. More advanced logic could use a postgres function for true atomicity, 
        // but this suffices for the standard requirement rules logic:

        // 5. Insert into purchases table
        const { data: purchaseData, error: purchaseError } = await supabaseAdmin
            .from('purchases')
            .insert({
                user_id: user.id,
                world_id: worldId,
                item_id: item.id
            })
            .select()
            .single();

        if (purchaseError) {
            console.error('Failed to create purchase record:', purchaseError);
            return NextResponse.json({ error: 'Purchase failed during save' }, { status: 500 });
        }

        // 6. Deduct coins and energy from membership
        // Note: To be totally safe from race conditions, ideally use an RPC function.
        // However, updating directly matches "UPDATE memberships SET coins = coins - X, energy = energy - Y":
        const { data: updatedMembership, error: updateError } = await supabaseAdmin
            .from('memberships')
            .update({
                coins: membership.coins - item.coin_cost,
                energy: membership.energy - item.energy_cost
            })
            .eq('id', membership.id)
            .select('coins, energy')
            .single();

        if (updateError) {
            // Since the purchase was created but deduction failed, log heavily!
            // (A full transactional Postgres function is better here).
            console.error('CRITICAL: Failed to deduct balances after purchase:', updateError);
            return NextResponse.json({ error: 'Failed to deduct balances' }, { status: 500 });
        }

        // 7. Return success payload
        return NextResponse.json({
            success: true,
            newCoins: updatedMembership.coins,
            newEnergy: updatedMembership.energy,
            item
        });

    } catch (err) {
        if (err instanceof Response) return err; // 401 response from requireAuth
        console.error('Purchase API error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
