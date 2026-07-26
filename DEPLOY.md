# Deploy lên Cloudflare Workers

Worker đích: **`funix-khb-greenfield`** — account `3e5797088897767fe1ae5e6fcb6dff08`
(đã khai trong [wrangler.jsonc](wrangler.jsonc)).

Site này là **static asset thuần** (Vite build ra `dist/`), không có code Worker.
`not_found_handling: "single-page-application"` lo phần react-router: mọi path
không khớp file nào đều trả về `index.html` kèm status 200.

---

## 1. Đăng nhập đúng account

`wrangler` phải thấy được account `3e5797088897767fe1ae5e6fcb6dff08`. Kiểm tra:

```bash
npx wrangler whoami
```

Nếu account đó **không** có trong bảng in ra thì deploy sẽ fail với
`Authentication error [code: 10000]`. Chọn một trong hai cách:

**Cách A — đăng nhập lại bằng OAuth** (cần trình duyệt):

```bash
npx wrangler login
```

**Cách B — dùng API token** (dùng được trong CI, không cần trình duyệt):

1. Vào https://dash.cloudflare.com/profile/api-tokens → *Create Token*
2. Template **Edit Cloudflare Workers**, phần *Account Resources* chọn đúng
   account chứa `funix-khb-greenfield`
3. Đặt vào biến môi trường rồi deploy:

```bash
export CLOUDFLARE_API_TOKEN=...      # PowerShell: $env:CLOUDFLARE_API_TOKEN="..."
npm run cf:deploy
```

## 2. Deploy

```bash
npm run cf:deploy      # = vite build && wrangler deploy
```

Kiểm tra trước khi đẩy thật:

```bash
npm run build
npx wrangler deploy --dry-run   # validate config, không upload
npm run cf:dev                  # chạy dist/ bằng runtime Workers thật ở :8787
```

⚠️ `wrangler deploy` **ghi đè** toàn bộ Worker `funix-khb-greenfield` đang có.
Nếu Worker đó đang chạy code khác, xem lại trên dashboard trước. Cần rollback:

```bash
npx wrangler versions list
npx wrangler rollback <VERSION_ID>
```

---

## 3. Env để nối Supabase

**Điểm dễ sai nhất:** Vite nhúng mọi biến `VITE_*` **thẳng vào file JS lúc
build**. Site này không có code Worker nào đọc `env`, nên đặt `vars` trong
`wrangler.jsonc` hoặc set Variables/Secrets trong dashboard Worker sẽ **không
có tác dụng gì**. Cấu hình Supabase phải có mặt **lúc build**.

### Build tại máy (đang dùng cách này)

Không cần cấu hình gì trên Cloudflare. File `.env` ở gốc repo:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

`vite build` đọc file này và nhúng giá trị vào bundle. Đổi project Supabase =
sửa `.env` rồi **build lại + deploy lại**.

### Build trên Cloudflare (Workers Builds / connect Git)

Set ở **Worker → Settings → Build → Variables and secrets** (biến *build-time*,
không phải runtime):

