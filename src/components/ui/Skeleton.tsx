import React from 'react'

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded-xl bg-surface-100 ${className}`} />
)

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-28" />
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-48" />)}
    </div>
  </div>
)
