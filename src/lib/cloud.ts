import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { AppData } from './types'

const TABLE = 'family_state'

export interface RemoteState {
  data: AppData
  updatedAt: string
}

function client() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình')
  return supabase
}

export async function fetchFamilyState(userId: string): Promise<RemoteState | null> {
  const { data, error } = await client()
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    data: data.data as AppData,
    updatedAt: String(data.updated_at),
  }
}

export async function saveFamilyState(userId: string, snapshot: AppData): Promise<void> {
  const { error } = await client()
    .from(TABLE)
    .upsert({ user_id: userId, data: snapshot }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function deleteFamilyState(userId: string): Promise<void> {
  const { error } = await client().from(TABLE).delete().eq('user_id', userId)
  if (error) throw error
}

/**
 * Tạo phiên đăng nhập ẩn danh gắn với thiết bị/trình duyệt này.
 * Email phụ huynh được lưu trong hồ sơ (family_state) chứ chưa dùng để xác thực.
 * Phiên bản sau có thể nâng cấp phiên này thành tài khoản email bằng magic link.
 */
export async function signInAnonymously(): Promise<Session> {
  const { data, error } = await client().auth.signInAnonymously()
  if (error) throw error
  if (!data.session) throw new Error('Không tạo được phiên đăng nhập trên thiết bị')
  return data.session
}
