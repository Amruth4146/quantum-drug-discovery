import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Atom, Search, Shield, BarChart2, Zap, Globe, Database,
  UploadCloud, FlaskConical, Download, Menu, X,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
function useFadeInUp(delay = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    },
  }
}

function useCountUp(target: number, active: boolean, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [active, target, duration])
  return count
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const mwData = [
  { range: '150-200', count: 8 },
  { range: '200-250', count: 14 },
  { range: '250-300', count: 22 },
  { range: '300-350', count: 31 },
  { range: '350-400', count: 18 },
  { range: '400-450', count: 11 },
  { range: '450-500', count: 6 },
]
const barColors = ['#818cf8','#a78bfa','#c084fc','#e879f9','#f472b6','#fb7185','#f97316']

const features = [
  { icon: Search,   color: 'blue',   title: 'Similarity Search',      desc: 'Tanimoto-based fingerprint search across your entire molecular library in milliseconds.' },
  { icon: Shield,   color: 'green',  title: 'Lipinski Checker',       desc: "Instantly validate drug-likeness with Lipinski's Rule of Five and flag violations." },
  { icon: BarChart2,color: 'purple', title: 'Property Correlations',  desc: 'Pearson correlation matrix across MW, LogP, TPSA, HBD, HBA and binding affinity.' },
  { icon: Zap,      color: 'orange', title: 'Batch Predictions',      desc: 'Submit hundreds of SMILES at once and get binding affinity predictions with confidence scores.' },
  { icon: Globe,    color: 'teal',   title: 'Chemical Space',         desc: 'PCA-reduced 2D scatter of your dataset fingerprints � spot clusters and outliers instantly.' },
  { icon: Database, color: 'indigo', title: 'Data Management',        desc: 'Upload CSV, XLSX or JSON datasets. Activate, export, and audit every operation.' },
]

const colorMap: Record<string, string> = {
  blue:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  green:  'text-green-400 bg-green-500/10 border-green-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  teal:   'text-teal-400 bg-teal-500/10 border-teal-500/20',
  indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
}

const techStack = [
  'Node.js','Express','Firebase','React','Vite',
  'TypeScript','Tailwind CSS','Recharts','shadcn/ui','csv-parse','xlsx',
]

const apiCards = [
  { method: 'POST', path: '/api/prediction/batch',        color: 'orange', desc: 'Batch binding affinity predictions with confidence scores' },
  { method: 'GET',  path: '/api/analysis/correlations',   color: 'green',  desc: 'Pearson correlation matrix for all molecular properties' },
  { method: 'POST', path: '/api/filter/similarity',       color: 'orange', desc: 'Tanimoto similarity search with configurable threshold' },
]

const steps = [
  { icon: UploadCloud,  title: 'Upload Dataset',    desc: 'Drop a CSV, XLSX or JSON file with SMILES strings. Properties are auto-computed.' },
  { icon: FlaskConical, title: 'Run Analysis',      desc: 'Correlations, Lipinski checks, similarity search and batch ML predictions.' },
  { icon: Download,     title: 'Export Results',    desc: 'Download filtered molecules as CSV or XLSX with all computed properties.' },
]

