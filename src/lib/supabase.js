import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://exnwmqpgewpzcmnuujvt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kOFFL17sgMDlKmICQtBSlw_wIpsCfQZ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
