-- ============================================================
-- TRACE OS — RAISE TICKET (QA Innovation Tracker)
-- Supabase / PostgreSQL schema — màn hình Quản lý Ticket
-- Nguồn: src/apps/RaiseTicket.jsx (rt_staff, rt_tickets, rt_points, rt_emails)
-- ============================================================

-- ---------- ENUMS ----------
-- Giá trị giữ NGUYÊN chuỗi mà frontend đang gửi để không phải map lại.
create type ticket_level as enum ('NV', 'TP', 'TPCC', 'GD');
create type ticket_type  as enum ('Raise ticket', 'Thông báo', 'Phản hồi ticket');

-- ---------- LOOKUP: Business Units ----------
-- BU dùng chung ở staff + tickets + filter dashboard -> tách bảng để dropdown
-- lấy từ DB và đảm bảo toàn vẹn tham chiếu.
create table business_units (
  code        text primary key,          -- 'BU1', 'LAB-DONAVET', 'KHÁC'...
  name        text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

insert into business_units (code, sort_order) values
  ('BU1', 1), ('BU2', 2), ('BU3', 3), ('BU4', 4),
  ('LAB HO', 5), ('LAB-DONAVET', 6), ('GC', 7), ('KHÁC', 99);

-- ---------- STAFF (nhân sự + line báo cáo NV->TP->TPCC->GĐ) ----------
create table staff (
  code        text primary key,          -- mã NV: 'GD01', 'NV02'... (= id ở frontend)
  name        text not null,
  level       ticket_level not null,
  bu          text not null references business_units(code),
  reports_to  text references staff(code) on delete set null,  -- self-FK
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index staff_bu_idx         on staff (bu);
create index staff_reports_to_idx on staff (reports_to);

-- ---------- TICKETS ----------
create table tickets (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,       -- 'RT-BU1-12072026-001'
  type          ticket_type not null,
  bu            text not null references business_units(code),
  raiser_id     text references staff(code) on delete set null,  -- = raiserId
  raiser_name   text,                        -- snapshot lúc tạo (raiserName)
  raiser_level  ticket_level,                -- snapshot lúc tạo (raiserLevel)

  -- Mô tả sáng kiến 4W1H
  what          text not null,               -- bắt buộc (đúng validate ở UI)
  why           text,
  where_text    text,                        -- 'where' là từ khoá SQL -> đổi tên
  when_text     text,                        -- 'when'  là từ khoá SQL -> đổi tên
  how           text,
  note          text,

  -- Workflow / chấm điểm
  useful        boolean not null default false,
  custom_points numeric,                     -- null = dùng điểm mặc định theo cấu hình
  ticket_date   timestamptz not null default now(),  -- = date

  created_by    uuid references auth.users(id) default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index tickets_type_idx   on tickets (type);
create index tickets_bu_idx     on tickets (bu);
create index tickets_raiser_idx on tickets (raiser_id);
create index tickets_date_idx   on tickets (ticket_date);

-- ---------- POINT CONFIG (singleton = rt_points) ----------
-- Giữ nguyên cấu trúc lồng nhau của frontend dưới dạng JSONB để không phải
-- viết lại logic calcPoints(). Chỉ có đúng 1 dòng (id = 1).
create table point_config (
  id          int primary key default 1,
  config      jsonb not null,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now(),
  constraint point_config_singleton check (id = 1)
);

insert into point_config (id, config) values (1, '{
  "raise":    { "NV": 10, "TP": 1, "TPCC": 0.5, "GD_subordinate": 0.1, "GD_self": 20 },
  "announce": { "GD": 5, "TPCC": 1 },
  "feedback": { "GD": 4, "TPCC": 3, "TP": 2, "NV": 1 },
  "useful":   { "raiser": 100, "announcer": 15, "responder": 10 },
  "timePerPoint": 2
}'::jsonb);

-- ---------- REPORT EMAILS (rt_emails) ----------
create table report_emails (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now()
);

-- ---------- Trigger updated_at ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_staff_updated   before update on staff   for each row execute function set_updated_at();
create trigger trg_tickets_updated  before update on tickets for each row execute function set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- Bản prototype: mọi user đã đăng nhập được toàn quyền.
-- TODO khi lên production: siết write của staff/point_config/report_emails
--       chỉ cho cấp 'GD' (dựa trên bảng user_roles hoặc JWT claim).
-- ============================================================
alter table business_units enable row level security;
alter table staff          enable row level security;
alter table tickets        enable row level security;
alter table point_config   enable row level security;
alter table report_emails  enable row level security;

create policy "auth full - business_units" on business_units
  for all to authenticated using (true) with check (true);
create policy "auth full - staff" on staff
  for all to authenticated using (true) with check (true);
create policy "auth full - tickets" on tickets
  for all to authenticated using (true) with check (true);
create policy "auth full - point_config" on point_config
  for all to authenticated using (true) with check (true);
create policy "auth full - report_emails" on report_emails
  for all to authenticated using (true) with check (true);

-- ---------- Seed nhân sự mẫu (DEFAULT_STAFF) — tuỳ chọn ----------
insert into staff (code, name, level, bu, reports_to) values
  ('GD01',   'Nguyễn Văn A', 'GD',   'BU1', null),
  ('TPCC01', 'Trần Thị B',   'TPCC', 'BU1', 'GD01'),
  ('TPCC02', 'Lê Văn C',     'TPCC', 'BU2', 'GD01'),
  ('TP01',   'Phạm Thị D',   'TP',   'BU1', 'TPCC01'),
  ('TP02',   'Hoàng Văn E',  'TP',   'BU2', 'TPCC02'),
  ('NV01',   'Ngô Thị F',    'NV',   'BU1', 'TP01'),
  ('NV02',   'Đỗ Văn G',     'NV',   'BU1', 'TP01'),
  ('NV03',   'Vũ Thị H',     'NV',   'BU2', 'TP02');
