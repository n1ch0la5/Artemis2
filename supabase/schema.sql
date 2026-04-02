-- ── Artemis II Tracker — Supabase Schema ────────────────────────────────────
-- Run this once in your Supabase project → SQL Editor.

-- Persistent reaction counts
create table if not exists reactions (
  emoji   text primary key,
  count   bigint not null default 0,
  updated_at timestamptz default now()
);

-- Seed the emoji rows so we can use simple UPDATEs
insert into reactions (emoji, count) values
  ('👀', 0), ('🚀', 0), ('🌕', 0),
  ('❤️', 0), ('🙌', 0), ('✨', 0)
on conflict do nothing;

-- RPC: atomic increment (avoids race conditions)
create or replace function increment_reaction(p_emoji text)
returns void language plpgsql as $$
begin
  insert into reactions (emoji, count) values (p_emoji, 1)
  on conflict (emoji) do update
    set count      = reactions.count + 1,
        updated_at = now();
end;
$$;

-- Allow anonymous reads and increments (anon key is safe here)
alter table reactions enable row level security;

create policy "anyone can read reactions"
  on reactions for select using (true);

create policy "anyone can increment reactions"
  on reactions for insert with check (true);

-- RLS doesn't cover RPCs by default — grant execute to anon
grant execute on function increment_reaction(text) to anon;

-- ── Enable Realtime on reactions table (optional) ────────────────────────────
-- This lets the frontend subscribe to table changes if you want to drive
-- reaction counts from DB changes instead of broadcast events.
-- alter publication supabase_realtime add table reactions;
