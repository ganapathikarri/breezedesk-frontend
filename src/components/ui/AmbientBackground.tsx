import React from 'react'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { easeOutExpo } from './motion'

type AmbientVariant = 'auth' | 'dashboard' | 'subtle'

interface AmbientBackgroundProps {
  variant?: AmbientVariant
  children?: React.ReactNode
  className?: string
}

const variantBlobs: Record<AmbientVariant, Array<{ className: string; delay: number }>> = {
  auth: [
    { className: 'left-[-10%] top-[-8%] h-80 w-80 bg-brand/30 dark:bg-brand/20', delay: 0 },
    { className: 'right-[-8%] top-[12%] h-96 w-96 bg-sky-400/24 dark:bg-sky-500/14', delay: 0.35 },
    { className: 'bottom-[-12%] left-[22%] h-[30rem] w-[30rem] bg-violet-500/20 dark:bg-violet-500/14', delay: 0.7 },
  ],
  dashboard: [
    { className: 'right-[-10%] top-[-10%] h-96 w-96 bg-brand/12 dark:bg-brand/12', delay: 0 },
    { className: 'bottom-[-15%] left-[8%] h-[28rem] w-[28rem] bg-violet-500/10 dark:bg-violet-500/10', delay: 0.6 },
  ],
  subtle: [
    { className: 'right-[-14%] top-[10%] h-[32rem] w-[32rem] bg-sky-400/10 dark:bg-brand/10', delay: 0 },
  ],
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ variant = 'subtle', children, className = '' }) => {
  const reducedMotion = useReducedMotion()

  return (
    <div className={`relative min-h-screen overflow-hidden bg-background text-text-900 ${className}`}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,var(--surface-200)_1px,transparent_1px),linear-gradient(to_bottom,var(--surface-200)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_76%)]">
        {variantBlobs[variant].map((blob, index) => (
          <Motion.div
            key={`${variant}-${index}`}
            className={`absolute rounded-full blur-3xl bg-gradient-to-br from-violet-500/20 via-sky-400/20 to-brand/20 ${blob.className}`}
            animate={reducedMotion ? undefined : { x: [0, 26, -18, 0], y: [0, -22, 18, 0], scale: [1, 1.08, 0.98, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: easeOutExpo, delay: blob.delay }}
          />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default AmbientBackground
