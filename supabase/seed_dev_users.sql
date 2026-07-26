-- ============================================================
-- SEED TÀI KHOẢN DEV (chỉ dùng cho project Supabase môi trường DEV)
-- Tạo sẵn user đã confirm email để login được ngay bằng email + password,
-- không cần bấm link xác nhận trong mail.
--
-- Cách chạy: Supabase Dashboard > SQL Editor > dán toàn bộ file > Run.
-- Chạy lại nhiều lần an toàn (idempotent): user đã có thì chỉ reset password.
--
-- ⚠️ KHÔNG chạy file này trên project production.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_emails text[] := array[
    'phantichhoang@gmail.com',
    'hoangphantich@gmail.com',
    'khue789@gmail.com'
  ];
  v_password text := 'GreenField@2026';   -- đổi ở đây nếu muốn mật khẩu khác
  v_email    text;
  v_user_id  uuid;
  v_hash     text;
begin
  v_hash := extensions.crypt(v_password, extensions.gen_salt('bf'));

  foreach v_email in array v_emails loop
    select id into v_user_id from auth.users where email = v_email;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change, email_change_token_new
      ) values (
        '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
        v_email, v_hash,
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('email', v_email, 'email_verified', true),
        '', '', '', ''
      );

      -- GoTrue cần bản ghi identity tương ứng cho provider 'email'.
      insert into auth.identities (
        id, user_id, provider_id, provider, identity_data,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_user_id, v_user_id::text, 'email',
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
        now(), now(), now()
      );

      raise notice 'Đã tạo user %', v_email;
    else
      update auth.users
         set encrypted_password = v_hash,
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             updated_at         = now()
       where id = v_user_id;

      raise notice 'User % đã tồn tại -> reset password', v_email;
    end if;
  end loop;
end $$;

-- Kiểm tra kết quả
select email, email_confirmed_at is not null as confirmed, created_at
from auth.users
where email in (
  'phantichhoang@gmail.com', 'hoangphantich@gmail.com', 'khue789@gmail.com'
)
order by email;
