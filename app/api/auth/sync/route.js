import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
  let userData;
  try {
    userData = await requireAuth(request);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const github_id = userData.identities?.[0]?.provider_id ?? userData.user_metadata?.provider_id ?? userData.id;
  const github_username = userData.user_metadata?.user_name ?? userData.user_metadata?.login ?? userData.email ?? 'user';
  const display_name = userData.user_metadata?.full_name ?? null;
  const avatar_url = userData.user_metadata?.avatar_url ?? null;
  const email = userData.email ?? null;

  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('github_id', github_id)
    .single();

  if (existingUser) {
    // Check if user has a world
    const { data: world, error: worldError } = await supabaseAdmin
      .from('worlds')
      .select('id')
      .eq('owner_id', existingUser.id)
      .single();

    console.log('Existing user check - world:', world, 'worldError:', worldError);

    // Check if membership exists (it might not if creation was interrupted)
    const { data: existingMembership, error: membershipCheckError } = await supabaseAdmin
      .from('memberships')
      .select('id')
      .eq('user_id', existingUser.id)
      .single();

    console.log('Existing user check - membership:', existingMembership, 'error:', membershipCheckError);

    // If world exists but membership doesn't, create the membership
    if (world && !existingMembership) {
      console.log('Creating missing membership for existing user');
      const { error: membershipError } = await supabaseAdmin
        .from('memberships')
        .insert({
          world_id: world.id,
          user_id: existingUser.id,
          role: 'owner',
          plot_index: 0,
          coins: 0,
          energy: 100,
        });

      if (membershipError) {
        console.error('Error creating missing membership:', membershipError);
      }

      // Also ensure world_state exists
      const { data: existingWorldState } = await supabaseAdmin
        .from('world_state')
        .select('id')
        .eq('world_id', world.id)
        .single();

      if (!existingWorldState) {
        await supabaseAdmin
          .from('world_state')
          .insert({
            world_id: world.id,
            total_coins: 0,
            milestones_unlocked: [],
          });
      }
    }

    return NextResponse.json({ isNew: false, worldId: world?.id });
  }

  const { data: newUser, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      email,
      github_id,
      github_username,
      display_name,
      avatar_url,
    })
    .select('id')
    .single();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const { data: newWorld, error: worldError } = await supabaseAdmin
    .from('worlds')
    .insert({
      name: `${github_username}'s World`,
      owner_id: newUser.id,
      theme: 'fantasy',
    })
    .select('id')
    .single();

  if (worldError) {
    return NextResponse.json({ error: worldError.message }, { status: 500 });
  }

  const { error: membershipError } = await supabaseAdmin
    .from('memberships')
    .insert({
      world_id: newWorld.id,
      user_id: newUser.id,
      role: 'owner',
      plot_index: 0,
      coins: 0,
      energy: 100,
    });

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const { error: worldStateError } = await supabaseAdmin
    .from('world_state')
    .insert({
      world_id: newWorld.id,
      total_coins: 0,
      milestones_unlocked: [],
    });

  if (worldStateError) {
    return NextResponse.json({ error: worldStateError.message }, { status: 500 });
  }

  return NextResponse.json({ isNew: true, worldId: newWorld.id });
}
