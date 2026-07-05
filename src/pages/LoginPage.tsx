import React, { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { AlertCircle, ArrowRight, BadgeCheck, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AmbientBackground from '../components/ui/AmbientBackground'
import { buttonPress, fadeUp, pageTransition, staggerContainer } from '../components/ui/motion'
import { toast } from 'sonner'

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login({ email, password })
      toast.success('Welcome back')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AmbientBackground variant="auth" className="grid place-items-center px-4 py-10">
      <Motion.div {...pageTransition} className="w-full max-w-6xl">
        <div className="grid overflow-hidden rounded-[2rem] border border-surface-200 bg-background/80 shadow-hover backdrop-blur-sm lg:grid-cols-[1.05fr_0.95fr]">
          <Motion.section variants={staggerContainer} initial="initial" animate="animate" className="hidden min-h-[42rem] flex-col justify-between border-r border-surface-200 p-10 lg:flex">
            <Motion.div variants={fadeUp}>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-text-600">
                <span className="size-2 rounded-full bg-emerald-500" /> Secure video workflow
              </div>
              <h1 className="max-w-xl text-6xl font-black leading-[0.95] tracking-tight text-text-900">
                Review videos with bank-grade calm.
              </h1>
              <p className="mt-6 max-w-lg text-base font-medium leading-7 text-text-600">
                BreezeDesk keeps client portals, approvals, timestamp feedback, and secure media handoff in one polished workspace.
              </p>
            </Motion.div>
            <Motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
              {[['SOC 2', 'Ready controls'], ['AES-256', 'Token secured'], ['99.9%', 'Uptime target']].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-surface-200 bg-surface-50 p-4">
                  <p className="font-mono text-lg font-black text-text-900">{title}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-600">{copy}</p>
                </div>
              ))}
            </Motion.div>
          </Motion.section>

          <section className="p-6 sm:p-10">
            <Motion.div variants={staggerContainer} initial="initial" animate="animate" className="mx-auto flex min-h-[38rem] max-w-md flex-col justify-center">
              <Motion.div variants={fadeUp} className="mb-8">
                <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-brand-glow">
                  <span className="text-2xl font-black">B</span>
                </div>
                <h2 className="text-4xl font-black tracking-tight text-text-900">Welcome back</h2>
                <p className="mt-2 text-sm font-medium text-text-600">Sign in to your owner workspace.</p>
              </Motion.div>

              <Motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="label">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-600" />
                    <input id="email" type="email" value={email} onChange={event => setEmail(event.target.value)} className="input pl-10" placeholder="you@agency.com" autoComplete="email" required autoFocus />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="label">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-600" />
                    <input id="password" type="password" value={password} onChange={event => setPassword(event.target.value)} className="input pl-10" placeholder="••••••••" autoComplete="current-password" required />
                  </div>
                </div>

                {error && (
                  <div className="alert-error">
                    <AlertCircle className="size-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Motion.button {...buttonPress} type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Signing in…' : 'Sign in'}
                  {!loading && <ArrowRight className="size-4" />}
                </Motion.button>
              </Motion.form>

              <Motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-text-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-50 px-2.5 py-1"><ShieldCheck className="size-3.5" />Bearer JWT</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-50 px-2.5 py-1"><BadgeCheck className="size-3.5" />Magic links isolated</span>
              </Motion.div>

              <Motion.p variants={fadeUp} className="mt-8 text-center text-sm font-medium text-text-600">
                No account? <Link to="/register" className="font-bold text-brand hover:underline">Create one</Link>
              </Motion.p>
            </Motion.div>
          </section>
        </div>
      </Motion.div>
    </AmbientBackground>
  )
}

export default LoginPage
