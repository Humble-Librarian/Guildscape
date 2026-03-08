import { SCORING } from './constants.js';

export function scoreEvent(event, constants) {
    let coins = 0;
    let energy = 0;

    if (event.event_type === 'pull_request' && event.action === 'closed' && event.merged === true) {
        coins = constants.MERGED_PR_COINS;
        energy = constants.MERGED_PR_ENERGY;
    } else if (event.event_type === 'pull_request' && event.action === 'opened') {
        const changed_lines = event.changed_lines ?? 0;
        const multiplier = Math.min(3, Math.log10(1 + changed_lines / 10));
        coins = Math.floor(constants.OPENED_PR_COINS_BASE * multiplier);
        energy = constants.OPENED_PR_ENERGY;
    } else if (event.event_type === 'push') {
        const effective_lines = Math.max(1, Math.min(event.changed_lines ?? 1, 500));
        const contribution_factor = Math.sqrt(effective_lines);
        coins = Math.floor(constants.PUSH_COIN_MULTIPLIER * contribution_factor);
        energy = Math.floor(constants.PUSH_ENERGY_MULTIPLIER * contribution_factor);
    } else if (event.event_type === 'issues' && event.action === 'closed') {
        coins = constants.ISSUE_CLOSED_COINS;
        energy = constants.ISSUE_CLOSED_ENERGY;
    }

    // Ensure returning never negative values
    return {
        coins: Math.max(0, coins),
        energy: Math.max(0, energy)
    };
}

export function isValidPushEvent(event) {
    if (event.changed_files >= 1 && event.changed_lines >= 3) {
        return true;
    }
    return false;
}

export function applyDailyEventCap(events, maxPerDay = 200) {
    // Sort by created_at ascending
    const sorted = [...events].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sorted.slice(0, maxPerDay);
}

export async function loadConstantsFromDB(supabaseClient) {
    try {
        const { data, error } = await supabaseClient.from('scoring_constants').select('*');
        if (error) {
            console.error('Error fetching scoring constraints from DB:', error);
            return SCORING;
        }

        if (!data || data.length === 0) {
            return SCORING;
        }

        // If table has a single row with columns as properties
        if (data[0].MERGED_PR_COINS !== undefined) {
            return data[0];
        }

        // Else convert key-value rows to flat object
        return data.reduce((acc, row) => {
            const k = row.key || row.name || row.constant_name;
            const v = row.value !== undefined ? row.value : row.constant_value;
            if (k) acc[k] = v;
            return acc;
        }, {});
    } catch (err) {
        console.error('Exception fetching scoring constants from DB:', err);
        return SCORING;
    }
}

/* 
  --- Unit Tests for scoreEvent ---
  
  const testConstants = {
    MERGED_PR_COINS: 100, MERGED_PR_ENERGY: 50,
    OPENED_PR_COINS_BASE: 20, OPENED_PR_ENERGY: 5,
    PUSH_COIN_MULTIPLIER: 5, PUSH_ENERGY_MULTIPLIER: 1,
    ISSUE_CLOSED_COINS: 30, ISSUE_CLOSED_ENERGY: 10
  };

  1) Merged PR
     Input: { event_type: 'pull_request', action: 'closed', merged: true }
     Expected Output: { coins: 100, energy: 50 }

  2) Opened PR (0 lines changed)
     Input: { event_type: 'pull_request', action: 'opened', changed_lines: 0 }
     Expected Output: { coins: 0, energy: 5 }
     // Math.max(0, Math.floor(20 * Math.min(3, Math.log10(1 + 0/10)))) 

  3) Opened PR (90 lines changed)
     Input: { event_type: 'pull_request', action: 'opened', changed_lines: 90 }
     Expected Output: { coins: 20, energy: 5 }
     // Math.floor(20 * Math.log10(10)) = 20

  4) Push (100 lines changed)
     Input: { event_type: 'push', changed_lines: 100 }
     Expected Output: { coins: 50, energy: 10 }
     // effective_lines = 100, contribution = 10 -> coins = 5*10, energy = 1*10

  5) Push (Missing changed_lines)
     Input: { event_type: 'push' }
     Expected Output: { coins: 5, energy: 1 }
     // effective defaults to 1 -> contribution = 1

  6) Closed Issue
     Input: { event_type: 'issues', action: 'closed' }
     Expected Output: { coins: 30, energy: 10 }

  7) Unrecognized or non-point events (Opened Issue, Unmerged PR, etc.)
     Input: { event_type: 'pull_request', action: 'closed', merged: false }
     Expected Output: { coins: 0, energy: 0 }
*/
