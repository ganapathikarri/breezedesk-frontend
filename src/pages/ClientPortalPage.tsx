import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import { CheckCircle2, RotateCcw, Send, ShieldCheck } from 'lucide-react'
import AmbientBackground from '../components/ui/AmbientBackground'
import { StatusPill } from '../components/ui/StatusPill'
import VideoReviewPanel from '../components/video/VideoReviewPanel'
import { clientPortalApi, getApiErrorMessage } from '../lib/api'
import { toast } from 'sonner'
import { formatDuration } from '../lib/format'
import { pageTransition } from '../components/ui/motion'

const ClientPortalPage: React.FC = () => {
  const { magicToken = '' } = useParams()
  const queryClient = useQueryClient()

  const [clientName, setClientName] = useState('')
  const [body, setBody] = useState('')
  const [nowSeconds, setNowSeconds] = useState(0)
  const ctrlRef = useRef<{ seekTo: (s: number) => void; getCurrentTime: () => number } | null>(null)

  const portalQuery = useQuery({
    queryKey: ['client-portal', magicToken],
    queryFn: () => clientPortalApi.get(magicToken),
    enabled: Boolean(magicToken),
    onSuccess: portal => {
      if (!clientName) setClientName(portal.clientName || '')
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['client-portal', magicToken] })

  const commentMutation = useMutation({
    mutationFn: ({ body, timestampSeconds, createdByName }: { body: string; timestampSeconds: number; createdByName: string }) => {
      const videoId = portalQuery.data?.video?.id
      if (!videoId) throw new Error('No videoId available for this client portal')
      return clientPortalApi.addComment(magicToken, {
        videoId,
        body,
        timestampSeconds,
        createdByName,
        authorType: 'CLIENT',
        markerType: 'COMMENT',
        markerColor: 'AMBER',
        priorityLevel: 0,
      })
    },
    onSuccess: () => {
      toast.success('Comment added', { duration: 2500 })
      void invalidate()
    },
    onError: (error) => {
      toast.error('Could not add comment', {
        description: getApiErrorMessage(error, 'Please try again.'),
      })
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => clientPortalApi.approve(magicToken),
    onSuccess: () => {
      toast.success('Video approved')
      void invalidate()
    },
    onError: (error) => {
      toast.error('Could not approve video', {
        description: getApiErrorMessage(error, 'Please try again.'),
      })
    },
  })

  const changesMutation = useMutation({
    mutationFn: () => clientPortalApi.requestChanges(magicToken),
    onSuccess: () => {
      toast.success('Change request sent')
      void invalidate()
    },
    onError: (error) => {
      toast.error('Could not request changes', {
        description: getApiErrorMessage(error, 'Please try again.'),
      })
    },
  })


  // Poll current time for the sticky bar label
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const t = ctrlRef.current?.getCurrentTime?.() ?? 0
      setNowSeconds(t)
    }, 500)
    return () => window.clearInterval(id)
  }, [])

  const submitStickyComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    const t = ctrlRef.current?.getCurrentTime?.() ?? nowSeconds
    await commentMutation.mutateAsync({
      body: body.trim(),
      timestampSeconds: Number(t.toFixed(2)),
      createdByName: clientName.trim() || 'Client',
    })
    setBody('')
  }

  return (
    <AmbientBackground variant="subtle">
      <Motion.main
        {...pageTransition}
        className="mx-auto min-h-screen max-w-4xl px-3 pb-40 pt-4 sm:px-6 sm:pb-10 sm:pt-8"
      >
        {portalQuery.isLoading && <div className="card min-h-72 animate-pulse" />}

        {portalQuery.isError && (
          <div className="card border-destructive/30 bg-destructive/5">
            <h1 className="text-2xl font-black text-text-900">Review link unavailable</h1>
            <p className="mt-2 text-sm font-medium text-text-600">
              {getApiErrorMessage(portalQuery.error, 'This magic link may be invalid or expired.')}
            </p>
          </div>
        )}

        {portalQuery.data && (
          <div className="space-y-4 sm:space-y-6">
            {/* Compact header — no oversized hero */}
            <header className="flex items-center justify-between gap-3 rounded-2xl border border-surface-200 bg-background/80 px-4 py-3 shadow-rest backdrop-blur-sm sm:px-5">
              <div className="min-w-0">
                <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="size-3" /> Secure review link
                </div>
                <h1 className="truncate text-lg font-black tracking-tight text-text-900 sm:text-2xl">
                  {portalQuery.data.projectName}
                </h1>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusPill status={portalQuery.data.status} />
                <span className="rounded-full bg-surface-100 px-2 py-0.5 font-mono text-[11px] font-bold text-text-600">
                  {portalQuery.data.unresolvedCount} open
                </span>
              </div>
            </header>

            {/* Video + timeline + comments — composer hidden on mobile (sticky bar takes over) */}
            <VideoReviewPanel
              video={portalQuery.data.video}
              comments={portalQuery.data.comments}
              currentUserName={clientName || 'Client'}
              submitLabel="Send"
              hideComposer
              onAddComment={(body, timestampSeconds, createdByName) =>
                commentMutation.mutateAsync({ body, timestampSeconds, createdByName }).then(() => undefined)
              }
              onReady={(ctrl) => {
                ctrlRef.current = ctrl
              }}
            />

            {/* Simple approval actions (desktop-visible; also duplicated in sticky bar overflow) */}
            <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="text-base font-bold text-text-900">Ready to decide?</h2>
                <p className="mt-0.5 text-xs font-medium text-text-600">
                  Approve to lock this version, or request changes to send it back.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
                <button
                  type="button"
                  onClick={() => changesMutation.mutate()}
                  disabled={changesMutation.isLoading}
                  className="btn-secondary"
                >
                  <RotateCcw className="size-4" />
                  Request changes
                </button>
                <button
                  type="button"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isLoading}
                  className="btn-primary"
                >
                  <CheckCircle2 className="size-4" />
                  Approve
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ── Sticky mobile composer ── */}
        {portalQuery.data && (
          <form
            onSubmit={submitStickyComment}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-200 bg-background/95 px-3 py-2.5 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md sm:hidden"
          >
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-text-600">
              <span>
                Add comment at{' '}
                <span className="font-mono font-bold text-brand">{formatDuration(nowSeconds)}</span>
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => changesMutation.mutate()}
                  disabled={changesMutation.isLoading}
                  className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                >
                  Request changes
                </button>
                <button
                  type="button"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isLoading}
                  className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300"
                >
                  Approve
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="input h-10 !py-2 !px-3 text-sm"
                style={{ maxWidth: '7.5rem' }}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Name"
                aria-label="Your name"
              />
              <input
                className="input h-10 flex-1 !py-2 !px-3 text-sm"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What should change?"
                aria-label="Your comment"
              />
              <button
                type="submit"
                disabled={!body.trim() || commentMutation.isLoading}
                className="btn-primary h-10 !px-3"
                aria-label="Send comment"
              >
                <Send className="size-4" />
              </button>
            </div>
          </form>
        )}
      </Motion.main>
    </AmbientBackground>
  )
}

export default ClientPortalPage
