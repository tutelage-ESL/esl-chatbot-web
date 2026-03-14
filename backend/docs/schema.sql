-- Create a table for public profiles
create table users (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique,
  created_at timestamp with time zone default now()
);

-- Create a table for chat history
create table chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  message text not null,
  response text not null,
  created_at timestamp with time zone default now()
);

-- Create a table for user progress
create table progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users on delete cascade not null,
  score integer not null,
  topic text,
  created_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS) for users table
alter table users enable row level security;
create policy "Public users are viewable by themselves." on users for select using (auth.uid() = id);
create policy "Users can insert their own profile." on users for insert with check (auth.uid() = id);
create policy "Users can update own profile." on users for update using (auth.uid() = id);

-- Set up Row Level Security (RLS) for chat_history table
alter table chat_history enable row level security;
create policy "Chat history is viewable by user." on chat_history for select using (auth.uid() = user_id);
create policy "Users can insert their own chat history." on chat_history for insert with check (auth.uid() = user_id);

-- Set up Row Level Security (RLS) for progress table
alter table progress enable row level security;
create policy "Progress is viewable by user." on progress for select using (auth.uid() = user_id);
create policy "Users can insert their own progress." on progress for insert with check (auth.uid() = user_id);
create policy "Users can update own progress." on progress for update using (auth.uid() = user_id);