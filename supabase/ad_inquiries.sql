-- Stores messages from the "Advertise with us" form (advertise.html).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
create table if not exists public.ad_inquiries (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now(),
    name text not null check (char_length(name) <= 200),
    business text check (char_length(business) <= 200),
    email text not null check (char_length(email) <= 200),
    phone text check (char_length(phone) <= 50),
    spot text check (char_length(spot) <= 100),
    state text check (char_length(state) <= 50),
    message text check (char_length(message) <= 2000)
);

alter table public.ad_inquiries enable row level security;

-- Visitors may submit the form, but nobody can read the messages through the public key.
-- You read them in the Supabase Table Editor.
drop policy if exists "Anyone can submit an ad inquiry" on public.ad_inquiries;
create policy "Anyone can submit an ad inquiry"
    on public.ad_inquiries for insert
    to anon
    with check (true);
