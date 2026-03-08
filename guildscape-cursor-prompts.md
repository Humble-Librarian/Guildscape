# Guildscape — Full Cursor Prompt Series
> Stack: Next.js 14 (App Router) + Supabase + Vercel  
> Theme: Fantasy Isometric 2D  
> Structure: Phase-based → Feature-broken-down within each phase  

---

## HOW TO USE THESE PROMPTS
- Paste each prompt **one at a time** into Cursor.
- Do **not** skip a prompt or combine two prompts in one go.
- Each prompt assumes the previous one is fully done and working.
- Backend/logic prompts are spoon-fed and exact — follow them literally.
- UI prompts give creative freedom within the fantasy isometric direction.

---

# PHASE 1 — Project Setup & Foundation

---

## Prompt 1.1 — Scaffold the Next.js Project

```
Create a new Next.js 14 project using the App Router. Use JavaScript only — no TypeScript.

Project name: guildscape

Folder structure to create:
/guildscape
  /app
    /api               ← all API route handlers go here
    /auth              ← auth-related pages
    /dashboard         ← main app pages after login
    layout.js
    page.js            ← landing page
  /components
    /ui                ← reusable small components (buttons, modals, cards)
    /map               ← isometric map components
    /economy           ← coins, energy, shop components
    /feed              ← activity feed components
  /lib
    supabase.js        ← supabase client singleton
    github.js          ← GitHub API utility functions
    scoring.js         ← coin/energy scoring engine
    constants.js       ← all tunable constants in one place
  /styles
    globals.css
  /public
    /tiles             ← isometric tile images will go here later
  .env.local.example
  README.md

Install these packages:
- @supabase/supabase-js
- @supabase/auth-helpers-nextjs
- @supabase/auth-helpers-react
- axios
- date-fns
- lucide-react

In .env.local.example, add these empty keys:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

In /lib/constants.js, create and export these values exactly:
export const SCORING = {
  BASE_COMMIT_COIN_MULTIPLIER: 5,
  MERGED_PR_COINS: 100,
  MERGED_PR_ENERGY: 50,
  OPENED_PR_COINS_BASE: 20,
  OPENED_PR_ENERGY: 5,
  PUSH_COIN_MULTIPLIER: 5,
  PUSH_ENERGY_MULTIPLIER: 1,
  ISSUE_CLOSED_COINS: 30,
  ISSUE_CLOSED_ENERGY: 10,
};

export const ENERGY = {
  DAILY_REFILL: 100,
  MAX_CAP: 200,
  COSMETIC_ACTION_MIN_COST: 5,
  COSMETIC_ACTION_MAX_COST: 20,
};

export const INGESTION = {
  MAX_EVENTS_PER_ACCOUNT_PER_DAY: 200,
  COMMIT_SPAM_WINDOW_MINUTES: 10,
  MAX_LINES_PER_PUSH: 500,
  MIN_FILES_FOR_VALID_PUSH: 1,
  MIN_LINES_FOR_VALID_PUSH: 3,
};

export const MILESTONES = {
  PARK_COINS_THRESHOLD: 100,
  LIBRARY_COINS_THRESHOLD: 500,
  MONUMENT_COINS_THRESHOLD: 2000,
};

Do not build any pages yet. Just scaffold the folder structure, install packages, and create the constants file.
```

---

## Prompt 1.2 — Supabase Database Schema

