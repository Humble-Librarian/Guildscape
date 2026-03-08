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
-- =============================================
-- RPC: increment_membership_rewards
-- Atomically adds coins and energy to a user's membership row.
-- Called from the ingestion pipeline after scoring an event.
-- =============================================
create or replace function increment_membership_rewards(
  p_user_id uuid,
  p_coins integer,
  p_energy integer
)
returns void
language plpgsql
security definer
as $$
begin
  update memberships
  set
    coins = coins + p_coins,
    energy = energy + p_energy
  where user_id = p_user_id;
end;
$$;

-- =============================================
-- RPC: increment_world_coins
-- Atomically adds coins to every world_state row
-- associated with the user's worlds.
-- For simplicity, accepts a world_id to target a specific world.
-- If no world_id is provided, increments all rows (single-world use case).
-- =============================================
create or replace function increment_world_coins(
  p_coins integer,
  p_world_id uuid default null
)
returns void
language plpgsql
security definer
as $$
begin
  if p_world_id is not null then
    update world_state
    set
      total_coins = total_coins + p_coins,
      last_updated = now()
    where world_id = p_world_id;
  else
    -- Single-world fallback: update all rows
    update world_state
    set
      total_coins = total_coins + p_coins,
      last_updated = now();
  end if;
end;
$$;
insert into shop_items (name, description, coin_cost, energy_cost, category, metadata) values
  ('Stone Fence', 'A sturdy stone fence around your plot', 50, 5, 'cosmetic', '{"type": "fence", "style": "stone"}'),
  ('Rose Garden', 'A small rose garden for your plot', 80, 10, 'cosmetic', '{"type": "garden", "style": "roses"}'),
  ('Banner Flag', 'A personal banner flag flying above your house', 30, 0, 'cosmetic', '{"type": "flag", "style": "banner"}'),
  ('Upgrade: Stone Walls', 'Upgrade your house walls from wood to stone', 150, 20, 'upgrade', '{"type": "house_upgrade", "level": 2}'),
  ('Torch Lights', 'Add glowing torches around your plot', 60, 5, 'cosmetic', '{"type": "light", "style": "torch"}'),
  ('Upgrade: Castle Tower', 'Add a small tower to your house', 300, 30, 'upgrade', '{"type": "house_upgrade", "level": 3}');
