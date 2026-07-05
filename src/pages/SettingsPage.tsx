import React from 'react'
import { motion as Motion } from 'framer-motion'
import { KeyRound, ShieldCheck, UserCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import StorageMeter from '../components/common/StorageMeter'
import { fadeUp } from '../components/ui/motion'

const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Motion.header variants={fadeUp} initial="initial" animate="animate">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Settings</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-text-900 md:text-5xl">Account and security</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-text-600">Frontend maps `/auth/me` exactly: id, email, displayName, role, and profileAvatar.</p>
      </Motion.header>

      <Motion.section variants={fadeUp} initial="initial" animate="animate" className="card">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"><UserCircle2 className="size-6" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black text-text-900">Profile</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-text-600">Name</p><p className="mt-1 font-bold text-text-900">{user?.displayName}</p></div>
              <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-text-600">Email</p><p className="mt-1 truncate font-bold text-text-900">{user?.email}</p></div>
              <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-text-600">Role</p><p className="mt-1 font-bold text-text-900">{user?.role}</p></div>
              <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.2em] text-text-600">User ID</p><p className="mt-1 font-mono font-bold text-text-900">{user?.id}</p></div>
            </div>
            <button type="button" onClick={() => void refreshUser()} className="btn-secondary mt-5">Refresh profile</button>
          </div>
        </div>
      </Motion.section>

      <StorageMeter />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <KeyRound className="mb-4 size-6 text-brand" />
          <h2 className="text-xl font-black text-text-900">JWT handling</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-text-600">Access tokens are sent as `Authorization: Bearer token`. Refresh tokens rotate via `/auth/refresh` when a 401 occurs.</p>
        </div>
        <div className="card">
          <ShieldCheck className="mb-4 size-6 text-brand" />
          <h2 className="text-xl font-black text-text-900">Client isolation</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-text-600">Client magic-link routes call only `/api/v1/client/**` and never require or expose owner JWT/session data.</p>
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
