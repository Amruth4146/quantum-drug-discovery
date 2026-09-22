import { createClient } from '@supabase/supabase-js'
import https from 'https'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error(
    '[Supabase] MISSING env vars — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
    'in the Render dashboard (Environment tab).'
  )
  process.exit(1)
}

// Custom fetch that uses Node's built-in https to avoid DNS cold-start issues
const customFetch: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : (input as Request).url
  return new Promise((resolve, reject) => {
    const options = new URL(url)
    const reqOptions: https.RequestOptions = {
      hostname: options.hostname,
      port: options.port || 443,
      path: options.pathname + options.search,
      method: (init?.method as string) || 'GET',
      headers: init?.headers as Record<string, string> | undefined,
    }
    const req = https.request(reqOptions, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString()
        resolve(new Response(body, {
          status: res.statusCode,
          headers: res.headers as Record<string, string>,
        }))
      })
    })
    req.on('error', reject)
    if (init?.body) req.write(init.body)
    req.end()
  })
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: { fetch: customFetch },
})

console.log('[Supabase] Client initialised — project:', url)