```
We are using Supabase as our database. Create the database schema for Guildscape.

Go to /db/ and create a file called schema.sql with the following exact SQL:

-- USERS
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  github_id text unique not null,
  github_username text not null,
  display_name text,
  avatar_url text,
  github_access_token text,
  created_at timestamptz default now()
);

-- WORLDS (each user gets one world auto-created on signup)
create table worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null,          -- "[github_username]'s World"
  owner_id uuid references users(id) on delete cascade,
  theme text default 'fantasy',
  created_at timestamptz default now(),
  last_active_at timestamptz default now()
);

-- MEMBERSHIPS (one row per user per world they belong to)
create table memberships (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references worlds(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text default 'member',          -- 'owner' or 'member'
  plot_index integer not null,         -- 0 = first plot, 1 = second, etc.
  coins integer default 0,
  energy integer default 100,
  joined_at timestamptz default now(),
  unique(world_id, user_id),
  unique(world_id, plot_index)
);

-- ACTIVITIES (every scored GitHub event)
create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  world_id uuid references worlds(id) on delete cascade,
  github_event_id text unique,         -- for deduplication
  event_type text not null,            -- 'push', 'pull_request', 'issues'
  event_payload jsonb,
  coins_awarded integer default 0,
  energy_awarded integer default 0,
  created_at timestamptz default now()
);

-- SHOP ITEMS
create table shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  coin_cost integer not null,
  energy_cost integer default 0,
  category text,                        -- 'cosmetic', 'upgrade'
  metadata jsonb,
  available boolean default true
);

-- PURCHASES
create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  world_id uuid references worlds(id) on delete cascade,
  item_id uuid references shop_items(id),
  purchased_at timestamptz default now()
);

-- WORLD STATE (total coins, milestones, derived/cached data)
create table world_state (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references worlds(id) on delete cascade unique,
  total_coins integer default 0,
  milestones_unlocked jsonb default '[]',
  last_updated timestamptz default now()
);

-- INVITES
create table invites (
  id uuid primary key default gen_random_uuid(),
  world_id uuid references worlds(id) on delete cascade,
  invited_by uuid references users(id),
  invite_code text unique not null,
  status text default 'pending',        -- 'pending', 'approved', 'rejected'
  invitee_user_id uuid references users(id),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- SCORING CONSTANTS (admin-tunable, stored in DB)
create table scoring_constants (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value numeric not null,
  description text,
  updated_at timestamptz default now()
);

-- Seed default scoring constants
insert into scoring_constants (key, value, description) values
  ('MERGED_PR_COINS', 100, 'Coins for merging a PR'),
  ('MERGED_PR_ENERGY', 50, 'Energy for merging a PR'),
  ('ISSUE_CLOSED_COINS', 30, 'Coins for closing an issue'),
  ('ISSUE_CLOSED_ENERGY', 10, 'Energy for closing an issue'),
  ('PUSH_COIN_MULTIPLIER', 5, 'Coin multiplier for push events'),
  ('PUSH_ENERGY_MULTIPLIER', 1, 'Energy multiplier for push events'),
  ('DAILY_ENERGY_REFILL', 100, 'Energy refilled each day'),
  ('MAX_EVENTS_PER_DAY', 200, 'Max scoreable events per user per day');

Also create /db/migrations/001_initial.sql as a copy of the above.

Then update /lib/supabase.js to export both a client-side and server-side Supabase client:

import { createClient } from '@supabase/supabase-js';

// Client-side (uses anon key)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Server-side (uses service role key — only use in API routes)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

Do not build any pages or API routes yet.
```

---

# PHASE 2 — Auth & GitHub OAuth

---

## Prompt 2.1 — GitHub OAuth Login Flow

```
Implement GitHub OAuth login for Guildscape using Supabase Auth.

We only need GitHub OAuth — no email/password login for now.

Step 1: In Supabase dashboard, GitHub OAuth is already configured (we will do this manually). Assume GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are in .env.local.

Step 2: Create /app/auth/callback/route.js — this is the OAuth callback handler:

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}

Step 3: Create /app/auth/login/page.js — a simple login page:
- Show the Guildscape logo/name at the top
- Show a single button: "Continue with GitHub"
- Button calls supabase.auth.signInWithOAuth({ provider: 'github', options: { scopes: 'read:user public_repo' } })
- Fantasy dark background (deep forest green or midnight black)
- Simple and clean — this is a utility page, not a showpiece

Step 4: Update /app/layout.js to wrap the app in the Supabase auth session provider using @supabase/auth-helpers-react.

Step 5: Create /app/page.js as the landing page:
- If user is already logged in, redirect them to /dashboard
- If not, redirect to /auth/login
- Keep this file minimal — just a redirect check

Step 6: In /lib/supabase.js, add a helper function:
export async function getCurrentUser(supabaseClient) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.user ?? null;
}

Do not create the dashboard yet.
```

---

## Prompt 2.2 — Auto-World Creation on First Login

```
When a user logs in with GitHub for the first time, we need to:
1. Save them to our users table
2. Auto-create a world for them named "[github_username]'s World"
3. Create a membership row for them as 'owner' with plot_index = 0
4. Create a world_state row for the new world
5. Redirect them to /dashboard

Create /app/api/auth/sync/route.js as a POST endpoint:

Logic (implement exactly):
- Get current session from Supabase auth
- If no session, return 401
- Extract from session: github_id (provider_id), github_username (user_metadata.user_name), display_name (user_metadata.full_name), avatar_url (user_metadata.avatar_url), email
- Check if user already exists in our users table by github_id
- If user EXISTS:
  - Return { isNew: false, worldId: their world id }
- If user does NOT exist:
  - Insert into users table
  - Insert into worlds table: name = `${github_username}'s World`, owner_id = new user id, theme = 'fantasy'
  - Insert into memberships: world_id, user_id, role = 'owner', plot_index = 0, coins = 0, energy = 100
  - Insert into world_state: world_id, total_coins = 0, milestones_unlocked = []
  - Return { isNew: true, worldId: new world id }

