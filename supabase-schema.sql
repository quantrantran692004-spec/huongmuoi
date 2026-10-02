-- Chạy một lần trong Supabase SQL Editor.
create table if not exists public.exams (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  questions jsonb not null,
  duration_minutes integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete set null,
  title text not null,
  score integer not null default 0,
  correct integer not null default 0,
  total integer not null default 0,
  unanswered integer not null default 0,
  review jsonb,
  completed_at timestamptz not null default now()
);

alter table public.attempts add column if not exists review jsonb;
alter table public.exams add column if not exists duration_minutes integer not null default 0;

alter table public.exams enable row level security;
alter table public.attempts enable row level security;

drop policy if exists "users own exams" on public.exams;
create policy "users own exams" on public.exams for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "users own attempts" on public.attempts;
create policy "users own attempts" on public.attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
