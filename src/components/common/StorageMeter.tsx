import React from 'react'
import { AlertCircle, HardDrive } from 'lucide-react'
import { motion as Motion } from 'framer-motion'
import { useStorageInfo } from '../../hooks/useStorage'
import { formatBytes } from '../../lib/format'

export const StorageMeter: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { data: storage, isLoading, isError } = useStorageInfo()

  if (isLoading || isError || !storage) {
    if (compact) return null
    return (
      <div className="card">
        <div className="flex items-center gap-3 text-sm font-medium text-text-600">
          <HardDrive className="size-5" />
          Storage info is unavailable in this backend profile.
        </div>
      </div>
    )
  }

  const percentage = Math.min(storage.percentageUsed ?? 0, 100)
  const tone = percentage > 90 ? 'destructive' : percentage > 70 ? 'amber' : 'emerald'
  const barClass = tone === 'destructive' ? 'bg-destructive' : tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'

  if (compact) {
    return (
      <div className="space-y-2 rounded-2xl border border-surface-200 bg-surface-50 p-3">
        <div className="flex items-center justify-between text-xs font-semibold text-text-600">
          <span>Storage</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-200">
          <Motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={`h-full rounded-full ${barClass}`} />
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <HardDrive className="size-5" />
          </div>
          <div>
            <p className="font-bold text-text-900">Storage Usage</p>
            <p className="text-sm font-medium text-text-600">{formatBytes(storage.currentStorageUsedBytes)} of {formatBytes(storage.maxStorageAllowedBytes)}</p>
          </div>
        </div>
        {percentage > 90 && <AlertCircle className="size-5 text-destructive" />}
      </div>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-surface-100">
        <Motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.5 }} className={`h-full rounded-full ${barClass}`} />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-text-600">{storage.subscriptionTier} · {percentage.toFixed(1)}% used</p>
    </div>
  )
}

export default StorageMeter
