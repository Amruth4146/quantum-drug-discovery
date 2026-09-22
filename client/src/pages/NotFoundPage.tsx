import { Link, useNavigate } from 'react-router-dom'
import { Atom, ArrowLeft, Home } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Atom size={36} className="text-purple-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-7xl font-black text-white">404</h1>
          <p className="text-xl font-semibold text-slate-300">Page not found</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">
            <ArrowLeft size={16} /> Go back
          </button>
          <Link
            to="/app/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors">
            <Home size={16} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
