-- Create table demands
create table if not exists demands (
  id uuid primary key default gen_random_uuid(),
  raw_text text,
  parsed jsonb,
  status text default 'pending' check (status in ('pending', 'routed', 'in_progress', 'done')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Optional: Enable Row Level Security (RLS)
alter table demands enable row level security;

-- Optional: Create a policy that allows everyone to read (adjust as needed)
create policy "Enable read access for all users" on demands for select using (true);

-- Optional: Create a policy that allows anon/authenticated to insert
create policy "Enable insert access for all users" on demands for insert with check (true);
