-- ============================================================
-- KEEPALIVE — chống Supabase Free plan tự pause project
--
-- Docs Supabase: "A Free plan project is considered inactive if it does not
-- receive sufficient USER DATABASE ACTIVITY over the past week... Typically a
-- few user requests to the database each day over the previous week is enough
-- to keep the project from being paused."
-- => Ping phải chạm thật vào Postgres, ping một URL bất kỳ là không đủ.
--
-- File này tạo:
--   1. bảng keepalive (1 dòng duy nhất) để lưu dấu vết lần ping cuối
--   2. function public.ping() — cron gọi qua PostgREST: POST /rest/v1/rpc/ping
-- ============================================================

create table if not exists public.keepalive (
  id            int primary key default 1,
  last_ping_at  timestamptz not null default now(),
  ping_count    bigint      not null default 0,
  last_source   text,
  constraint keepalive_singleton check (id = 1)
);

insert into public.keepalive (id) values (1) on conflict (id) do nothing;

alter table public.keepalive enable row level security;

-- Cho đọc công khai để anh tự kiểm tra cron còn sống hay không mà không cần
-- đăng nhập. Bảng này không chứa dữ liệu nghiệp vụ.
drop policy if exists "keepalive readable" on public.keepalive;
create policy "keepalive readable" on public.keepalive
  for select to anon, authenticated using (true);

-- Không mở policy INSERT/UPDATE/DELETE cho ai. Việc ghi đi qua đúng function
-- dưới đây (security definer), nên không thể sửa gì khác ngoài 1 dòng này.
create or replace function public.ping(source text default null)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at timestamptz;
begin
  update public.keepalive
     set last_ping_at = now(),
         ping_count   = ping_count + 1,
         last_source  = coalesce(source, last_source)
   where id = 1
  returning last_ping_at into v_at;

  return v_at;
end;
$$;

revoke all on function public.ping(text) from public;
grant execute on function public.ping(text) to anon, authenticated;

-- Bắt PostgREST nạp lại schema cache để /rpc/ping thấy được ngay.
notify pgrst, 'reload schema';
