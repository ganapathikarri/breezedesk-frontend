import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppShell from './components/layout/AppShell'
import AmbientBackground from './components/ui/AmbientBackground'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PortalCreatePage = lazy(() => import('./pages/PortalCreatePage'))
const PortalDetailPage = lazy(() => import('./pages/PortalDetailPage'))
const ClientPortalPage = lazy(() => import('./pages/ClientPortalPage'))
const PricingPage = lazy(() => import('./components/subscription/PricingPage').then(module => ({ default: module.PricingPage })))

const Spinner = () => (
  <AmbientBackground variant="subtle">
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-surface-200 bg-background/80 p-8 shadow-rest backdrop-blur-sm">
        <div className="size-10 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
        <p className="text-sm font-semibold text-text-600">Loading secure workspace…</p>
      </div>
    </div>
  </AmbientBackground>
)

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />
  return <>{children}</>
}

const ProtectedShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RequireAuth>
    <AppShell>{children}</AppShell>
  </RequireAuth>
)

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/review/portal/:magicToken" element={<ClientPortalPage />} />

          <Route path="/dashboard" element={<ProtectedShell><Dashboard /></ProtectedShell>} />
          <Route path="/portals/new" element={<ProtectedShell><PortalCreatePage /></ProtectedShell>} />
          <Route path="/portals/:portalId" element={<ProtectedShell><PortalDetailPage /></ProtectedShell>} />
          <Route path="/upload" element={<ProtectedShell><UploadPage /></ProtectedShell>} />
          <Route path="/pricing" element={<ProtectedShell><PricingPage /></ProtectedShell>} />
          <Route path="/settings" element={<ProtectedShell><SettingsPage /></ProtectedShell>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </AuthProvider>
)

export default App
