import { createClient } from '@supabase/supabase-js'
export const SUPABASE_URL='https://ivjqorxkqnipyelnjlqp.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY='sb_publishable_nplKway4Sl6M39aa3jjSkA_oqjlOGBA'
export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})
