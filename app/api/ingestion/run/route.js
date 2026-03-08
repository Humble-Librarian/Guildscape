import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { INGESTION, MILESTONES } from '@/lib/constants';
import { loadConstantsFromDB, scoreEvent, isValidPushEvent, applyDailyEventCap } from '@/lib/scoring';
import { fetchUserEvents, extractMeaningfulEvents, filterBotAccounts, deduplicatePushEvents } from '@/lib/github';

export async function POST(request) {
    // 1. Verify authentication
    let user;
    try {
        user = await requireAuth(request);
    } catch (res) {
        return res; // 401 Response thrown by requireAuth
    }

    try {
        // 2. Load user row (need github_username and github_access_token)
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, github_username, github_access_token')
            .eq('id', user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { github_username, github_access_token } = userData;

        if (!github_username || !github_access_token) {
            return NextResponse.json({ error: 'GitHub account not connected' }, { status: 400 });
        }

        // 3. Load scoring constants from DB
        const constants = await loadConstantsFromDB(supabaseAdmin);

        // 4. Count today's already-scored events for this user
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayStartISO = todayStart.toISOString();

        const { count: todayEventCount, error: countError } = await supabaseAdmin
            .from('activities')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', todayStartISO);

        if (countError) {
            console.error('Error counting today\'s events:', countError);
        }

        const eventsAlreadyToday = todayEventCount ?? 0;

        // 5. Check daily cap
        const MAX_EVENTS_PER_DAY = INGESTION.MAX_EVENTS_PER_ACCOUNT_PER_DAY;
        if (eventsAlreadyToday >= MAX_EVENTS_PER_DAY) {
            return NextResponse.json({
                message: 'Daily cap reached',
                coinsEarned: 0
            });
        }

        // 6. Fetch raw events from GitHub
        let rawEvents;
        try {
            rawEvents = await fetchUserEvents(github_username, github_access_token);
        } catch (err) {
            if (err.message === 'RATE_LIMITED') {
                return NextResponse.json({ error: 'GitHub API rate limited. Try again later.' }, { status: 429 });
            }
            throw err;
        }

        if (!rawEvents || rawEvents.length === 0) {
            return NextResponse.json({
                eventsProcessed: 0,
                coinsEarned: 0,
                energyEarned: 0,
                newMilestones: []
            });
        }

        // 7. Check if user is a bot
        const isBot = filterBotAccounts(github_username, userData.user_type);
        if (isBot) {
            return NextResponse.json({ error: 'Bot accounts are not eligible' }, { status: 403 });
        }

        // 8. Normalize events
        let normalizedEvents = extractMeaningfulEvents(rawEvents);

        // 9. For push events: deduplicate then validate
        const pushEvents = normalizedEvents.filter(e => e.event_type === 'push');
        const nonPushEvents = normalizedEvents.filter(e => e.event_type !== 'push');

        const deduplicatedPushes = deduplicatePushEvents(pushEvents);
        const validPushes = deduplicatedPushes.filter(e => isValidPushEvent(e));

        normalizedEvents = [...nonPushEvents, ...validPushes];

        // 10. Filter out events already in our activities table (idempotency)
        const eventIds = normalizedEvents.map(e => e.github_event_id);

        const { data: existingActivities, error: existingError } = await supabaseAdmin
            .from('activities')
            .select('github_event_id')
            .in('github_event_id', eventIds);

        if (existingError) {
            console.error('Error checking existing activities:', existingError);
        }

        const existingIds = new Set((existingActivities || []).map(a => a.github_event_id));
        normalizedEvents = normalizedEvents.filter(e => !existingIds.has(e.github_event_id));

        // 11. Apply daily cap — only process enough events to reach 200 total for today
        const remainingSlots = MAX_EVENTS_PER_DAY - eventsAlreadyToday;
        normalizedEvents = applyDailyEventCap(normalizedEvents, remainingSlots);

        // 12–13. Score each event and save
        let totalCoinsEarned = 0;
        let totalEnergyEarned = 0;
        let eventsProcessed = 0;

        for (const event of normalizedEvents) {
            const { coins, energy } = scoreEvent(event, constants);

            if (coins <= 0 && energy <= 0) {
                continue;
            }

            try {
                // 13a. Insert into activities table
                const { error: insertError } = await supabaseAdmin
                    .from('activities')
                    .insert({
                        user_id: user.id,
                        github_event_id: event.github_event_id,
                        event_type: event.event_type,
                        event_payload: {
                            action: event.action,
                            repo_name: event.repo_name,
                            changed_files: event.changed_files,
                            changed_lines: event.changed_lines
                        },
                        coins_awarded: coins,
                        energy_awarded: energy,
                        created_at: event.created_at
                    });

                if (insertError) {
                    console.error(`Failed to insert activity for event ${event.github_event_id}:`, insertError);
                    continue;
                }

                // 13b. Add coins and energy to the user's membership row
                const { error: membershipError } = await supabaseAdmin.rpc('increment_membership_rewards', {
                    p_user_id: user.id,
                    p_coins: coins,
                    p_energy: energy
                });

                if (membershipError) {
                    console.error(`Failed to update membership for event ${event.github_event_id}:`, membershipError);
                }

                // 13c. Add coins to world_state.total_coins
                const { error: worldError } = await supabaseAdmin.rpc('increment_world_coins', {
                    p_coins: coins
                });

                if (worldError) {
                    console.error(`Failed to update world_state for event ${event.github_event_id}:`, worldError);
                }

                totalCoinsEarned += coins;
                totalEnergyEarned += energy;
                eventsProcessed++;
            } catch (err) {
                // Never let a single failed event write crash the whole ingestion run
                console.error(`Exception processing event ${event.github_event_id}:`, err);
                continue;
            }
        }

        // 14. Check for new milestones
        const newMilestones = [];

        try {
            // Get current world state
            const { data: worldState, error: wsError } = await supabaseAdmin
                .from('world_state')
                .select('total_coins, milestones_unlocked')
                .single();

            if (!wsError && worldState) {
                const totalCoins = worldState.total_coins ?? 0;
                const currentMilestones = worldState.milestones_unlocked ?? [];

                const milestoneChecks = [
                    { name: 'park', threshold: MILESTONES.PARK_COINS_THRESHOLD },
                    { name: 'library', threshold: MILESTONES.LIBRARY_COINS_THRESHOLD },
                    { name: 'monument', threshold: MILESTONES.MONUMENT_COINS_THRESHOLD },
                ];

                for (const milestone of milestoneChecks) {
                    if (totalCoins >= milestone.threshold && !currentMilestones.includes(milestone.name)) {
                        newMilestones.push(milestone.name);
                    }
                }

                // Update milestones_unlocked if new ones were crossed
                if (newMilestones.length > 0) {
                    const updatedMilestones = [...currentMilestones, ...newMilestones];
                    const { error: msError } = await supabaseAdmin
                        .from('world_state')
                        .update({ milestones_unlocked: updatedMilestones })
                        .eq('id', worldState.id ?? 1);

                    if (msError) {
                        console.error('Failed to update milestones:', msError);
                    }
                }
            }
        } catch (err) {
            console.error('Exception checking milestones:', err);
        }

        // 15. Return results
        return NextResponse.json({
            eventsProcessed,
            coinsEarned: totalCoinsEarned,
            energyEarned: totalEnergyEarned,
            newMilestones
        });

    } catch (err) {
        console.error('Ingestion pipeline error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
