-- ============================================
-- SEO Rank Writer — Initial Database Schema
-- ============================================

-- 1. profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'none' check (subscription_status in ('none', 'active', 'past_due', 'canceled')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  website_url text,
  phone text,
  email text,
  service_area text,
  default_keyword text,
  brand_tone text default 'professional',
  social_facebook text,
  social_instagram text,
  social_linkedin text,
  social_tiktok text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_projects_user on public.projects(user_id);

-- 3. articles
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  slug text,
  main_keyword text,
  location text,
  page_type text,
  article_html text,
  meta_title text,
  meta_description text,
  focus_keyword text,
  schema_json text,
  url_slug text,
  word_count integer,
  facebook text,
  instagram text,
  linkedin text,
  tiktok_script text,
  hashtags jsonb,
  keyword_suggestions jsonb,
  internal_links text,
  status text default 'draft' check (status in ('draft', 'published', 'archived')),
  wp_post_id integer,
  wp_published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_articles_project on public.articles(project_id);
create index if not exists idx_articles_user on public.articles(user_id);

-- 4. seo_scores
create table if not exists public.seo_scores (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  total_score integer not null,
  content_earned integer,
  content_max integer,
  meta_earned integer,
  meta_max integer,
  schema_earned integer,
  schema_max integer,
  links_earned integer,
  links_max integer,
  gsc_earned integer,
  gsc_max integer,
  wp_earned integer,
  wp_max integer,
  created_at timestamptz default now()
);
create index if not exists idx_seo_scores_article on public.seo_scores(article_id);

-- 5. wordpress_connections
create table if not exists public.wordpress_connections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  site_url text not null,
  auth_mode text not null check (auth_mode in ('plugin', 'basic')),
  api_key_encrypted text,
  username text,
  app_password_encrypted text,
  is_connected boolean default false,
  last_tested_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_wp_conn_project on public.wordpress_connections(project_id);

-- 6. gsc_connections
create table if not exists public.gsc_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expiry timestamptz,
  selected_property text,
  connected_at timestamptz default now()
);
create index if not exists idx_gsc_conn_user on public.gsc_connections(user_id);

-- 7. subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  status text not null default 'none',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. usage_limits
create table if not exists public.usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  generations integer default 0,
  wp_publishes integer default 0,
  media_generations integer default 0,
  report_generations integer default 0,
  created_at timestamptz default now(),
  unique (user_id, month)
);
create index if not exists idx_usage_user_month on public.usage_limits(user_id, month);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.articles enable row level security;
alter table public.seo_scores enable row level security;
alter table public.wordpress_connections enable row level security;
alter table public.gsc_connections enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_limits enable row level security;

-- profiles
create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

-- projects
create policy "Users CRUD own projects" on public.projects
  for all using (auth.uid() = user_id);

-- articles
create policy "Users CRUD own articles" on public.articles
  for all using (auth.uid() = user_id);

-- seo_scores
create policy "Users read own scores" on public.seo_scores
  for select using (
    exists (select 1 from public.articles where articles.id = seo_scores.article_id and articles.user_id = auth.uid())
  );
create policy "Users insert own scores" on public.seo_scores
  for insert with check (
    exists (select 1 from public.articles where articles.id = seo_scores.article_id and articles.user_id = auth.uid())
  );

-- wordpress_connections
create policy "Users CRUD own WP connections" on public.wordpress_connections
  for all using (auth.uid() = user_id);

-- gsc_connections
create policy "Users CRUD own GSC connections" on public.gsc_connections
  for all using (auth.uid() = user_id);

-- subscriptions
create policy "Users read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- usage_limits
create policy "Users read own usage" on public.usage_limits
  for select using (auth.uid() = user_id);
create policy "Users update own usage" on public.usage_limits
  for update using (auth.uid() = user_id);

-- ============================================
-- Auto-create profile on signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Updated_at trigger function
-- ============================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.update_updated_at();
create trigger articles_updated_at before update on public.articles
  for each row execute function public.update_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.update_updated_at();