const navLinks = ['Features', 'How It Works', 'Tech Stack']
const navIds   = ['features', 'how-it-works', 'tech-stack']

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
function Navbar({ onNav }: { onNav: (id: string) => void }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 backdrop-blur border-b border-white/5 shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Atom size={26} className="text-purple-400" />
          <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            QuantumDrug ML
          </span>
        </div>
        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l, i) => (
            <button key={l} onClick={() => onNav(navIds[i])}
              className="text-sm text-slate-400 hover:text-white transition-colors">
              {l}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/auth')}
            className="px-4 py-1.5 text-sm rounded-lg border border-white/10 text-slate-300 hover:border-purple-500/50 hover:text-white transition-all">
            Sign In
          </button>
          <button onClick={() => navigate('/auth')}
            className="px-4 py-1.5 text-sm rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all shadow-lg shadow-purple-500/20">
            Get Started for Free
          </button>
        </div>
        {/* Mobile hamburger */}
        <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setOpen(o => !o)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-slate-900/98 border-b border-white/5 px-6 py-4 flex flex-col gap-4">
          {navLinks.map((l, i) => (
            <button key={l} onClick={() => { onNav(navIds[i]); setOpen(false) }}
              className="text-sm text-slate-300 hover:text-white text-left transition-colors">
              {l}
            </button>
          ))}
          <button onClick={() => navigate('/auth')}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white font-medium">
            Get Started for Free
          </button>
        </div>
      )}
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero() {
  const navigate = useNavigate()
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* Floating molecule SVG */}
      <div className="absolute right-8 top-32 opacity-20 hidden lg:block" style={{ animation: 'floatY 4s ease-in-out infinite' }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx="90" cy="90" r="12" fill="#a78bfa" />
          <circle cx="140" cy="60" r="8" fill="#818cf8" />
          <circle cx="50" cy="60" r="8" fill="#c084fc" />
          <circle cx="140" cy="120" r="8" fill="#e879f9" />
          <circle cx="50" cy="120" r="8" fill="#818cf8" />
          <line x1="90" y1="90" x2="140" y2="60" stroke="#a78bfa" strokeWidth="2" />
          <line x1="90" y1="90" x2="50" y2="60" stroke="#a78bfa" strokeWidth="2" />
          <line x1="90" y1="90" x2="140" y2="120" stroke="#a78bfa" strokeWidth="2" />
          <line x1="90" y1="90" x2="50" y2="120" stroke="#a78bfa" strokeWidth="2" />
          <line x1="140" y1="60" x2="140" y2="120" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="50" y1="60" x2="50" y2="120" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4 2" />
        </svg>
      </div>

      <div className="relative max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-2">
          <Atom size={12} /> Quantum-Powered Drug Discovery
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight"
          style={{ background: 'linear-gradient(270deg,#a78bfa,#e879f9,#60a5fa,#a78bfa)', backgroundSize: '300% 300%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'gradientShift 6s ease infinite' }}>
          Virtual Drug Discovery<br />with QML
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Upload molecular datasets, run AI-powered binding affinity predictions, explore chemical space,
          and export results � all from a single platform built for computational chemists.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button onClick={() => navigate('/auth')}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-0.5">
            Get Started for Free 
          </button>
          <button onClick={() => navigate('/auth')}
            className="px-6 py-3 rounded-xl border border-white/10 text-slate-300 hover:border-purple-500/50 hover:text-white text-sm font-medium transition-all">
            Sign In
          </button>
        </div>
        {/* Stat pills */}
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          {['24 Endpoints', '100+ Molecules', '6 Tools', 'Real-time'].map(s => (
            <span key={s} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Stats Banner
// ---------------------------------------------------------------------------
function StatsBanner() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect() } }, { threshold: 0.3 })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  const stats = [
    { target: 24,  label: 'API Endpoints',    suffix: '' },
    { target: 100, label: 'Molecules Seeded', suffix: '+' },
    { target: 6,   label: 'Analysis Tools',   suffix: '' },
    { target: 3,   label: 'Export Formats',   suffix: '' },
  ]
  return (
    <div ref={ref} className="bg-slate-800/50 border-y border-white/5 py-12">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map(({ target, label, suffix }) => {
          const n = useCountUp(target, active)
          return (
            <div key={label}>
              <div className="text-4xl font-extrabold text-white">{n}{suffix}</div>
              <div className="text-sm text-slate-400 mt-1">{label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Features Grid
// ---------------------------------------------------------------------------
function Features() {
  const fade = useFadeInUp(0)
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div {...fade} className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white">Everything You Need</h2>
          <p className="text-slate-400 mt-3 max-w-xl mx-auto">Six powerful tools for computational chemistry, all in one platform.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, color, title, desc }, i) => {
            const f = useFadeInUp(i * 80)
            return (
              <div key={title} {...f}
                className="group p-6 rounded-2xl border border-white/5 bg-slate-800/40 hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 cursor-default">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${colorMap[color]}`}>
                  <Icon size={18} />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// How It Works
// ---------------------------------------------------------------------------
function HowItWorks() {
  const fade = useFadeInUp(0)
  return (
    <section id="how-it-works" className="py-24 px-6 bg-slate-800/20">
      <div className="max-w-5xl mx-auto">
        <div {...fade} className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white">How It Works</h2>
          <p className="text-slate-400 mt-3">Three steps from raw data to actionable insights.</p>
        </div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
          {/* Dashed connector */}
          <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-px border-t-2 border-dashed border-purple-500/30 pointer-events-none" />
          {steps.map(({ icon: Icon, title, desc }, i) => {
            const f = useFadeInUp(i * 120)
            return (
              <div key={title} {...f} className="relative flex-1 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center z-10">
                  <Icon size={28} className="text-purple-400" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center z-20">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="text-sm text-slate-400 max-w-xs">{desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Live Demo Preview
// ---------------------------------------------------------------------------
function LiveDemo() {
  const navigate = useNavigate()
  const fade = useFadeInUp(0)
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div {...fade} className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white">See It In Action</h2>
          <p className="text-slate-400 mt-3">Molecular weight distribution from a real dataset.</p>
        </div>
        {/* Browser chrome mockup */}
        <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-purple-500/10">
          {/* Chrome bar */}
          <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 border-b border-white/5">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <div className="flex-1 bg-slate-700/60 rounded-md px-3 py-1 text-xs text-slate-400 font-mono">
              localhost:5173/app/dashboard
            </div>
          </div>
          {/* Chart */}
          <div className="bg-slate-900 p-6">
            <p className="text-xs text-slate-500 mb-4 font-mono">Molecular Weight Distribution (MW)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mwData} barCategoryGap="20%">
                <XAxis dataKey="range" stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {mwData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate('/auth')}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-500/20 hover:-translate-y-0.5">
            Try It Now 
          </button>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Tech Stack
// ---------------------------------------------------------------------------
function TechStack() {
  const fade = useFadeInUp(0)
  return (
    <section id="tech-stack" className="py-24 px-6 bg-slate-800/20">
      <div className="max-w-4xl mx-auto text-center">
        <div {...fade}>
          <h2 className="text-3xl font-bold text-white mb-3">Built With</h2>
          <p className="text-slate-400 mb-10">Modern, production-grade stack from end to end.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map((t, i) => {
            const f = useFadeInUp(i * 40)
            return (
              <span key={t} {...f}
                className="px-4 py-2 rounded-full border border-white/10 bg-slate-800/60 text-sm text-slate-300 cursor-default transition-all duration-200 hover:border-purple-500/50 hover:text-white"
                style={{ ...f.style, boxShadow: undefined }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 12px rgba(168,85,247,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                {t}
              </span>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// API Teaser
// ---------------------------------------------------------------------------
function ApiTeaser() {
  const navigate = useNavigate()
  const fade = useFadeInUp(0)
  const methodColor: Record<string, string> = {
    POST: 'text-orange-400 bg-orange-500/10',
    GET:  'text-green-400 bg-green-500/10',
  }
  return (
    <section id="api" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div {...fade} className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">REST API</h2>
          <p className="text-slate-400 mt-3">24 typed endpoints. Plug into any pipeline.</p>
        </div>
        <div className="space-y-4">
          {apiCards.map(({ method, path, desc }, i) => {
            const f = useFadeInUp(i * 100)
            return (
              <div key={path} {...f}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-white/5 bg-slate-800/40 hover:border-purple-500/20 transition-all">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono w-fit ${methodColor[method]}`}>{method}</span>
                <code className="text-sm text-purple-300 font-mono flex-1">{path}</code>
                <span className="text-xs text-slate-500">{desc}</span>
              </div>
            )
          })}
        </div>
        <div className="text-center mt-8">
          <button onClick={() => navigate('/auth')}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            Sign In to Get Started →
          </button>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-900/80 py-14 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Atom size={20} className="text-purple-400" />
            <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              QuantumDrug ML
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            AI-powered molecular analysis and drug discovery platform for computational chemists.
          </p>
        </div>
        {[
          { title: 'Platform', links: ['Dashboard', 'Analysis', 'Predictions', 'Experiments'] },
          { title: 'Analysis', links: ['Correlations', 'Lipinski Check', 'Similarity Search', 'Chemical Space'] },
          { title: 'Data',     links: ['Upload Dataset', 'Export CSV', 'Export XLSX', 'Audit Log'] },
        ].map(col => (
          <div key={col.title}>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map(l => (
                <li key={l} className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors">{l}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/5 text-center text-xs text-slate-600">
         2026 Virtual Drug Discovery Platform  MIT License
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// CSS keyframes injected once
// ---------------------------------------------------------------------------
const globalStyles = `
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes floatY {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-18px); }
  }
`

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
export default function Landing() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white">
      <style>{globalStyles}</style>
      <Navbar onNav={scrollTo} />
      <Hero />
      <StatsBanner />
      <Features />
      <HowItWorks />
      <LiveDemo />
      <TechStack />
      <ApiTeaser />
      <Footer />
    </div>
  )
}


