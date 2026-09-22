import { supabase } from '../db/supabase'
import type { User } from '../types/user'

// Map DB snake_case row → camelCase User
function fromRow(row: Record<string, any>): User {
  return {
    id:           row.id,
    fullName:     row.full_name,
    username:     row.username ?? undefined,
    email:        row.email,
    passwordHash: row.password_hash,
    avatar:       row.avatar ?? undefined,
    provider:     row.provider,
    isVerified:   row.is_verified,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
    lastLoginAt:  row.last_login_at ?? undefined,
  }
}

// Map camelCase User → DB snake_case row
function toRow(u: Partial<User>): Record<string, any> {
  const row: Record<string, any> = {}
  if (u.id           !== undefined) row.id            = u.id
  if (u.fullName     !== undefined) row.full_name      = u.fullName
  if (u.username     !== undefined) row.username       = u.username
  if (u.email        !== undefined) row.email          = u.email
  if (u.passwordHash !== undefined) row.password_hash  = u.passwordHash
  if (u.avatar       !== undefined) row.avatar         = u.avatar
  if (u.provider     !== undefined) row.provider       = u.provider
  if (u.isVerified   !== undefined) row.is_verified    = u.isVerified
  if (u.createdAt    !== undefined) row.created_at     = u.createdAt
  if (u.updatedAt    !== undefined) row.updated_at     = u.updatedAt
  if (u.lastLoginAt  !== undefined) row.last_login_at  = u.lastLoginAt
  return row
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .limit(1)
    .single()
  if (error || !data) return null
  return fromRow(data)
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase().trim())
    .limit(1)
    .single()
  if (error || !data) return null
  return fromRow(data)
}

export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return fromRow(data)
}

export async function createUser(user: User): Promise<void> {
  const { error } = await supabase.from('users').insert(toRow(user))
  if (error) throw new Error(`createUser failed: ${error.message}`)
}

export async function updateUser(id: string, data: Partial<User>): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update(toRow(data))
    .eq('id', id)
  if (error) throw new Error(`updateUser failed: ${error.message}`)
}

export async function listAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listAllUsers failed: ${error.message}`)
  return (data ?? []).map(fromRow)
}
