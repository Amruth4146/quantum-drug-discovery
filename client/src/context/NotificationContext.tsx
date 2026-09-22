import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { Notification } from '../types'
import { v4 as uuid } from 'uuid'

interface NotifCtx {
  notifications: Notification[]
  unreadCount:   number
  push:   (type: Notification['type'], title: string, message: string) => void
  markRead:  (id: string) => void
  markAllRead: () => void
  remove: (id: string) => void
}

const Ctx = createContext<NotifCtx>({
  notifications: [], unreadCount: 0,
  push: () => {}, markRead: () => {}, markAllRead: () => {}, remove: () => {},
})

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const push = useCallback((type: Notification['type'], title: string, message: string) => {
    const n: Notification = { id: uuid(), type, title, message, read: false, createdAt: new Date().toISOString() }
    setNotifications(prev => [n, ...prev].slice(0, 50))
  }, [])

  const markRead    = useCallback((id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)), [])

  const markAllRead = useCallback(() =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true }))), [])

  const remove = useCallback((id: string) =>
    setNotifications(prev => prev.filter(n => n.id !== id)), [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Ctx.Provider value={{ notifications, unreadCount, push, markRead, markAllRead, remove }}>
      {children}
    </Ctx.Provider>
  )
}

export const useNotifications = () => useContext(Ctx)
