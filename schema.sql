-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: documents
create table defined_documents (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  translation text not null check (translation in ('ESV', 'NASB', 'NLT')),
  book_id integer not null,
  chapter integer not null,
  title text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: annotations
create table annotations (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references defined_documents(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  type text not null, -- 'highlight', 'underline', 'circle', 'box'
  color text,
  style text,
  verse integer,
  start_offset integer,
  end_offset integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: shapes (for tldraw)
create table shapes (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references defined_documents(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  shape_json jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Table: presets
create table presets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text not null,
  kind text not null,
  config_json jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table defined_documents enable row level security;
alter table annotations enable row level security;
alter table shapes enable row level security;
alter table presets enable row level security;

-- Documents Policies
create policy "Users can CRUD their own documents"
  on defined_documents for all
  using (auth.uid() = user_id);

-- Annotations Policies
create policy "Users can CRUD their own annotations"
  on annotations for all
  using (auth.uid() = user_id);

-- Shapes Policies
create policy "Users can CRUD their own shapes"
  on shapes for all
  using (auth.uid() = user_id);

-- Presets Policies
create policy "Users can CRUD their own presets"
  on presets for all
  using (auth.uid() = user_id);
