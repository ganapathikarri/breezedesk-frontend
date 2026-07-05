import React from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { CreditCard, LayoutDashboard, LogOut, PlusCircle, Settings, ShieldCheck, UploadCloud } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PlanBadge from '../common/PlanBadge'
import StorageMeter from '../common/StorageMeter'
import AmbientBackground from '../ui/AmbientBackground'
import { toast } from 'sonner'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/portals/new', label: 'New Portal', icon: PlusCircle },
  { to: '/upload', label: 'Upload', icon: UploadCloud },
  { to: '/pricing', label: 'Plans', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out')
    navigate('/login', { replace: true })
  }

  return (
    <AmbientBackground variant="dashboard">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-surface-200 bg-background/80 p-5 backdrop-blur-xl lg:flex">
          <Link to="/dashboard" className="flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand text-white shadow-brand-glow">
              <span className="text-base font-black">B</span>
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-text-900">BreezeDesk</p>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-600">Video review OS</p>
            </div>
          </Link>

          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
            Secure
            <ShieldCheck className="ml-auto size-4" />
          </div>

          <nav className="mt-8 flex-1 space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `group flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition-all ${isActive ? 'bg-brand text-white shadow-brand-glow' : 'text-text-600 hover:bg-surface-50 hover:text-text-900'}`}>
                  <Icon className="size-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="space-y-4">
            <StorageMeter compact />
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                  {user?.displayName?.slice(0, 1).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-900">{user?.displayName}</p>
                  <p className="truncate text-xs font-medium text-text-600">{user?.email}</p>
                </div>
                <button type="button" onClick={handleLogout} className="rounded-lg p-2 text-text-600 hover:bg-surface-100 hover:text-text-900" aria-label="Sign out">
                  <LogOut className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <PlanBadge tier={user?.role === 'CLIENT' ? 'CLIENT' : undefined} />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-text-600">AES-256</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-72">
          <header className="sticky top-0 z-20 border-b border-surface-200 bg-background/70 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-2 font-black text-text-900"><span className="flex size-8 items-center justify-center rounded-xl bg-brand text-white">B</span>BreezeDesk</Link>
              <button type="button" onClick={handleLogout} className="rounded-lg p-2 text-text-600"><LogOut className="size-4" /></button>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navItems.map(item => {
                const Icon = item.icon
                const active = location.pathname === item.to
                return (
                  <Link key={item.to} to={item.to} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${active ? 'bg-brand text-white' : 'bg-surface-50 text-text-600'}`}>
                    <Icon className="size-3.5" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </header>

          <Motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
            <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-surface-200 pt-6 text-xs font-semibold uppercase tracking-[0.2em] text-text-600">
              <span>SOC 2 Ready</span>
              <span>Encrypted media workflows</span>
              <span>99.9% uptime target</span>
            </footer>
          </Motion.main>
        </div>
      </div>
    </AmbientBackground>
  )
}

export default AppShell
