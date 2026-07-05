import React from 'react'
import { Leaf, Rocket, Zap } from 'lucide-react'
import type { SubscriptionTierName } from '../../types'
import { titleCase } from '../../lib/format'

interface Props {
  tier?: SubscriptionTierName | null
  size?: 'sm' | 'md'
}

const iconFor = (tier: string) => {
  if (tier === 'PRO') return <Rocket className="size-3.5" />
  if (tier === 'FREELANCER') return <Zap className="size-3.5" />
  return <Leaf className="size-3.5" />
}

export const PlanBadge: React.FC<Props> = ({ tier = 'FREE', size = 'sm' }) => {
  const value = (tier || 'FREE').toUpperCase()
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-brand/10 font-semibold text-brand ring-1 ring-brand/20 ${size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'}`}>
      {iconFor(value)}
      {titleCase(value)}
    </span>
  )
}

export default PlanBadge
