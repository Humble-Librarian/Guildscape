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
