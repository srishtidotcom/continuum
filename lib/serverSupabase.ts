import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('serverSupabase: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
}

export const serverSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
})