| Tên | Giá trị |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` |

Build command `npm run build`, output directory `dist`.

Lý do phải set: `.env` bị `.gitignore` bỏ qua nên không lên repo. Thiếu 2 biến
này thì app vẫn build và chạy, nhưng [supabaseClient.js](src/lib/supabaseClient.js)
sẽ báo `isSupabaseConfigured = false` → không đăng nhập được.

### Anon key lộ trong bundle có sao không?

Không. `sb_publishable_*` (anon key) được thiết kế để nằm công khai trong
browser — mọi lời gọi Supabase từ frontend đều mang nó. Việc chặn truy cập do
**RLS** ở phía DB làm, không phải do giấu key: chưa đăng nhập thì đọc bảng
`tickets` trả về rỗng vì policy chỉ mở cho role `authenticated`
(xem [migration](supabase/migrations/0001_raise_ticket.sql)).

**Tuyệt đối không** đặt `service_role` / `sb_secret_*` vào biến `VITE_*` — key đó
bỏ qua toàn bộ RLS, mà `VITE_*` thì luôn bị nhúng vào JS công khai.

### Nếu muốn đổi Supabase project mà không build lại

Hiện chưa làm được, vì giá trị đã nằm cứng trong bundle. Muốn vậy phải chuyển
sang cấu hình runtime: thêm code Worker serve `/config.json` từ `env`, và sửa
`supabaseClient.js` thành khởi tạo async. Đây là thay đổi kiến trúc, chỉ nên làm
nếu thật cần dùng **một** bundle cho nhiều môi trường.

---

## 4. Chống Supabase Free plan tự pause project

Org `Training` đang ở plan **free**. Theo
[docs Supabase](https://supabase.com/docs/guides/platform/free-project-pausing):

> A Free plan project is considered inactive if it does not receive sufficient
> **user database activity** over the past week... Typically **a few user requests
> to the database each day** over the previous week is enough to keep the project
> from being paused.

Nên "ping một URL nào đó" là **không đủ** — phải chạm thật vào Postgres.
[Migration 0002](supabase/migrations/0002_keepalive.sql) đã tạo:

- bảng `public.keepalive` — 1 dòng, lưu `last_ping_at` / `ping_count` / `last_source`
- function `public.ping(source)` — `security definer`, cron gọi qua
  `POST /rest/v1/rpc/ping`. Đây là một UPDATE thật nên chắc chắn tính là DB activity.

RLS: ai cũng đọc được bảng (để tự kiểm tra), nhưng **không có** policy
INSERT/UPDATE/DELETE — ghi chỉ đi qua đúng function trên. Đã test: anon gọi
PATCH/DELETE trực tiếp đổi 0 dòng.

### Cách A — Cloudflare Worker cron (khuyến nghị)

Nằm ở [keepalive/](keepalive/), **tách riêng** khỏi Worker serve site: nó chết thì
site vẫn chạy, và site vẫn là static asset thuần.

```bash
npm run keepalive:deploy     # deploy (cần quyền Cloudflare, xem mục 1)
npm run keepalive:dev        # test tại chỗ
```

Lịch: `0 */8 * * *` — 3 lần/ngày (00:00, 08:00, 16:00 UTC). Chạy 3 lần để lỡ
1 lần fail vẫn còn 2 lần. Ping fail thì Worker `throw`, lần chạy hiện đỏ trong
*Worker → Logs* (đã bật `observability`).

Kiểm tra bất cứ lúc nào bằng cách mở URL của Worker — nó trả JSON:

```json
{ "ok": true, "last_ping_at": "...", "hours_since_last_ping": 0.02,
  "ping_count": 3, "last_source": "cf-cron" }
```

`ok: false` khi lần ping cuối đã quá 48 giờ.

Khác với Worker serve site: Worker này **đọc `env` lúc runtime**, nên `vars` khai
trong [keepalive/wrangler.jsonc](keepalive/wrangler.jsonc) có tác dụng thật.

### Cách B — GitHub Actions (không cần quyền Cloudflare)

[.github/workflows/supabase-keepalive.yml](.github/workflows/supabase-keepalive.yml).
Cần set 2 repo variable ở *Settings → Secrets and variables → Actions → tab
Variables*: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

⚠️ GitHub **tự tắt** scheduled workflow nếu repo không có commit nào trong 60
ngày — đúng kiểu repo dev để lâu. Nếu không chắc sẽ commit đều thì dùng cách A.

Chọn **một** trong hai là đủ. Chạy cả hai cũng không sao, chỉ là ping thừa.

### Kiểm tra bằng SQL

```sql
select * from public.keepalive;
```

### Cảnh báo

Đây là giữ cho project khỏi bị pause, **không phải** cách để dùng free plan cho
production. Muốn chắc chắn không bao giờ bị pause thì nâng lên Pro — dự án đã
chạy thật thì 25$/tháng rẻ hơn nhiều so với một buổi sáng database offline.
Project bị pause vẫn restore được trong vòng 1 năm.
