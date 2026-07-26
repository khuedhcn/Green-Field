// ============================================================
// Worker cron giữ project Supabase Free plan không bị pause.
//
// Free plan bị pause nếu 7 ngày liền không có "user database activity". Docs
// Supabase nói "a few user requests to the database each day" là đủ, nên cron
// gọi RPC public.ping() — một UPDATE thật vào Postgres, không phải ping HTTP suông.
//
// Worker này CỐ Ý tách khỏi Worker serve site: nó chết thì site vẫn chạy, và
// site vẫn là static asset thuần không có code.
// ============================================================

const PING_URL = (base) => `${base.replace(/\/$/, "")}/rest/v1/rpc/ping`;

async function ping(env, source) {
  const res = await fetch(PING_URL(env.SUPABASE_URL), {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source }),
  });

  const body = await res.text();
  if (!res.ok) {
    // throw để lần chạy cron bị đánh dấu failed trong dashboard, thấy được ngay.
    throw new Error(`Supabase ping thất bại: HTTP ${res.status} — ${body}`);
  }
  return body.trim();
}

export default {
  async scheduled(event, env, ctx) {
    const at = await ping(env, "cf-cron");
    console.log(`[keepalive] OK — last_ping_at=${at} (cron ${event.cron})`);
  },

  // GET / trả về trạng thái để anh tự mở bằng browser kiểm tra cron còn sống.
  // Chỉ ĐỌC, không ping — muốn ping tay thì dùng `wrangler dev --test-scheduled`.
  async fetch(request, env) {
    const url = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/keepalive?select=*`;
    const res = await fetch(url, { headers: { apikey: env.SUPABASE_ANON_KEY } });
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;

    if (!row) {
      return Response.json(
        { ok: false, error: "Không đọc được bảng keepalive", raw: rows },
        { status: 502 },
      );
    }

    const ageHours = (Date.now() - new Date(row.last_ping_at).getTime()) / 3_600_000;
    return Response.json({
      ok: ageHours < 48, // 3 lần/ngày -> quá 48h không ping là có vấn đề
      last_ping_at: row.last_ping_at,
      hours_since_last_ping: Number(ageHours.toFixed(2)),
      ping_count: row.ping_count,
      last_source: row.last_source,
    });
  },
};
