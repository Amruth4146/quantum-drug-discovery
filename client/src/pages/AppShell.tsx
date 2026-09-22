import { useLocation, Navigate, Route, Routes } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import DashboardTab        from '../components/tabs/DashboardTab'
import AnalysisTab         from '../components/tabs/AnalysisTab'
import PredictionsTab      from '../components/tabs/PredictionsTab'
import ExperimentsTab      from '../components/tabs/ExperimentsTab'
import AuditTab            from '../components/tabs/AuditTab'
import ToolsTab            from '../components/tabs/ToolsTab'
import TrainingTab         from '../components/tabs/TrainingTab'
import MoleculeSearchTab   from '../components/tabs/MoleculeSearchTab'
import DatasetComparisonTab from '../components/tabs/DatasetComparisonTab'
import SharingTab          from '../components/tabs/SharingTab'
import NotFoundPage        from '../pages/NotFoundPage'
import { ErrorBoundary }   from '../components/ui/ErrorBoundary'

const fadeStyle = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .tab-enter { animation: fadeInUp 200ms ease both; }
`

export default function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <style>{fadeStyle}</style>
      <Navbar />
      <main className="flex-1 px-4 md:px-6 py-6 max-w-7xl mx-auto w-full">
        <div key={pathname} className="tab-enter">
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<ErrorBoundary><DashboardTab /></ErrorBoundary>} />
            <Route path="analysis"    element={<ErrorBoundary><AnalysisTab /></ErrorBoundary>} />
            <Route path="predictions" element={<ErrorBoundary><PredictionsTab /></ErrorBoundary>} />
            <Route path="experiments" element={<ErrorBoundary><ExperimentsTab /></ErrorBoundary>} />
            <Route path="audit"       element={<ErrorBoundary><AuditTab /></ErrorBoundary>} />
            <Route path="tools"       element={<ErrorBoundary><ToolsTab /></ErrorBoundary>} />
            <Route path="training"    element={<ErrorBoundary><TrainingTab /></ErrorBoundary>} />
            <Route path="search"      element={<ErrorBoundary><MoleculeSearchTab /></ErrorBoundary>} />
            <Route path="compare"     element={<ErrorBoundary><DatasetComparisonTab /></ErrorBoundary>} />
            <Route path="sharing"     element={<ErrorBoundary><SharingTab /></ErrorBoundary>} />
            <Route path="*"           element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
      <Footer />
    </div>
  )
}
