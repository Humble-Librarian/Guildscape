import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// Get the start of current week (Monday)
function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek.toISOString();
}

// Get next milestone thresholds
const MILESTONE_THRESHOLDS = {
    park: 100,
    library: 500,
    monument: 2000
};

export async function GET(request) {
    try {
        const user = await requireAuth(request);
        
        // Get the github_id from the session user
        const github_id = user.identities?.[0]?.provider_id ?? user.user_metadata?.provider_id ?? user.id;
        
        // First, look up the database user by github_id
        const { data: dbUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('github_id', github_id)
            .single();
        
        if (userError || !dbUser) {
            console.error('User lookup error:', userError, 'github_id:', github_id);
            return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
        }

        // 1. Get the current user's membership & world using the database user ID
        const { data: currentMembership, error: membershipError } = await supabaseAdmin
            .from('memberships')
            .select('*, worlds(*)')
            .eq('user_id', dbUser.id)
            .single();

        if (membershipError || !currentMembership) {
            console.error('Membership error:', membershipError);
            return NextResponse.json({ error: 'Membership not found', details: membershipError?.message }, { status: 404 });
        }

        const world = currentMembership.worlds;

        // 2. Get all members for this world
        const { data: members, error: membersError } = await supabaseAdmin
            .from('memberships')
            .select(`
        id, role, plot_index, coins, energy, joined_at,
        users (id, github_username, display_name, avatar_url)
      `)
            .eq('world_id', world.id)
            .order('plot_index', { ascending: true });

        if (membersError) {
            console.error('Error fetching members:', membersError);
        }

        // 3. Get recent activities for the current user (last 20)
        const { data: recentActivities, error: activitiesError } = await supabaseAdmin
            .from('activities')
            .select('*')
            .eq('user_id', dbUser.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (activitiesError) {
            console.error('Error fetching activities:', activitiesError);
        }

        // 4. Calculate weekly progress
        const startOfWeek = getStartOfWeek();
        
        // Get activities from this week
        const { data: weeklyActivities, error: weeklyError } = await supabaseAdmin
            .from('activities')
            .select('coins_awarded, created_at')
            .eq('user_id', dbUser.id)
            .gte('created_at', startOfWeek);

        let coinsThisWeek = 0;
        let eventsThisWeek = 0;
        
        if (weeklyActivities && !weeklyError) {
            coinsThisWeek = weeklyActivities.reduce((sum, activity) => sum + (activity.coins_awarded || 0), 0);
            eventsThisWeek = weeklyActivities.length;
        }

        // Get unlocked milestones from world_state
        const { data: worldState, error: worldStateError } = await supabaseAdmin
            .from('world_state')
            .select('milestones_unlocked')
            .eq('world_id', world.id)
            .single();

        const unlockedMilestones = worldState?.milestones_unlocked || [];
        
        // Determine next milestone
        let nextMilestone = null;
        const milestoneOrder = ['park', 'library', 'monument'];
        
        for (const milestone of milestoneOrder) {
            if (!unlockedMilestones.includes(milestone)) {
                const threshold = MILESTONE_THRESHOLDS[milestone];
                nextMilestone = {
                    name: milestone.charAt(0).toUpperCase() + milestone.slice(1),
                    coinsNeeded: threshold,
                    coinsRemaining: Math.max(0, threshold - coinsThisWeek)
                };
                break;
            }
        }

        // If all milestones are unlocked
        if (!nextMilestone && unlockedMilestones.length >= 3) {
            nextMilestone = {
                name: 'All milestones unlocked',
                coinsNeeded: 0,
                coinsRemaining: 0
            };
        }

        return NextResponse.json({
            world,
            currentMembership,
            members: (members || []).map(m => ({
                membership: {
                    id: m.id,
                    role: m.role,
                    plot_index: m.plot_index,
                    coins: m.coins,
                    energy: m.energy,
                    joined_at: m.joined_at
                },
                user: m.users
            })),
            recentActivities: recentActivities || [],
            weeklyProgress: {
                coinsThisWeek,
                eventsThisWeek,
                nextMilestone
            }
        });
    } catch (err) {
        if (err instanceof Response) return err;
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
