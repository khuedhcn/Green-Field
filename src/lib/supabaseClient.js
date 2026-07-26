import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Giá trị placeholder còn sót lại từ .env.example (chưa điền thật) cũng được
// coi là "chưa cấu hình" để tránh cố gọi network tới domain không tồn tại.
const isPlaceholder = (v) => !v || /your-project-ref|your-anon-public-key/i.test(v);

export const isSupabaseConfigured = !isPlaceholder(url) && !isPlaceholder(anonKey);

if (!isSupabaseConfigured) {
  // Không throw để app vẫn chạy được các màn hình khác; chỉ cảnh báo rõ ràng.
  console.warn(
    "[Supabase] Thiếu hoặc chưa điền VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
    "Tạo/điền file .env.local (xem .env.example) rồi chạy lại `npm run dev`."
  );
}

// createClient throw ngay lập tức nếu url rỗng/không hợp lệ, nên chỉ gọi khi
// đã cấu hình đầy đủ — tránh crash toàn bộ app (trắng màn hình) ở mọi route.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
