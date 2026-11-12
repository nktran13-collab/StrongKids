import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** Chỉ bật đăng nhập/đồng bộ khi đã cấu hình đủ URL và anon key. */
export const cloudEnabled = /^https:\/\/.+\.supabase\.co$/i.test(url) && anonKey.length > 20

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url, anonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

/** Magic link phải quay về đúng gốc ứng dụng, không kèm hash của router. */
export function magicLinkRedirect(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).toString()
}
