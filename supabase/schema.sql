create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key,
  user_id uuid references users(id) on delete set null,
  destination_city text not null,
  trip_length_days int not null,
  budget text not null,
  travel_style text not null,
  pace text not null,
  constraints text,
  confidence_score numeric,
  created_at timestamptz not null default now()
);

create table if not exists imported_content (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  url text,
  title text,
  places text[],
  city text,
  category text,
  vibe_tags text[],
  price_level text,
  source_type text,
  raw_text text,
  created_at timestamptz not null default now()
);

create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  category_weights jsonb not null,
  vibe_weights jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists places (
  id text primary key,
  name text not null,
  city text not null,
  category text not null,
  vibe_tags text[] not null,
  price_level text not null,
  estimated_visit_duration_mins int not null,
  neighborhood text,
  latitude numeric,
  longitude numeric,
  opening_hours text,
  source_credibility_score numeric,
  specificity_score numeric,
  popularity_score numeric,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  place_id text not null,
  score numeric not null,
  why text,
  breakdown jsonb,
  created_at timestamptz not null default now()
);

create table if not exists itineraries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  day int not null,
  stop_order int not null,
  time_window text not null,
  place_id text not null,
  score numeric,
  why text,
  created_at timestamptz not null default now()
);

create table if not exists feedback_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  place_id text not null,
  action text not null,
  rating numeric,
  discovered_by_wandr boolean,
  created_at timestamptz not null default now()
);
