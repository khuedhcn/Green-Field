import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Không throw để app vẫn chạy được các màn hình khác; chỉ cảnh báo rõ ràng.
  console.warn(
    "[Supabase] Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. " +
    "Tạo file .env.local (xem .env.example) rồi chạy lại `npm run dev`."
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "");
