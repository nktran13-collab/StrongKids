-- StrongKids · Supabase schema
-- Chạy toàn bộ tệp này trong Supabase Dashboard → SQL Editor → New query → Run.
-- Mỗi tài khoản phụ huynh có đúng một hàng; toàn bộ hồ sơ bé, lịch, buổi tập,
-- kỷ lục và thông tin đồng ý nằm trong cột data (jsonb).

create table if not exists public.family_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.family_state is
  'Dữ liệu StrongKids của từng tài khoản phụ huynh. Mỗi hàng thuộc về auth.uid() và chỉ chủ tài khoản đọc/ghi được.';

-- Cột tiện cho việc tra cứu trong Table Editor, tự suy ra từ data.
alter table public.family_state
  add column if not exists parent_email text
    generated always as (data #>> '{parent,email}') stored,
  add column if not exists child_nickname text
    generated always as (data #>> '{child,nickname}') stored,
  add column if not exists child_birth_year integer
    generated always as ((data #>> '{child,birthYear}')::integer) stored;

-- Chỉ tài khoản đã đăng nhập mới có quyền trên bảng; RLS giới hạn từng hàng.
revoke all on public.family_state from anon;
grant select, insert, update, delete on public.family_state to authenticated;

alter table public.family_state enable row level security;
alter table public.family_state force row level security;

drop policy if exists "family_state_select_own" on public.family_state;
create policy "family_state_select_own"
  on public.family_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "family_state_insert_own" on public.family_state;
create policy "family_state_insert_own"
  on public.family_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "family_state_update_own" on public.family_state;
create policy "family_state_update_own"
  on public.family_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "family_state_delete_own" on public.family_state;
create policy "family_state_delete_own"
  on public.family_state for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- updated_at luôn do máy chủ đặt, không tin đồng hồ của thiết bị.
create or replace function public.touch_family_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists family_state_touch on public.family_state;
create trigger family_state_touch
  before update on public.family_state
  for each row execute function public.touch_family_state();
