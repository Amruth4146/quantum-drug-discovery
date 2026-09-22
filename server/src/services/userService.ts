import { query, queryOne, execute } from '../db/supabase'
import type { User } from '../types/user'

function fromRow(r: any): User {
  return {
    id:           r.id,
    fullName:     r.full_name,
    username:     r.username ?? undefined,
    email:        r.email,
    passwordHash: r.password_hash,
    avatar:       r.avatar ?? undefined,
    provider:     r.provider,
    isVerified:   r.is_verified,
    createdAt:    r.created_at,
    updatedAt:    r.updated_at,
    lastLoginAt:  r.last_login_at ?? undefined,
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const row = await queryOne(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email.toLowerCase().trim()]
  )
  return row ? fromRow(row) : null
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const row = await queryOne(
    'SELECT * FROM users WHERE username = $1 LIMIT 1',
    [username.toLowerCase().trim()]
  )
  return row ? fromRow(row) : null
}

export async function findUserById(id: string): Promise<User | null> {
  const row = await queryOne('SELECT * FROM users WHERE id = $1', [id])
  return row ? fromRow(row) : null
}

export async function createUser(user: User): Promise<void> {
  await execute(
    `INSERT INTO users (id, full_name, username, email, password_hash, avatar, provider,
      is_verified, created_at, updated_at, last_login_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      user.id, user.fullName, user.username ?? null, user.email,
      user.passwordHash, user.avatar ?? null, user.provider,
      user.isVerified, user.createdAt, user.updatedAt, user.lastLoginAt ?? null,
    ]
  )
}

export async function updateUser(id: string, data: Partial<User>): Promise<void> {
  const fields: string[] = []
  const values: any[] = []
  let i = 1

  if (data.fullName    !== undefined) { fields.push(`full_name=$${i++}`);    values.push(data.fullName) }
  if (data.username    !== undefined) { fields.push(`username=$${i++}`);     values.push(data.username) }
  if (data.email       !== undefined) { fields.push(`email=$${i++}`);        values.push(data.email) }
  if (data.passwordHash!== undefined) { fields.push(`password_hash=$${i++}`);values.push(data.passwordHash) }
  if (data.avatar      !== undefined) { fields.push(`avatar=$${i++}`);       values.push(data.avatar) }
  if (data.isVerified  !== undefined) { fields.push(`is_verified=$${i++}`);  values.push(data.isVerified) }
  if (data.updatedAt   !== undefined) { fields.push(`updated_at=$${i++}`);   values.push(data.updatedAt) }
  if (data.lastLoginAt !== undefined) { fields.push(`last_login_at=$${i++}`);values.push(data.lastLoginAt) }

  if (!fields.length) return
  values.push(id)
  await execute(`UPDATE users SET ${fields.join(',')} WHERE id=$${i}`, values)
}

export async function listAllUsers(): Promise<User[]> {
  const rows = await query('SELECT * FROM users ORDER BY created_at DESC')
  return rows.map(fromRow)
}
