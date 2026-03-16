/**************** TYPES ****************/
export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  pushed_at: string;
  updated_at: string;
}

export interface GitHubCommitActivity {
  total: number;
  week: number;
  days: number[];
}

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  payload: {
    commits?: unknown[];
    [key: string]: unknown;
  };
}
/***************************************/

const ENDPOINTS = {
  user:          (u: string) => `/users/${u}`,
  repos:         (u: string) => `/users/${u}/repos?sort=stars&per_page=100`,
  events:        (u: string, page: number = 1) => `/users/${u}/events/public?per_page=100&page=${page}`,
  languages:     (o: string, r: string) => `/repos/${o}/${r}/languages`,
  commitActivity:(o: string, r: string) => `/repos/${o}/${r}/stats/commit_activity`,
}

async function githubFetch(endpoint: string, token?: string) {
  // Fix for Next.js SSR fetching with relative URL
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, token }),
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    // If it's a 404, the original logic returned null. Let's return null to avoid completely breaking components.
    if (res.status === 404) return null;
    
    const body = await res.json().catch(() => ({}))
    throw new Error(`GitHub fetch failed: ${res.status} — ${body?.error ?? "unknown"}`)
  }

  return res.json()
}

// ── Public fetch functions ────────────────────────────────────────────────────

export async function fetchUser(username: string, token?: string) {
  return githubFetch(ENDPOINTS.user(username), token)
}

export async function fetchRepos(username: string, token?: string) {
  return githubFetch(ENDPOINTS.repos(username), token)
}

export async function fetchEvents(username: string, page: number = 1, token?: string) {
  return githubFetch(ENDPOINTS.events(username, page), token)
}

export async function fetchLanguages(owner: string, repo: string, token?: string) {
  return githubFetch(ENDPOINTS.languages(owner, repo), token)
}

export async function fetchCommitActivity(owner: string, repo: string, token?: string) {
  return githubFetch(ENDPOINTS.commitActivity(owner, repo), token)
}

// ── Heatmap — dual path ────────────────────────────────────────────────────────

/**
 * Path A: Events API (no token / fallback)
 * Returns commit counts per date from push events. Limited to ~300 events (~90 days for active users).
 */
export async function fetchHeatmapFromEvents(
  username: string,
  token?: string
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  // Paginate up to 10 pages (GitHub hard limit)
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${baseUrl}/api/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: `/users/${username}/events/public?per_page=100&page=${page}`,
        token,
      }),
      next: { revalidate: 3600 },
    })

    if (!res.ok) break
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break

    for (const event of data) {
      if (event.type !== "PushEvent") continue
      const date = event.created_at?.slice(0, 10)
      if (!date) continue
      const commitCount = event.payload?.commits?.length ?? 0
      counts[date] = (counts[date] ?? 0) + commitCount
    }
  }

  return counts
}

/**
 * Path B: GraphQL contributionsCollection (requires any PAT, even zero-scope)
 * Returns real GitHub contribution graph for the last 365 days.
 */
export async function fetchHeatmapFromGraphQL(
  username: string,
  token: string
): Promise<Record<string, number>> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  const now = new Date()
  now.setUTCHours(12, 0, 0, 0) // Noon UTC — avoids midnight boundary issues
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(now.getFullYear() - 1)

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `

  try {
    const res = await fetch(`${baseUrl}/api/github/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: {
          username,
          from: oneYearAgo.toISOString(),
          to: now.toISOString(),
        },
        token,
      }),
      next: { revalidate: 3600 },
    })

    if (!res.ok) return {}
    const json = await res.json()
    const weeks =
      json?.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? []

    const counts: Record<string, number> = {}
    for (const week of weeks) {
      for (const day of week.contributionDays) {
        if (day.contributionCount > 0) {
          counts[day.date] = day.contributionCount
        }
      }
    }
    return counts
  } catch {
    return {}
  }
}

/**
 * Unified heatmap fetch — GraphQL when token present, Events API otherwise.
 */
