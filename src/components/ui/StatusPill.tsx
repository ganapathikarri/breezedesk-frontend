import React from 'react'
import { CheckCircle2, Clock3, History, ShieldCheck, XCircle } from 'lucide-react'
import { titleCase } from '../../lib/format'

const statusStyles: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  UNDER_REVIEW: 'bg-brand/10 text-brand ring-brand/20',
  CHANGES_REQUESTED: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
  ARCHIVED: 'bg-surface-100 text-text-600 ring-surface-200',
  REJECTED: 'bg-destructive/10 text-destructive ring-destructive/20',
  PENDING: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300',
}

const icons: Record<string, React.ReactNode> = {
  APPROVED: <CheckCircle2 className="size-3.5" />,
  UNDER_REVIEW: <Clock3 className="size-3.5" />,
  CHANGES_REQUESTED: <History className="size-3.5" />,
  ARCHIVED: <ShieldCheck className="size-3.5" />,
  REJECTED: <XCircle className="size-3.5" />,
  PENDING: <Clock3 className="size-3.5" />,
}

export const StatusPill: React.FC<{ status?: string | null; className?: string }> = ({ status = 'UNKNOWN', className = '' }) => {
  const key = (status || 'UNKNOWN').toUpperCase()
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[key] ?? 'bg-surface-100 text-text-600 ring-surface-200'} ${className}`}>
      {icons[key]}
      {titleCase(key)}
    </span>
  )
}
