import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Clock3, MessageCircle, PlusCircle, ShieldCheck, Video } from 'lucide-react'
import { dashboardApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { formatShortDate, titleCase } from '../lib/format'
import { DashboardSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { StatusPill } from '../components/ui/StatusPill'
import StorageMeter from '../components/common/StorageMeter'
import { fadeUp, staggerContainer, staggerItem } from '../components/ui/motion'

const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <Motion.div variants={staggerItem} className="card p-4 sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-600">{label}</p>
      <div className="flex size-9 items-center justify-center rounded-xl bg-brand/10 text-brand">{icon}</div>
    </div>
    <p className="text-3xl font-black tracking-tight text-text-900">{value}</p>
  </Motion.div>
)

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['dashboard-workspace'], queryFn: dashboardApi.workspace })

  if (isLoading) return <DashboardSkeleton />

  if (isError) {
    return (
      <div className="card border-destructive/30 bg-destructive/5">
        <h1 className="text-2xl font-black text-text-900">Dashboard could not load</h1>
        <p className="mt-2 text-sm font-medium text-text-600">{error instanceof Error ? error.message : 'Check backend, JWT, and CORS configuration.'}</p>
      </div>
    )
  }

  const portals = data?.portals ?? []

  return (
    <div className="space-y-6">
      {/* Compact header + primary CTA */}
      <Motion.section
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-4 rounded-2xl border border-surface-200 bg-background/80 p-5 shadow-rest backdrop-blur-sm sm:flex-row sm:items-end sm:justify-between sm:p-6"
      >
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="size-3" /> Owner workspace
          </div>
          <h1 className="truncate text-2xl font-black tracking-tight text-text-900 sm:text-3xl">
            Welcome back, {user?.displayName?.split(' ')[0] || 'Owner'}
          </h1>
          <p className="mt-1 text-sm font-medium text-text-600">
            Manage every client project, review video, and open comment from one place.
          </p>
        </div>
        <Link to="/portals/new" className="btn-primary h-fit shrink-0">
          <PlusCircle className="size-4" /> Create portal
        </Link>
      </Motion.section>

      <Motion.section variants={staggerContainer} initial="initial" animate="animate" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total portals" value={data?.totalPortals ?? 0} icon={<Video className="size-4" />} />
        <StatCard label="Active" value={data?.activePortals ?? 0} icon={<Clock3 className="size-4" />} />
        <StatCard label="Approved" value={data?.approvedPortals ?? 0} icon={<CheckCircle2 className="size-4" />} />
        <StatCard label="Open comments" value={data?.totalUnresolvedComments ?? 0} icon={<MessageCircle className="size-4" />} />
      </Motion.section>

      <StorageMeter />

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-text-900">Client portals</h2>
            <p className="text-xs font-medium text-text-600">Each row shows the latest video and open comments.</p>
          </div>
        </div>

        {portals.length === 0 ? (
          <EmptyState
            title="No client portals yet"
            description="Create your first portal, upload a video, and share the magic link with your client."
            actionLabel="Create portal"
            onAction={() => navigate('/portals/new')}
          />
        ) : (
          <Motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-3 md:grid-cols-2">
            {portals.map((portal) => {
              const open = portal.unresolvedCount ?? 0
              return (
                <Motion.article
                  key={portal.id}
                  variants={staggerItem}
                  whileHover={{ y: -2 }}
                  className="card group p-0"
                >
                  <Link to={`/portals/${portal.id}`} className="block p-4 sm:p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-text-900">{portal.projectName}</h3>
                        <p className="mt-0.5 truncate text-xs font-semibold text-text-600">
                          {portal.clientName || 'Unnamed client'} · Updated {formatShortDate(portal.updatedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {open > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                            <MessageCircle className="size-3" />
                            {open} open
                          </span>
                        )}
                        <StatusPill status={portal.status} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-50 p-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-black text-white dark:bg-white dark:text-black">
                        <Video className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-text-900">
                          {portal.latestVideoTitle || 'No video uploaded yet'}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] font-medium text-text-600">
                          {titleCase(portal.status)}
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-text-600 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                </Motion.article>
              )
            })}
          </Motion.div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg font-black text-text-900">Recent activity</h2>
          <div className="mt-3 divide-y divide-surface-200">
            {(data?.recentActivity ?? []).length === 0 ? (
              <p className="py-4 text-sm font-medium text-text-600">No activity yet.</p>
            ) : (
              data!.recentActivity.slice(0, 6).map((activity) => (
                <div key={`${activity.portalId}-${activity.timestamp}-${activity.action}`} className="py-2.5">
                  <p className="text-sm font-bold text-text-900">{titleCase(activity.action)}</p>
                  <p className="text-[11px] font-medium text-text-600">
                    {activity.projectName} · {activity.actorName} · {formatShortDate(activity.timestamp)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