export async function fetchHeatmapData(
  username: string,
  token?: string
): Promise<{ counts: Record<string, number>; source: "graphql" | "events" }> {
  if (token) {
    const counts = await fetchHeatmapFromGraphQL(username, token)
    return { counts, source: "graphql" }
  }
  const counts = await fetchHeatmapFromEvents(username)
  return { counts, source: "events" }
}

// ── Commit Chart — 202-retry + owner-only commits ───────────────────────────

/**
 * Fetches commit activity with 202 retry. GitHub computes this async —
 * first call may return 202 + empty body while it's computing.
 */
async function fetchCommitActivityWithRetry(
  owner: string,
  repo: string,
  token?: string,
  retries = 3
): Promise<{ week: number; commits: number }[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${baseUrl}/api/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: `/repos/${owner}/${repo}/stats/commit_activity`,
        token,
      }),
    })

    if (res.status === 202) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      return []
    }

    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    
    // Preserve the unix timestamp for accurate month bucketing
    return data.map((w: { week: number; total: number }) => ({
      week: w.week,
      commits: w.total,
    }))
  }

  return []
}

/**
 * Fetches contributor stats to isolate only the profile owner's commits.
 * Handles 202 the same way as commit_activity.
 */
async function fetchOwnerCommitsPerWeek(
  owner: string,
  repo: string,
  token?: string,
  retries = 3
): Promise<{ week: number; commits: number }[]> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`${baseUrl}/api/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: `/repos/${owner}/${repo}/stats/contributors`,
        token,
      }),
    })

    if (res.status === 202) {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000))
        continue
      }
      return []
    }

    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []

    // Find entry for the repo owner only (case-insensitive)
    const ownerStats = data.find(
      (c: { author: { login: string } }) =>
        c.author?.login?.toLowerCase() === owner.toLowerCase()
    )

    if (!ownerStats) return []
    
    // Preserve the unix timestamp from each week object
    return (ownerStats.weeks as { w: number; c: number }[]).map((w) => ({
      week: w.w,
      commits: w.c,
    }))
  }

  return []
}

/**
 * Aggregates weekly commits across top repos, counting only the owner's commits.
 * Falls back to commit_activity totals if contributor stats are empty.
 * Returns the data grouped by month (last 12 months) for the AreaChart.
 */
export async function fetchCommitChartData(
  username: string,
  repos: { name: string }[],
  token?: string
): Promise<{ month: string; commits: number }[]> {
  const topRepos = repos.slice(0, 6)

  const perRepoWeeks = await Promise.all(
    topRepos.map(async (repo) => {
      const ownerWeeks = await fetchOwnerCommitsPerWeek(username, repo.name, token)
      if (ownerWeeks.length > 0) return ownerWeeks
      // Fallback to commit_activity (includes all authors)
      return fetchCommitActivityWithRetry(username, repo.name, token)
    })
  )

  // Aggregate by actual unix timestamp key
  const weekMap: Record<number, number> = {}
  for (const repoWeeks of perRepoWeeks) {
    for (const { week, commits } of repoWeeks) {
      weekMap[week] = (weekMap[week] ?? 0) + commits
    }
  }

  // A safer way: go month by month backwards from today
  // Let's build an ordered array of the last 12 months
  const result: { id: string; month: string; commits: number }[] = [];
  const now = new Date();
  
  for (let m = 11; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    result.push({
      id: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString("default", { month: "short" }),
      commits: 0
    });
  }

  // ✅ Use real unix timestamp — no index guessing
  for (const [weekTs, commits] of Object.entries(weekMap)) {
    const date = new Date(Number(weekTs) * 1000) // unix seconds → ms
    const mId = `${date.getFullYear()}-${date.getMonth()}`
    const bucket = result.find((r) => r.id === mId)
    if (bucket) bucket.commits += commits
  }

  // Return formatted array without ID
  return result.map(({ month, commits }) => ({ month, commits }));
}

