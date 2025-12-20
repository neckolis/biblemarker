import { createClient } from '@supabase/supabase-js'

export const createSupabaseClient = (url: string, key: string, jwt?: string) => {
  return createClient(url, key, {
    global: {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
    },
    auth: {
      persistSession: false,
    }
  })
}
