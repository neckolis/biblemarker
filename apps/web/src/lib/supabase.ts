import { createClient } from '@supabase/supabase-js'

// These should be loaded from env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
// For now sending placeholder or expecting them to be replaced by build system.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