Create /app/dashboard/page.js:
- This is a protected page
- On mount, call POST /api/auth/sync to ensure user is synced
- If not logged in (no session), redirect to /auth/login
- For now, just show a placeholder: "Welcome to [github_username]'s World" with the user's GitHub avatar
- We will build the full dashboard UI in Phase 4

Also create /lib/auth.js with a helper:
export async function requireAuth(request) {
  // For use in API routes — checks session, returns user or throws 401
}

This prompt does NOT include dashboard visuals. Just the sync logic and placeholder page.
```

---

# PHASE 3 — GitHub Activity Ingestion Engine

---

## Prompt 3.1 — GitHub API Service

```
Create the GitHub API service that fetches public activity for a connected user.

Create /lib/github.js and implement these functions exactly:

1. fetchUserEvents(githubUsername, accessToken)
   - Calls: GET https://api.github.com/users/{username}/events/public
   - Pass Authorization: Bearer {accessToken} header
   - Returns array of raw GitHub events
   - Handle errors: if 404, return []. If rate limited (403/429), throw an error with message 'RATE_LIMITED'

2. extractMeaningfulEvents(rawEvents)
   - Takes array of raw GitHub events
   - Filters to only these event types: 'PushEvent', 'PullRequestEvent', 'IssuesEvent'
   - For each event, returns a normalized object:
     {
       github_event_id: event.id,
       event_type: 'push' | 'pull_request' | 'issues',
       action: event.payload.action,           // 'opened', 'closed', 'merged', etc.
       repo_name: event.repo.name,
       changed_files: (for push) event.payload.commits.length,
       changed_lines: (for push) sum of all commits' additions + deletions — cap at 500,
       created_at: event.created_at
     }

3. filterBotAccounts(githubUsername, userType)
   - Returns true if the account is likely a bot
   - A bot is detected if:
     a. userType === 'Bot'
     b. username contains 'bot', 'dependabot', '[bot]'
   - Return false (not a bot) otherwise

4. deduplicatePushEvents(events)
   - Takes an array of normalized push events for a single user
   - Groups push events that are within a 10-minute rolling window of each other
   - For each group: combine all changed_lines (cap total at 500), keep the earliest timestamp, keep the first event's github_event_id
   - Returns the de-duplicated array where push groups become single events

Important: All functions should be pure (no DB calls). They only transform data.

Also export a constant:
export const GITHUB_API_BASE = 'https://api.github.com';
```

---

## Prompt 3.2 — Coin & Energy Scoring Engine

```
Create the scoring engine that converts normalized GitHub events into coin and energy rewards.

Create /lib/scoring.js and implement these functions exactly:

1. scoreEvent(event, constants)
   - Takes a normalized event object (from Prompt 3.1) and a constants object
   - Returns { coins: number, energy: number }
   - Logic (implement exactly):

   if event.event_type === 'pull_request' AND event.action === 'closed' AND event.merged === true:
     coins = constants.MERGED_PR_COINS    // default 100
     energy = constants.MERGED_PR_ENERGY  // default 50

   else if event.event_type === 'pull_request' AND event.action === 'opened':
     changed_lines = event.changed_lines ?? 0
     multiplier = Math.min(3, Math.log10(1 + changed_lines / 10))
     coins = Math.floor(constants.OPENED_PR_COINS_BASE * multiplier)  // base 20
     energy = constants.OPENED_PR_ENERGY  // 5

   else if event.event_type === 'push':
     effective_lines = Math.max(1, Math.min(event.changed_lines ?? 1, 500))
     contribution_factor = Math.sqrt(effective_lines)
     coins = Math.floor(constants.PUSH_COIN_MULTIPLIER * contribution_factor)
     energy = Math.floor(constants.PUSH_ENERGY_MULTIPLIER * contribution_factor)

   else if event.event_type === 'issues' AND event.action === 'closed':
     coins = constants.ISSUE_CLOSED_COINS   // 30
     energy = constants.ISSUE_CLOSED_ENERGY // 10

   else:
     coins = 0
     energy = 0

   Always return { coins, energy } — never negative values.

2. isValidPushEvent(event)
   - Returns true if:
     a. event.changed_files >= 1
     b. event.changed_lines >= 3
   - Returns false otherwise (do not score invalid pushes)

