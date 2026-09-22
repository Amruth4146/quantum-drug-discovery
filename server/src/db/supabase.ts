import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error(
    '[Supabase] MISSING env vars — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
    'in the Render dashboard (Environment tab).'
  )
  process.exit(1)
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
})

console.log('[Supabase] Client initialised — project:', url)
