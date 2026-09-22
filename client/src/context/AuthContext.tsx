import { createContext, useContext, useState, ReactNode } from "react"
import { authLogout } from "../services/api"

export interface AuthUser {
  id:         string
  name:       string
  email:      string
  avatar:     string
  provider:   "email" | "google" | "github"
  isVerified: boolean
  token:      string
}

interface AuthCtx {
  user:   AuthUser | null
  token:  string | null
  login:  (u: AuthUser) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx>({
  user: null, token: null, login: () => {}, logout: () => {},
})

const KEY       = "vdd_user"
const TOKEN_KEY = "vdd_token"

function avatarColor(name: string) {
  const colors = ["#7c3aed","#6d28d9","#4f46e5","#0891b2","#059669","#d97706","#dc2626","#db2777"]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}

export function makeAvatarUrl(name: string): string {
  const color = avatarColor(name)
  const text  = name.trim().split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" rx="20" fill="${color}"/><text x="20" y="26" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="600" fill="white">${text}</text></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? "null") } catch { return null }
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const login = (u: AuthUser) => {
    if (!u.avatar) u.avatar = makeAvatarUrl(u.name)
    setUser(u); setToken(u.token)
    localStorage.setItem(KEY, JSON.stringify(u))
    localStorage.setItem(TOKEN_KEY, u.token)
  }

  const logout = () => {
    // Tell the server to record the logout time in auth_audit_log
    const t = localStorage.getItem(TOKEN_KEY)
    if (t) {
      authLogout(t).catch(() => {
        // Non-fatal — proceed with local logout regardless
      })
    }
    setUser(null)
    setToken(null)
    // Clear auth data from storage — token never lives beyond logout
    localStorage.removeItem(KEY)
    localStorage.removeItem(TOKEN_KEY)
  }

  return <Ctx.Provider value={{ user, token, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
