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

/** Gửi mã đăng nhập 6 số tới email phụ huynh. */
export async function sendLoginOtp(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) throw error
}

/** Xác thực mã OTP và trả phiên đăng nhập đã xác thực email. */
export async function verifyLoginOtp(email: string, token: string): Promise<Session> {
  const { data, error } = await client().auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
  if (!data.session) throw new Error('Không tạo được phiên đăng nhập')
  return data.session
}
