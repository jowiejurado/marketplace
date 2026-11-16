-- Marketplace: run in Supabase → SQL Editor → New query → Run. Safe to run again.
-- Works in the same Supabase project as the Wall; it only adds new tables.

-- 1. Listings -----------------------------------------------------------------

create table if not exists public.listings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(trim(title)) between 3 and 80),
  description   text not null default '' check (char_length(description) <= 2000),
  price         numeric(10, 2) not null check (price >= 0 and price <= 10000000),
  category      text not null check (category in (
                  'Vehicles', 'Property Rentals', 'Apparel', 'Classifieds', 'Electronics',
                  'Entertainment', 'Family', 'Free Stuff', 'Garden & Outdoor', 'Hobbies',
                  'Home Goods', 'Home Improvement', 'Home Sales', 'Musical Instruments',
                  'Office Supplies', 'Pet Supplies', 'Sporting Goods', 'Toys & Games')),
  seller_email  text not null check (seller_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(seller_email) <= 254),
  location      text not null default 'Palo Alto, CA' check (char_length(trim(location)) between 2 and 80),
  image_url     text check (
                  image_url like '%/storage/v1/object/public/listing-images/%'
                  or image_url like 'https://images.unsplash.com/%'),
  created_at    timestamptz not null default now()
);

create index if not exists listings_created_at_idx on public.listings (created_at desc);
create index if not exists listings_category_idx on public.listings (category, created_at desc);

-- 2. Messages from buyers ---------------------------------------------------

create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references public.listings (id) on delete cascade,
  buyer_name    text not null check (char_length(trim(buyer_name)) between 1 and 60),
  buyer_email   text not null check (buyer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(buyer_email) <= 254),
  seller_email  text not null,
  message       text not null check (char_length(trim(message)) between 1 and 1000),
  created_at    timestamptz not null default now()
);

create index if not exists messages_listing_id_idx on public.messages (listing_id);

-- seller_email always comes from the listing, never from the buyer's request.
create or replace function public.set_message_seller_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select seller_email into new.seller_email from public.listings where id = new.listing_id;
  if new.seller_email is null then
    raise exception 'Listing not found';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_set_seller_email on public.messages;
create trigger messages_set_seller_email
  before insert on public.messages
  for each row execute function public.set_message_seller_email();

-- 3. Row Level Security ------------------------------------------------------
-- No login, so visitors use the public anon key.
-- Listings: anyone can read and create; nobody can edit or delete through the API.
-- Messages: anyone can send one, but nobody can read them back through the API,
-- so buyers' emails and messages are never public.

alter table public.listings enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Anyone can view listings" on public.listings;
create policy "Anyone can view listings" on public.listings
  for select to anon, authenticated using (true);

drop policy if exists "Anyone can create listings" on public.listings;
create policy "Anyone can create listings" on public.listings
  for insert to anon, authenticated with check (true);

drop policy if exists "Anyone can send a message" on public.messages;
create policy "Anyone can send a message" on public.messages
  for insert to anon, authenticated with check (true);

-- Only these columns can be filled in by visitors; id and created_at come from
-- the database so listings can't be backdated to sit at the top.
revoke insert, update, delete on public.listings from anon, authenticated;
grant insert (title, description, price, category, seller_email, location, image_url)
  on public.listings to anon, authenticated;

revoke select, insert, update, delete on public.messages from anon, authenticated;
grant insert (listing_id, buyer_name, buyer_email, message) on public.messages to anon, authenticated;

-- 4. Listing photos -----------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload listing images" on storage.objects;
create policy "Anyone can upload listing images" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'listing-images');

-- 5. Payments (Stripe Connect) -------------------------------------------------
-- Sellers connect a Stripe account by email; buyers pay through Stripe Checkout.
-- Only the server writes these, using the service-role key (SUPABASE_SERVICE_ROLE_KEY),
-- so visitors can't mark a listing sold or attach their own Stripe account through the API.

alter table public.listings add column if not exists status text not null default 'available';
alter table public.listings add column if not exists sold_at timestamptz;
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check check (status in ('available', 'sold'));
-- status and sold_at aren't in the anon insert grant above, so a new listing is always available.

create table if not exists public.sellers (
  email              text primary key check (email = lower(email) and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  stripe_account_id  text not null unique,
  charges_enabled    boolean not null default false,
  details_submitted  boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references public.listings (id) on delete restrict,
  seller_email        text not null,
  stripe_account_id   text not null,
  stripe_session_id   text not null unique,
  amount_total        integer not null check (amount_total > 0),       -- cents
  application_fee     integer not null check (application_fee >= 0),   -- cents
  currency            text not null default 'usd',
  buyer_email         text,
  status              text not null default 'pending' check (status in ('pending', 'paid')),
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

create index if not exists orders_listing_id_idx on public.orders (listing_id);

-- RLS on with no policies: the anon key can't read or write either table.
-- The service role bypasses RLS, so only the server can use them.
alter table public.sellers enable row level security;
alter table public.orders enable row level security;
revoke all on public.sellers from anon, authenticated;
revoke all on public.orders from anon, authenticated;
