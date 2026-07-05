import React from 'react'
import { motion as Motion } from 'framer-motion'
import { Film, Plus } from 'lucide-react'
import { fadeUp } from './motion'

export const EmptyState: React.FC<{
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}> = ({ title, description, actionLabel, onAction }) => (
  <Motion.div variants={fadeUp} initial="initial" animate="animate" className="card flex flex-col items-center justify-center p-10 text-center">
    <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
      <Film className="size-6" />
    </div>
    <h3 className="text-xl font-bold text-text-900">{title}</h3>
    <p className="mt-2 max-w-md text-sm font-medium text-text-600">{description}</p>
    {actionLabel && onAction && (
      <button type="button" onClick={onAction} className="btn-primary mt-6">
        <Plus className="size-4" />
        {actionLabel}
      </button>
    )}
  </Motion.div>
)
