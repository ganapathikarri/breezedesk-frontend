import React, { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { AlertCircle, ArrowRight, Lock, Mail, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AmbientBackground from '../components/ui/AmbientBackground'
import { buttonPress, fadeUp, pageTransition, staggerContainer } from '../components/ui/motion'
import { toast } from 'sonner'

const RegisterPage: React.FC = () => {
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', displayName: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ ...form, role: 'FREELANCER' })
      toast.success('Workspace created')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AmbientBackground variant="auth" className="grid place-items-center px-4 py-10">
      <Motion.div {...pageTransition} className="w-full max-w-md">
        <Motion.div variants={staggerContainer} initial="initial" animate="animate" className="rounded-[2rem] border border-surface-200 bg-background/80 p-6 shadow-hover backdrop-blur-sm sm:p-8">
          <Motion.div variants={fadeUp} className="mb-8 text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-brand-glow">
              <span className="text-2xl font-black">B</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-text-900">Create workspace</h1>
            <p className="mt-2 text-sm font-medium text-text-600">Premium client approvals, timestamp comments, and secure video portals.</p>
          </Motion.div>

          <Motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="displayName" className="label">Display name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-600" />
                <input id="displayName" value={form.displayName} onChange={event => setForm(prev => ({ ...prev, displayName: event.target.value }))} className="input pl-10" placeholder="Lakshmi Ganapathi" minLength={2} maxLength={120} autoComplete="name" required />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-600" />
                <input id="email" type="email" value={form.email} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))} className="input pl-10" placeholder="you@agency.com" autoComplete="email" required />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-600" />
                <input id="password" type="password" value={form.password} onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))} className="input pl-10" placeholder="Minimum 6 characters" minLength={6} autoComplete="new-password" required />
              </div>
            </div>

            {error && <div className="alert-error"><AlertCircle className="size-5 shrink-0" />{error}</div>}

            <Motion.button {...buttonPress} type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Creating…' : 'Create owner account'}
              {!loading && <ArrowRight className="size-4" />}
            </Motion.button>
          </Motion.form>

          <Motion.div variants={fadeUp} className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-text-600">
            <span className="rounded-xl bg-surface-50 px-2 py-2">SOC 2</span>
            <span className="rounded-xl bg-surface-50 px-2 py-2">AES-256</span>
            <span className="rounded-xl bg-surface-50 px-2 py-2">JWT</span>
          </Motion.div>

          <Motion.p variants={fadeUp} className="mt-8 text-center text-sm font-medium text-text-600">
            Already have an account? <Link to="/login" className="font-bold text-brand hover:underline">Sign in</Link>
          </Motion.p>
        </Motion.div>
      </Motion.div>
    </AmbientBackground>
  )
}

export default RegisterPage
