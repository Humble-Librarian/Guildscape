export const GITHUB_API_BASE = 'https://api.github.com';

export async function fetchUserEvents(githubUsername, accessToken) {
    const url = `${GITHUB_API_BASE}/users/${githubUsername}/events/public`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (response.status === 404) {
        return [];
    }

    if (response.status === 403 || response.status === 429) {
        throw new Error('RATE_LIMITED');
    }

    if (!response.ok) {
        throw new Error(`GitHub API error status: ${response.status}`);
    }

    return response.json();
}

export function extractMeaningfulEvents(rawEvents) {
    const targetTypes = ['PushEvent', 'PullRequestEvent', 'IssuesEvent'];

    return rawEvents
        .filter(event => targetTypes.includes(event.type))
        .map(event => {
            let event_type;

            if (event.type === 'PushEvent') {
                event_type = 'push';
            } else if (event.type === 'PullRequestEvent') {
                event_type = 'pull_request';
            } else if (event.type === 'IssuesEvent') {
                event_type = 'issues';
            }

            const normalized = {
                github_event_id: event.id,
                event_type,
                action: event.payload?.action,
                repo_name: event.repo?.name,
                created_at: event.created_at
            };

            if (event_type === 'push') {
                const commits = event.payload?.commits || [];
                normalized.changed_files = commits.length;

                let changed_lines = 0;
                for (const commit of commits) {
                    changed_lines += (commit.additions || 0) + (commit.deletions || 0);
                }
                normalized.changed_lines = Math.min(changed_lines, 500);
            }

            return normalized;
        });
}

export function filterBotAccounts(githubUsername, userType) {
    if (userType === 'Bot') {
        return true;
    }

    const lowername = githubUsername.toLowerCase();
    if (lowername.includes('bot') || lowername.includes('dependabot') || lowername.includes('[bot]')) {
        return true;
    }

    return false;
}

export function deduplicatePushEvents(events) {
    if (!events || events.length === 0) {
        return [];
    }

    // Sort events chronologically to correctly identify rolling windows
    const sortedEvents = [...events].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const deduplicated = [];
    let currentGroup = null;

    for (const event of sortedEvents) {
        if (!currentGroup) {
            currentGroup = { ...event };
        } else {
            const currentEventTime = new Date(event.created_at).getTime();
            const groupStartTime = new Date(currentGroup.created_at).getTime();

            // Check if within 10 minutes (600,000 ms) rolling window
            if (currentEventTime - groupStartTime <= 600000) {
                const combinedLines = (currentGroup.changed_lines || 0) + (event.changed_lines || 0);
                currentGroup.changed_lines = Math.min(combinedLines, 500);
            } else {
                // Outside window, flush current group and start new one
                deduplicated.push(currentGroup);
                currentGroup = { ...event };
            }
        }
    }

    if (currentGroup) {
        deduplicated.push(currentGroup);
    }

    return deduplicated;
}