3. applyDailyEventCap(events, maxPerDay)
   - Takes array of events and a maxPerDay number (default 200)
   - Returns only the first maxPerDay events (sorted by created_at ascending)
   - This ensures no single user can farm more than maxPerDay events per day

4. loadConstantsFromDB(supabaseClient)
   - Fetches all rows from scoring_constants table
   - Returns a flat object like: { MERGED_PR_COINS: 100, MERGED_PR_ENERGY: 50, ... }
   - Falls back to the values in /lib/constants.js SCORING object if DB fetch fails

Write unit test cases as comments inside the file showing expected inputs and outputs for scoreEvent. Do not use a testing framework — just comments for now.
```

---

## Prompt 3.3 — Activity Ingestion API Route

```
Create the API route that runs the full ingestion pipeline: fetch → filter → score → save.

Create /app/api/ingestion/run/route.js as a POST endpoint.

This endpoint should:
1. Verify the user is authenticated (use requireAuth from /lib/auth.js). Return 401 if not.
2. Load the user's row from the users table (we need github_username and github_access_token)
3. Load scoring constants from DB using loadConstantsFromDB()
4. Fetch today's activities already saved for this user (to check daily cap):
   - Query activities table: user_id = current user, created_at >= start of today UTC
   - Count how many events already scored today
5. If already at MAX_EVENTS_PER_DAY (200), return { message: 'Daily cap reached', coinsEarned: 0 }
6. Fetch raw events from GitHub using fetchUserEvents()
7. Check if the user is a bot using filterBotAccounts() — if yes, return 403
8. Normalize events using extractMeaningfulEvents()
9. For push events: run deduplicatePushEvents(), then filter with isValidPushEvent()
10. For all events: filter out any github_event_id already in our activities table (deduplication)
11. Apply daily cap: only process enough events to reach 200 total for today
12. Score each event using scoreEvent()
13. For each scored event (coins > 0 OR energy > 0):
    a. Insert into activities table
    b. Add coins and energy to the user's membership row (use SQL: coins = coins + X)
    c. Add coins to world_state.total_coins
14. After all events saved: check if any new milestones have been crossed (compare total_coins to MILESTONES thresholds in constants.js). If yes, update world_state.milestones_unlocked array.
15. Return:
    {
      eventsProcessed: number,
      coinsEarned: number,
      energyEarned: number,
      newMilestones: array of milestone names (empty if none)
    }

Important rules:
- All DB writes in this endpoint should be wrapped in a try/catch
- Never let a single failed event write crash the whole ingestion run
- Log errors to console with the github_event_id so we can debug
- The endpoint should be idempotent — running it twice should not double-award coins (deduplication ensures this)
```

---

# PHASE 4 — Isometric World Map (Fantasy Theme)

---

## Prompt 4.1 — Isometric Canvas Setup

```
Build the isometric 2D canvas renderer for the Guildscape world map.

We are using an HTML5 Canvas element inside a React component. No external isometric libraries — we will hand-roll a simple isometric projection.

Create /components/map/IsometricCanvas.js

Isometric math to use (implement exactly):
- To convert tile grid coordinates (tileX, tileY) to screen coordinates (screenX, screenY):
  screenX = (tileX - tileY) * (TILE_WIDTH / 2)
  screenY = (tileX + tileY) * (TILE_HEIGHT / 2)
  Where TILE_WIDTH = 128 and TILE_HEIGHT = 64

