import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error(
    '[DB] MISSING env var — set DATABASE_URL in the Render dashboard (Environment tab).'
  )
  process.exit(1)
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message)
})

// Helper: run a query
export async function query(sql: string, params?: any[]): Promise<any[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(sql, params)
    return result.rows
  } finally {
    client.release()
  }
}

// Helper: run a query returning single row
export async function queryOne(sql: string, params?: any[]): Promise<any | null> {
  const rows = await query(sql, params)
  return rows[0] ?? null
}

// Helper: run a query returning row count
export async function execute(sql: string, params?: any[]): Promise<number> {
  const client = await pool.connect()
  try {
    const result = await client.query(sql, params)
    return result.rowCount ?? 0
  } finally {
    client.release()
  }
}

// Keep backward compat — some files import `supabase`
export const supabase = { query, queryOne, execute, pool }

console.log('[DB] PostgreSQL pool initialised')
