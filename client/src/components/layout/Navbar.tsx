import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Atom, Sun, Moon, LogOut, ChevronDown, User, Menu, X } from 'lucide-react'
import { checkBackendHealth } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../ui/NotificationBell'

const tabs = [
  { label: 'Dashboard',   path: '/app/dashboard' },
  { label: 'Analysis',    path: '/app/analysis' },
  { label: 'Predictions', path: '/app/predictions' },
  { label: 'Experiments', path: '/app/experiments' },
  { label: 'Training',    path: '/app/training' },
  { label: 'Search',      path: '/app/search' },
  { label: 'Tools',       path: '/app/tools' },
  { label: 'Audit',       path: '/app/audit' },
]

export default function Navbar() {
  const { pathname }     = useLocation()
  const navigate         = useNavigate()
  const { user, logout } = useAuth()
  const [online,    setOnline]    = useState<boolean | null>(null)
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('vdd_theme')
    return saved ? saved === 'dark' : true // default dark
  })
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = async () => setOnline(await checkBackendHealth())
    check()
    const id = setInterval(check, 15_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    localStorage.setItem('vdd_theme', dark ? 'dark' : 'light')
  }, [dark])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile nav on route change
  useEffect(() => { setMobileNav(false) }, [pathname])

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-white/5 bg-slate-900/95 backdrop-blur px-4 md:px-6 flex items-center gap-3 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Atom size={20} className="text-purple-400" />
          <span className="font-bold text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent hidden sm:block">
            QuantumDrug ML
          </span>
        </Link>

        {/* Desktop tabs — hidden on mobile */}
        <div className="hidden md:flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <Link key={tab.path} to={tab.path}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                pathname.startsWith(tab.path)
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Spacer on mobile */}
        <div className="flex-1 md:hidden" />

        {/* Right side */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Backend status dot */}
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            online === null ? 'bg-slate-500 animate-pulse' :
            online ? 'bg-green-400' : 'bg-red-500'
          }`} title={online === null ? 'Checking…' : online ? 'Connected' : 'Offline'} />

          {/* Theme toggle */}
          <button onClick={() => setDark(d => !d)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User profile — desktop */}
          {user ? (
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-white/5 transition-colors group">
                <img src={user.avatar} alt={user.name}
                  className="w-7 h-7 rounded-full ring-2 ring-purple-500/40 object-cover" />
                <span className="text-xs font-medium text-slate-300 group-hover:text-white max-w-[100px] truncate">
                  {user.name}
                </span>
                <ChevronDown size={12} className={`text-slate-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 bg-slate-900 shadow-xl shadow-black/40 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full ring-2 ring-purple-500/30" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-2 border-b border-white/5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      Signed in via <span className="capitalize text-slate-400 font-medium">{user.provider}</span>
                    </span>
                  </div>
                  <button onClick={() => { setMenuOpen(false); navigate('/profile') }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                    <User size={14} /> Profile
                  </button>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/auth')}
              className="hidden md:block px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors">
              Sign In
            </button>
          )}

          {/* Mobile hamburger */}
          <button onClick={() => setMobileNav(o => !o)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            {mobileNav ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile nav drawer */}
      {mobileNav && (
        <div className="md:hidden fixed inset-0 top-14 z-30 bg-slate-900/98 backdrop-blur flex flex-col overflow-y-auto">
          {/* Tab links */}
          <div className="flex flex-col p-4 gap-1 border-b border-white/5">
            {tabs.map(tab => (
              <Link key={tab.path} to={tab.path}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  pathname.startsWith(tab.path)
                    ? 'bg-purple-600/20 text-purple-300'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}>
                {tab.label}
              </Link>
            ))}
          </div>

          {/* User section */}
          {user ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/60">
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full ring-2 ring-purple-500/30" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <button onClick={() => { setMobileNav(false); navigate('/profile') }}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-slate-300 hover:bg-white/5 transition-colors">
                <User size={15} /> Profile
              </button>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          ) : (
            <div className="p-4">
              <button onClick={() => { setMobileNav(false); navigate('/auth') }}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
                Sign In
              </button>
            </div>
          )}

          {/* Status */}
          <div className="mt-auto p-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${
                online === null ? 'bg-slate-500 animate-pulse' :
                online ? 'bg-green-400' : 'bg-red-500'
              }`} />
              {online === null ? 'Checking…' : online ? 'Backend connected' : 'Backend offline'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