The component should:
1. Accept props: { worldData, members, currentUserId, width, height }
2. Render a canvas element sized to the given width and height
3. Draw a grid of ground tiles (grass/stone fantasy style — use solid color fills for now, with a darker border to define tile edges)
4. Ground tile color: warm earthy tan (#C8A96E) with border (#8B6914)
5. Draw plots for each member — each member has a plot_index that maps to a tile position:
   - plot_index 0 → tileX: 4, tileY: 4
   - plot_index 1 → tileX: 6, tileY: 4
   - plot_index 2 → tileX: 4, tileY: 6
   - plot_index 3 → tileX: 6, tileY: 6
   (max 4 members for MVP — support up to 4 plots)
6. For each plot, draw a simple house shape (isometric box) using canvas fill operations:
   - Left wall: darker shade
   - Right wall: medium shade
   - Top (roof): lighter shade
   - Colors (fantasy stone): left wall #5C4A2A, right wall #7A6138, roof #A0845C
7. On click: detect which tile was clicked using reverse isometric math, emit an onTileClick(tileX, tileY, memberId) callback prop

Also create /components/map/useIsometricMap.js — a custom hook that:
- Takes worldData and members as input
- Returns { canvasRef, handleClick }
- Manages canvas drawing via useEffect whenever worldData/members change

Keep this completely decoupled from any data-fetching. It only renders what it receives as props.
```

---

## Prompt 4.2 — World Dashboard Page (Full UI)

```
Build the main dashboard page — this is the heart of Guildscape.

Update /app/dashboard/page.js to be a full, beautiful page with this layout:

TOP BAR:
- Left: Guildscape logo (text, fantasy font)
- Center: "[github_username]'s World" (world name)
- Right: User avatar, coin count (coin icon + number), energy count (lightning icon + number)

MAIN AREA (two-column layout):
- Left 70%: The isometric world map (use IsometricCanvas component from Prompt 4.1)
- Right 30%: A sidebar with two tabs: "Activity" and "Members"

ACTIVITY TAB (in sidebar):
- Shows the last 10 activity entries for the current user
- Each entry: avatar + "[username] merged a PR → +100 coins 🪙" style text
- Timestamp in relative time ("2 hours ago")
- Empty state: "No activity yet. Connect GitHub to start building your world."

MEMBERS TAB (in sidebar):
- Shows all world members
- Each member: avatar, username, coin count, energy count, "plot X" label
- Owner has a small crown icon

BOTTOM BAR:
- "Refresh Activity" button → calls POST /api/ingestion/run and updates UI
- "Invite Someone" button → opens invite modal (placeholder for now)
- "Shop" button → opens shop modal (placeholder for now)

Visual style:
- Dark fantasy color scheme: deep forest (#1A2410), stone grey (#3D3527), warm gold (#C9A84C)
- Fantasy serif font for headings (use Google Fonts — "MedievalSharp" or "Cinzel")
- Subtle parchment texture background for the sidebar (CSS pattern or gradient)
- The canvas map should fill its container responsively

Data fetching:
- On page load, call GET /api/worlds/mine to get the world data, members, and current user's coin/energy balance
- Create this API route: /app/api/worlds/mine/route.js
  - Returns: { world, members: [{ user, membership }], currentMembership, recentActivities }
  - All joined data from Supabase
```

---

## Prompt 4.3 — Society Landmarks on the Map

```
Add society-level landmarks to the isometric map. Landmarks unlock based on world_state.total_coins milestones.

Three landmarks for the Fantasy theme (MVP):
1. The Park — unlocks at 100 total coins
   - Position: tileX: 2, tileY: 4
   - Appearance: green tiles arranged in a small cluster (3 tiles)

2. The Library — unlocks at 500 total coins
   - Position: tileX: 8, tileY: 4
   - Appearance: a taller building (isometric box, taller than houses)

3. The Monument — unlocks at 2000 total coins
   - Position: tileX: 5, tileY: 2 (center/top of map)
   - Appearance: a tall narrow tower shape

Update IsometricCanvas.js to:
1. Accept a new prop: milestones_unlocked (array of strings like ['park', 'library'])
2. If 'park' is in milestones_unlocked: draw the park tiles at the park position
3. If 'library' is in milestones_unlocked: draw the library building
4. If 'monument' is in milestones_unlocked: draw the monument tower
5. For locked landmarks: draw a faint outline/ghost version (50% opacity, greyed out) so players can see what's coming

Also: when the ingestion run returns newMilestones that are newly unlocked, show a toast notification in the dashboard:
- "🏛️ Your world unlocked The Library!" with a gold border
- Auto-dismisses after 4 seconds

Draw all landmark shapes using canvas primitives only (no images needed yet).
```

---

# PHASE 5 — Economy System

---

## Prompt 5.1 — Shop Items Seeding & Shop API

```
Set up the shop items and the purchase API.

Step 1: Create a seed file /db/seeds/shop_items.sql with these items:

insert into shop_items (name, description, coin_cost, energy_cost, category, metadata) values
  ('Stone Fence', 'A sturdy stone fence around your plot', 50, 5, 'cosmetic', '{"type": "fence", "style": "stone"}'),
  ('Rose Garden', 'A small rose garden for your plot', 80, 10, 'cosmetic', '{"type": "garden", "style": "roses"}'),
  ('Banner Flag', 'A personal banner flag flying above your house', 30, 0, 'cosmetic', '{"type": "flag", "style": "banner"}'),
  ('Upgrade: Stone Walls', 'Upgrade your house walls from wood to stone', 150, 20, 'upgrade', '{"type": "house_upgrade", "level": 2}'),
  ('Torch Lights', 'Add glowing torches around your plot', 60, 5, 'cosmetic', '{"type": "light", "style": "torch"}'),
  ('Upgrade: Castle Tower', 'Add a small tower to your house', 300, 30, 'upgrade', '{"type": "house_upgrade", "level": 3}');

Step 2: Create /app/api/shop/items/route.js (GET):
- Returns all available shop items where available = true
- No auth required to view items

Step 3: Create /app/api/shop/purchase/route.js (POST):
- Accepts: { itemId, worldId }
- Requires auth — return 401 if not logged in
- Server-side validation (in this exact order):
  1. Load the item from shop_items — if not found or not available, return 404
  2. Load the user's membership row for the given worldId — if not found, return 403
  3. Check user has enough coins: membership.coins >= item.coin_cost — if not, return 400 { error: 'Not enough coins' }
  4. Check user has enough energy: membership.energy >= item.energy_cost — if not, return 400 { error: 'Not enough energy' }
  5. Insert into purchases table
  6. Deduct coins and energy from membership: UPDATE memberships SET coins = coins - X, energy = energy - Y
  7. Return { success: true, newCoins: updatedCoins, newEnergy: updatedEnergy, item }

Step 4: Create /app/api/shop/my-purchases/route.js (GET):
- Returns all purchases for the current user in the current world (pass worldId as query param)
- Joins with shop_items to return item details
```

---

## Prompt 5.2 — Shop Modal UI

```
Build the Shop modal component.

Create /components/economy/ShopModal.js

The modal should:
- Open when the "Shop" button in the dashboard bottom bar is clicked
- Display as a centered overlay with a dark fantasy-styled panel
- Title: "The Marketplace" with a coin icon

Layout inside the modal:
- Two sections: "Cosmetics" and "Upgrades" (filter shop items by category)
- Each item card shows:
  - Item name (bold, fantasy font)
  - Description (small, muted)
  - Cost: coin icon + coin amount, energy icon + energy amount (if > 0)
  - "Buy" button — disabled and greyed out if user can't afford it
  - "Owned" badge if user already purchased this item

User's current balance shown at the top of the modal: "Your coins: X 🪙 | Energy: Y ⚡"

On "Buy" click:
1. Show a loading spinner on that button
2. Call POST /api/shop/purchase
3. On success: show a brief "Purchased!" green flash, update coin/energy display, refresh purchases list
4. On error: show the error message ("Not enough coins", etc.) in red below the button

Close button (X) in top-right corner.

Clicking outside the modal closes it.

Style: same dark fantasy color scheme as the dashboard. Use CSS animations for the modal appearing (slide up + fade in).
```

---

# PHASE 6 — Invite & Approval System

---

## Prompt 6.1 — Invite Link Generation

```
Build the invite system — world owners can generate an invite link, and others can use it to request access.

Step 1: Create /app/api/invites/create/route.js (POST):
- Requires auth and the user must be the owner of the world (check memberships table: role = 'owner')
- If world already has 4 members (plot_index 0,1,2,3 are all taken), return 400 { error: 'World is full (max 4 members)' }
- Generate a unique invite_code: use crypto.randomUUID() and take first 8 characters, uppercase
- Insert into invites table: world_id, invited_by, invite_code, status = 'pending'
- Return { inviteCode, inviteUrl: `${process.env.NEXTAUTH_URL}/invite/${inviteCode}` }

Step 2: Create /app/invite/[code]/page.js:
- This is the page someone lands on when they click an invite link
- If user is NOT logged in: show a "Sign in with GitHub to join this world" button
- If user IS logged in:
  - Fetch the invite details from Supabase (find invite by code, join with worlds and users)
  - Show: "You've been invited to join [World Name]!" with the world owner's avatar
  - Show a "Request to Join" button
  - On click: call POST /api/invites/request

Step 3: Create /app/api/invites/request/route.js (POST):
- Accepts: { inviteCode }
- Requires auth
- Find the invite by code — if not found or status !== 'pending', return 400
- Check the requesting user is not already a member — if they are, return 400 { error: 'Already a member' }
- Update the invite row: invitee_user_id = current user id, status stays 'pending'
- Return { success: true, message: 'Request sent. Waiting for approval.' }
- If the invite code is used again by a different user, reject with 400 { error: 'Invite already used' }
```

---

## Prompt 6.2 — Approval Flow (Owner Approves / Rejects)

```
Build the approval UI where the world owner can approve or reject join requests.

Step 1: Create /app/api/invites/pending/route.js (GET):
- Requires auth, user must be world owner
- Returns all invites for this world where status = 'pending' and invitee_user_id IS NOT NULL
- Join with users table to return: invitee's display_name, avatar_url, github_username

Step 2: Create /app/api/invites/resolve/route.js (POST):
- Accepts: { inviteId, action } where action is 'approve' or 'reject'
- Requires auth, user must be world owner
- If action = 'reject':
  - Update invite status to 'rejected', set resolved_at = now()
  - Return { success: true }
- If action = 'approve':
  - Check world still has room (< 4 members)
  - Find the next available plot_index (lowest integer 0-3 not already taken in memberships)
  - Insert into memberships: world_id, user_id = invitee, role = 'member', plot_index = next available, coins = 0, energy = 100
  - Update invite status to 'approved', set resolved_at = now()
  - Return { success: true, newMember: { userId, plotIndex } }

Step 3: Add a "Pending Requests" section in the Members tab of the dashboard sidebar:
- Only visible to the world owner
- Shows each pending request with:
  - Requester's GitHub avatar and username
  - "Approve" (green button) and "Reject" (red button)
- After approving: the new member's house appears on the map immediately (refresh world data)
- After rejecting: the request disappears from the list

Step 4: Update the Invite modal (the "Invite Someone" button in the dashboard):
- Show the invite link with a "Copy Link" button
- Show how many slots are remaining: "2 of 3 invite slots remaining"
- Show current pending requests count: "1 pending request waiting for approval"
```

---

# PHASE 7 — Admin Panel

---

## Prompt 7.1 — Admin Panel: Scoring Constants Tuner

```
Build the admin panel where the world owner can tune scoring constants without code changes.

The admin panel is only accessible to the world owner. Add an "Admin" link in the top bar of the dashboard (only visible to owners).

Create /app/dashboard/admin/page.js:

Step 1: Load all scoring_constants rows from the DB via a new API route:
- Create /app/api/admin/constants/route.js (GET):
  - Requires auth, user must be world owner
  - Returns all rows from scoring_constants table

Step 2: Create /app/api/admin/constants/update/route.js (POST):
- Accepts: { key, value }
- Requires auth, user must be world owner
- Validates: value must be a positive number
- Updates the row in scoring_constants where key = given key
- Updates updated_at timestamp
- Returns { success: true, key, newValue: value }

Step 3: Build the Admin Panel UI:
- Title: "World Admin Panel"
- Section: "Scoring Constants"
- For each constant, show:
  - Constant name (humanized: MERGED_PR_COINS → "Merged PR Coins")
  - Description from DB
  - Current value (editable number input)
  - "Save" button next to it
  - Last updated timestamp
- When "Save" is clicked: call POST /api/admin/constants/update, show "Saved ✓" confirmation inline
- Reset to Default button at bottom: resets all values to the defaults defined in /lib/constants.js

Step 4: Section: "World Overview" (read-only stats):
- Total coins in the world
- Number of members
- Milestones unlocked (show as badges)
- A "Force Run Ingestion for All Members" button (calls POST /api/ingestion/run for each member — useful for testing)

Make the admin panel look like a medieval ledger / parchment document. Functional over flashy, but on-theme.
```

---

## Prompt 7.2 — Activity Feed Polish & Weekly Progress

```
Polish the activity feed and add the weekly progress bar.

Step 1: Update /app/api/worlds/mine/route.js to also return:
- recentActivities: last 20 activities for the current user, newest first
- weeklyProgress: {
    coinsThisWeek: sum of coins_awarded for current user this calendar week,
    eventsThisWeek: count of activities this week,
    nextMilestone: { name, coinsNeeded, coinsRemaining } — the next locked milestone
  }

Step 2: Update the Activity tab in the sidebar to use the new data:
- Each activity item humanized:
  - push → "You pushed code to {repo} → +{coins} coins"
  - pull_request merged → "You merged a PR in {repo} → +{coins} coins ⚔️"
  - pull_request opened → "You opened a PR in {repo} → +{coins} coins"
  - issues closed → "You closed an issue in {repo} → +{coins} coins 📜"
- Show relative timestamps: "3 hours ago", "Yesterday", etc. using date-fns formatDistanceToNow
- Coin amounts in gold color (#C9A84C)

Step 3: Add a Weekly Progress bar above the map canvas in the dashboard:
- Label: "This Week's Progress"
- Shows: coins earned this week as a progress bar toward the next milestone
- Example: [████████░░░░] 340 / 500 coins → Library
- If all milestones unlocked: show "All milestones unlocked! 🏆"
- Animated fill (CSS transition on width)

Step 4: Activity feed empty state:
- If no activities yet: show a friendly message with a ghost icon
- Text: "Your world is quiet... Push some code to bring it to life! 🏰"
- A "Connect & Refresh" button that triggers ingestion
```

---

# PHASE 8 — Final Polish & Deployment

---

## Prompt 8.1 — Landing Page

```
Build the public landing page for Guildscape at /app/page.js.

This is the page non-logged-in users see first. Make it visually stunning — this is the marketing face of the app.

Content sections:

1. HERO:
   - Headline: "Your code builds your world."
   - Sub-headline: "Guildscape turns your GitHub activity into a living fantasy kingdom. Every commit, every PR, every closed issue grows your realm."
   - CTA button: "Build Your World — It's Free" → goes to /auth/login
   - Behind the CTA: a static screenshot or canvas preview of the isometric map (use a placeholder image or draw a static canvas demo)

2. HOW IT WORKS (3 steps):
   - Step 1: "Connect GitHub" — sign in, we read your public activity
   - Step 2: "Code to earn" — merged PRs, pushes, and closed issues earn coins
   - Step 3: "Watch your kingdom grow" — spend coins on upgrades, unlock landmarks, invite friends

3. FEATURES:
   - "Your own isometric world" — private, personal, uniquely yours
   - "Invite friends" — friends get their own plots in your world
   - "Milestone landmarks" — hit group coin goals to unlock the Park, Library, Monument
   - "Anti-spam economy" — only meaningful work counts. No commit farming.

4. FOOTER:
   - "Guildscape — Build with Code"
   - GitHub link
   - "Made with ⚔️ and ☕"

Visual direction:
- Full dark fantasy aesthetic
- Use Cinzel or MedievalSharp font (Google Fonts) for headings
- Deep blacks, forest greens, warm gold accents
- Parchment-like texture overlays
- Scroll-triggered fade-in animations for each section
- The hero section should feel epic and immersive
```

---

## Prompt 8.2 — Environment Setup & Vercel Deployment

```
Prepare Guildscape for deployment on Vercel + Supabase.

Step 1: Create /vercel.json:
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install"
}

Step 2: Create a complete README.md with:
- What Guildscape is (one paragraph)
- Local setup instructions:
  1. Clone the repo
  2. npm install
  3. Copy .env.local.example to .env.local and fill in values
  4. Set up Supabase: create a new project, run /db/schema.sql in the SQL editor, run /db/seeds/shop_items.sql
  5. Set up GitHub OAuth App: go to GitHub Developer Settings → OAuth Apps → New OAuth App. Homepage URL: http://localhost:3000. Callback URL: http://localhost:3000/auth/callback. Copy Client ID and Secret to .env.local
  6. In Supabase: go to Auth → Providers → GitHub, enable it, add Client ID and Secret
  7. npm run dev
- Deployment instructions for Vercel
- Tech stack listing
- Environment variables reference

Step 3: Add a /app/api/health/route.js:
- GET endpoint
- Returns { status: 'ok', timestamp: new Date().toISOString() }
- Used for monitoring

Step 4: Ensure all API routes have proper error handling — wrap every handler in try/catch and return:
  - 500 with { error: 'Internal server error' } on unexpected failures
  - Never expose raw error messages or stack traces in production responses

Step 5: Add a Next.js middleware file /middleware.js:
- Protects all /dashboard/* routes — redirects to /auth/login if no session
- Allows public access to /, /auth/*, /invite/*, /api/health
- Uses @supabase/auth-helpers-nextjs createMiddlewareClient

Step 6: Final checklist — verify these all work before shipping:
[ ] User can sign up with GitHub and see their world
[ ] POST /api/ingestion/run returns coins for a real GitHub user
[ ] Shop purchase correctly deducts coins (test with insufficient coins too)
[ ] Invite link flow: generate → visit → request → approve → new member on map
[ ] Admin can change MERGED_PR_COINS and it affects the next ingestion run
[ ] /api/health returns 200
```

---

# POST-MVP NOTES (Do Not Build Yet)

These are features to add after the MVP is stable:

- **Private repo support** — add `repo` scope to GitHub OAuth, toggle in settings
- **Shareable PNG snapshot** — use html2canvas or a server-side render to export the world as an image
- **More themes** — Cyber (neon) and Cozy (cottages) theme variants
- **Mobile responsive** — full mobile layout pass
- **Weekly digest email** — Supabase Edge Functions + Resend/SendGrid
- **GitHub profile badge** — generate a small badge SVG users can paste into their README
- **Alternative inputs** — LeetCode, study apps, fitness connectors
- **Animated GIF snapshots** — post-social sharing feature

---

*End of Guildscape Cursor Prompt Series — 8 Phases, 16 Prompts*
