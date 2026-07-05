import React, { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  Copy,
  ExternalLink,
  FileVideo,
  Link2,
  RefreshCcw,
  Share2,
  Trash2,
  UploadCloud,
  Video as VideoIcon,
  Wallet,
  Workflow,
  X,
} from 'lucide-react'
import {
  commentApi,
  getApiErrorMessage,
  portalApi,
  storageApi,
  uploadPartToR2,
  videoApi,
} from '../lib/api'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatShortDate } from '../lib/format'
import { StatusPill } from '../components/ui/StatusPill'
import VideoReviewPanel from '../components/video/VideoReviewPanel'
import { buttonPress, fadeUp } from '../components/ui/motion'
import type {
  AddVideoLinkRequest,
  InitMultipartUploadRequest,
  PaymentStatus,
  PortalStatus,
} from '../types'

const statuses: PortalStatus[] = ['UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'ARCHIVED']
const paymentStatuses: PaymentStatus[] = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']

const providerOptions = ['URL', 'VIMEO', 'YOUTUBE', 'GDRIVE', 'BUNNY', 'CLOUDINARY'] as const

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`
}

const SectionHeader: React.FC<{
  icon: React.ReactNode
  title: string
  description?: string
}> = ({ icon, title, description }) => (
  <div className="flex items-start gap-3">
    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
      {icon}
    </div>
    <div className="min-w-0">
      <h2 className="text-base font-bold text-text-900">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs font-medium text-text-600">{description}</p>
      )}
    </div>
  </div>
)

const PortalDetailPage: React.FC = () => {
  const { portalId } = useParams()
  const navigate = useNavigate()
  const numericPortalId = Number(portalId)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [copied, setCopied] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'completing'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [linkForm, setLinkForm] = useState({
    title: '',
    videoProvider: 'URL',
    videoUrl: '',
    embedUrl: '',
    durationSeconds: '',
  })
  const [paymentForm, setPaymentForm] = useState({
    projectAmount: '',
    amountPaid: '',
    paymentStatus: 'UNPAID' as PaymentStatus,
    currency: 'USD',
    paymentDueDate: '',
  })

  const portalQuery = useQuery({
    queryKey: ['portal', numericPortalId],
    queryFn: () => portalApi.getById(numericPortalId),
    enabled: Number.isFinite(numericPortalId),
    onSuccess: (portal) => {
      setPaymentForm({
        projectAmount: portal.projectAmount != null ? String(portal.projectAmount) : '',
        amountPaid: portal.amountPaid != null ? String(portal.amountPaid) : '',
        paymentStatus: (portal.paymentStatus as PaymentStatus) || 'UNPAID',
        currency: portal.currency || 'USD',
        paymentDueDate: portal.paymentDueDate ? portal.paymentDueDate.slice(0, 10) : '',
      })
    },
  })

  const portal = portalQuery.data
  const comments = useMemo(() => portal?.comments ?? [], [portal?.comments])
  const magicLink =
    portal?.magicLink ||
    (portal?.magicToken
      ? `${window.location.origin}/review/portal/${portal.magicToken}`
      : '')

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['portal', numericPortalId] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard-workspace'] })
  }

  // ── Multipart upload mutation (API unchanged) ────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a video file first')

      setUploadError(null)
      setUploadProgress(0)
      setUploadState('uploading')

      const initPayload: InitMultipartUploadRequest = {
        portalId: numericPortalId,
        fileName: file.name,
        fileSizeBytes: file.size,
        contentType: file.type || 'video/mp4',
      }
      const session = await storageApi.initMultipart(initPayload)

      const chunkSize = 5 * 1024 * 1024
      const chunks = Math.ceil(file.size / chunkSize)
      const etags: string[] = []

      for (let i = 0; i < chunks; i++) {
        try {
          const start = i * chunkSize
          const end = Math.min(start + chunkSize, file.size)
          const chunk = file.slice(start, end)

          const partUrlData = await storageApi.getPartPresignedUrl(session.uploadId, {
            r2Path: session.r2Path,
            partNumber: i + 1,
          })

          const etag = await uploadPartToR2(partUrlData.uploadUrl, chunk, (chunkProgress) => {
            const overallProgress = Math.round(((i + chunkProgress / 100) / chunks) * 100)
            setUploadProgress(Math.min(99, overallProgress))
          })

          etags.push(etag)
        } catch (error) {
          await storageApi
            .abortMultipart(session.uploadId, session.r2Path)
            .catch(() => {})
          throw new Error(
            `Failed to upload chunk ${i + 1}/${chunks}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
        }
      }

      setUploadState('completing')
      setUploadProgress(95)
      await storageApi.completeMultipart(session.uploadId, {
        videoId: session.videoId,
        r2Path: session.r2Path,
        fileSizeBytes: file.size,
        etags,
      })
      setUploadProgress(100)
    },
    onSuccess: () => {
      setFile(null)
      setTitle('')
      setUploadProgress(0)
      setUploadState('idle')
      toast.success('Video uploaded successfully')
      void invalidate()
    },
    onError: (error) => {
      // Inline error already shown near upload UI; skip toast to avoid duplicates
      setUploadError(getApiErrorMessage(error, 'Upload failed'))
      setUploadState('idle')
    },
  })

  const addLinkMutation = useMutation({
    mutationFn: () => {
      if (!portal?.id) throw new Error('No portal ID available')
      return videoApi.addLink({
        portalId: portal.id,
        title: linkForm.title,
        videoProvider: linkForm.videoProvider as AddVideoLinkRequest['videoProvider'],
        videoUrl: linkForm.videoUrl,
        embedUrl: linkForm.embedUrl,
        durationSeconds: linkForm.durationSeconds
          ? parseFloat(linkForm.durationSeconds)
          : undefined,
      })
    },
    onSuccess: () => {
      setLinkForm({
        title: '',
        videoProvider: 'URL',
        videoUrl: '',
        embedUrl: '',
        durationSeconds: '',
      })
      toast.success('Video link added')
      void invalidate()
    },
    onError: (error) => {
      toast.error('Could not add video link', {
        description: getApiErrorMessage(error, 'Please try again.'),
      })
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: ({
      body,
      timestampSeconds,
      createdByName,
    }: {
      body: string
      timestampSeconds: number
      createdByName: string
    }) => {
      if (!portal?.video?.id) throw new Error('No videoId available for this portal')
      return commentApi.add({
        videoId: portal.video.id,
        body,
        timestampSeconds,
        createdByName,
        authorType: 'EDITOR',
        markerType: 'COMMENT',
        markerColor: 'CYAN',
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

  const toggleResolveMutation = useMutation({
    mutationFn: ({ commentId, resolved }: { commentId: number; resolved: boolean }) =>
      commentApi.toggleResolve(commentId, resolved),
    onSuccess: (_data, variables) => {
      toast.success(variables.resolved ? 'Comment resolved' : 'Comment reopened', { duration: 2500 })
      void invalidate()
    },
    onError: (error) => {
      toast.error('Could not update comment', {
        description: getApiErrorMessage(error, 'Please try again.'),
      })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => portalApi.updateStatus(numericPortalId, status),
    onSuccess: (_data, status) => {
      const messages: Record<string, string> = {
        APPROVED: 'Portal marked as approved',
        CHANGES_REQUESTED: 'Changes requested',
        UNDER_REVIEW: 'Portal moved to review',
        ARCHIVED: 'Portal archived',
      }
      toast.success(messages[status] ?? 'Portal status updated')
      void invalidate()
    },
    onError: (error) => {
      toast.error('Could not update status', {
        description: getApiErrorMessage(error, 'Please try again.'),
      })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: () => portalApi.archive(numericPortalId),
    onSuccess: () => {
      toast.success('Portal archived')
      void invalidate()
    },
    onError: (error) => {
      toast.error('Could not archive portal', {
        description: getApiErrorMessage(error, 'Please try again.'),
      })
    },
  })

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const deleteMutation = useMutation({
    mutationFn: () => portalApi.delete(numericPortalId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ['portal', numericPortalId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard-workspace'] })
      setShowDeleteModal(false)
      toast.success('Portal deleted permanently')
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => {
      toast.error('Could not delete portal', {
        description: getApiErrorMessage(error, 'Please try again.'),
        duration: 6000,
      })
    },
  })

  const paymentMutation = useMutation({
    mutationFn: () =>
      portalApi.updatePayment(numericPortalId, {
        projectAmount: paymentForm.projectAmount
          ? Number(paymentForm.projectAmount)
          : undefined,
        amountPaid: paymentForm.amountPaid ? Number(paymentForm.amountPaid) : undefined,
        paymentStatus: paymentForm.paymentStatus,
        currency: paymentForm.currency,
        paymentDueDate: paymentForm.paymentDueDate
          ? new Date(`${paymentForm.paymentDueDate}T23:59:59.000Z`).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success('Payment details updated')
      void invalidate()
    },
    onError: (error) => {
      toast.error('Could not update payment', {
        description: getApiErrorMessage(error, 'Please try again.'),
      })
    },
  })


  const copyMagicLink = async () => {
    if (!magicLink) return
    try {
      await navigator.clipboard.writeText(magicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not copy link', {
        description: 'Copy it manually from the field above.',
      })
    }
  }


  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped && dropped.type.startsWith('video/')) setFile(dropped)
  }

  if (portalQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="card h-48 animate-pulse" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="card h-96 animate-pulse" />
          <div className="card h-96 animate-pulse" />
        </div>
      </div>
    )
  }

  if (portalQuery.isError || !portal) {
    return (
      <div className="card border-destructive/30 bg-destructive/5">
        <h1 className="text-2xl font-black text-text-900">Portal not found</h1>
        <p className="mt-2 text-sm font-medium text-text-600">
          {getApiErrorMessage(portalQuery.error, 'Could not load portal')}
        </p>
        <Link to="/dashboard" className="btn-primary mt-5">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const currentStatus = (portal.status || 'UNDER_REVIEW').toUpperCase()
  const isApproved = currentStatus === 'APPROVED'
  const needsChanges = currentStatus === 'CHANGES_REQUESTED'

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <Motion.header
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="card p-6 sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-text-600 transition hover:bg-surface-50 hover:text-brand"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
          <p className="hidden truncate text-xs font-medium text-text-600 sm:block">
            Dashboard <span className="mx-1 text-text-600/60">/</span> Portal
            <span className="mx-1 text-text-600/60">/</span>
            <span className="text-text-900">{portal.projectName}</span>
          </p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 lg:flex lg:flex-wrap lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
              Client portal
            </p>
            <h1 className="mt-2 break-words text-3xl font-black leading-tight tracking-tight text-text-900 sm:text-4xl lg:text-[2.75rem]">
              {portal.projectName}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-text-600">
              <span className="text-text-900">
                {portal.clientName || 'Unnamed client'}
              </span>
              <span className="text-text-600/50">·</span>
              <span>Created {formatShortDate(portal.createdAt)}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <StatusPill status={portal.status} />
            <span className="rounded-full bg-surface-100 px-3 py-1.5 font-mono text-[11px] font-bold text-text-600">
              Portal #{portal.id}
            </span>
          </div>
        </div>

        {/* Share link */}
        <div className="mt-6 rounded-2xl border border-surface-200 bg-surface-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Share2 className="size-4 text-brand" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-600">
              Share portal with client
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <code className="block min-w-0 truncate rounded-lg border border-surface-200 bg-background px-3 py-2.5 font-mono text-xs font-semibold text-text-600">
              {magicLink || 'Magic link unavailable'}
            </code>
            <button
              type="button"
              onClick={copyMagicLink}
              disabled={!magicLink}
              className="btn-secondary"
            >
              {copied ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            {magicLink && (
              <a
                href={magicLink}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                <ExternalLink className="size-4" />
                Client view
              </a>
            )}
          </div>
        </div>
      </Motion.header>

      {/* ─── Main layout ────────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left / main */}
        <div className="min-w-0 space-y-6">
          <VideoReviewPanel
            video={portal.video}
            comments={comments}
            currentUserName={user?.displayName || 'Owner'}
            submitLabel="Post feedback"
            onAddComment={(body, timestampSeconds, createdByName) =>
              addCommentMutation
                .mutateAsync({ body, timestampSeconds, createdByName })
                .then(() => undefined)
            }
            onToggleResolve={(commentId, resolved) =>
              toggleResolveMutation
                .mutateAsync({ commentId, resolved })
                .then(() => undefined)
            }
          />
        </div>

        {/* Right / sidebar */}
        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          {/* Upload video */}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              uploadMutation.mutate()
            }}
            className="card space-y-4 p-5 sm:p-6"
          >
            <SectionHeader
              icon={<UploadCloud className="size-5" />}
              title="Upload review video"
              description="Large files upload directly to secure cloud storage."
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={uploadMutation.isLoading}
            />

            {file ? (
              <div className="flex items-center gap-3 rounded-2xl border border-surface-200 bg-surface-50 p-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <FileVideo className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-900">{file.name}</p>
                  <p className="mt-0.5 text-xs font-medium text-text-600">
                    {formatBytes(file.size)}
                  </p>
                </div>
                {!uploadMutation.isLoading && (
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-text-600 transition hover:bg-surface-100 hover:text-destructive"
                    aria-label="Remove file"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ')
                    fileInputRef.current?.click()
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  isDragging
                    ? 'border-brand bg-brand/5'
                    : 'border-surface-200 hover:border-brand/60 hover:bg-surface-50'
                }`}
              >
                <div className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                  <UploadCloud className="size-5" />
                </div>
                <p className="text-sm font-bold text-text-900">
                  Drop your video or{' '}
                  <span className="text-brand">browse files</span>
                </p>
                <p className="text-xs font-medium text-text-600">
                  MP4, MOV, WebM · up to your plan limit
                </p>
              </div>
            )}

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="input"
              placeholder="Optional title (e.g. Cut v2 — 60s promo)"
              disabled={uploadMutation.isLoading}
            />

            {uploadMutation.isLoading && (
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-text-600">
                  <span>{uploadState === 'completing' ? 'Finalizing' : 'Uploading'}</span>
                  <span className="font-mono text-brand">{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="alert-error">
                <AlertCircle className="size-4 shrink-0" />
                <p className="text-sm">{uploadError}</p>
              </div>
            )}

            {uploadMutation.isSuccess && (
              <div className="alert-success">
                <CheckCircle2 className="size-4 shrink-0" />
                <p className="text-sm">Upload complete!</p>
              </div>
            )}

            <Motion.button
              {...buttonPress}
              type="submit"
              disabled={!file || uploadMutation.isLoading}
              className="btn-primary w-full"
            >
              <UploadCloud className="size-4" />
              {uploadMutation.isLoading
                ? `${uploadState === 'completing' ? 'Finalizing' : 'Uploading'} ${uploadProgress}%`
                : 'Upload video'}
            </Motion.button>
          </form>

          {/* External link */}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              addLinkMutation.mutate()
            }}
            className="card space-y-4 p-5 sm:p-6"
          >
            <SectionHeader
              icon={<Link2 className="size-5" />}
              title="Or link external video"
              description="Use this for YouTube, Vimeo, Drive, or hosted video links."
            />

            <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
              <select
                value={linkForm.videoProvider}
                onChange={(event) =>
                  setLinkForm((prev) => ({ ...prev, videoProvider: event.target.value }))
                }
                className="input"
              >
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
              <input
                value={linkForm.title}
                onChange={(event) =>
                  setLinkForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="input"
                placeholder="Video title"
                required
              />
            </div>

            <input
              value={linkForm.videoUrl}
              onChange={(event) =>
                setLinkForm((prev) => ({ ...prev, videoUrl: event.target.value }))
              }
              className="input"
              placeholder="Playable video URL"
              required
            />
            <input
              value={linkForm.embedUrl}
              onChange={(event) =>
                setLinkForm((prev) => ({ ...prev, embedUrl: event.target.value }))
              }
              className="input"
              placeholder="Embed URL (optional)"
            />

            {addLinkMutation.isError && (
              <p className="text-sm font-medium text-destructive">
                {getApiErrorMessage(addLinkMutation.error, 'Could not add video link')}
              </p>
            )}

            <Motion.button
              {...buttonPress}
              type="submit"
              disabled={addLinkMutation.isLoading}
              className="btn-secondary w-full"
            >
              <Link2 className="size-4" />
              {addLinkMutation.isLoading ? 'Linking…' : 'Add video link'}
            </Motion.button>
          </form>

          {/* Approval flow */}
          <div className="card space-y-4 p-5 sm:p-6">
            <SectionHeader
              icon={<Workflow className="size-5" />}
              title="Approval flow"
              description="Track where this project sits in the review loop."
            />

            <div className="flex items-center justify-between rounded-2xl border border-surface-200 bg-surface-50 p-3">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-text-600">
                Current status
              </span>
              <StatusPill status={portal.status} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => statusMutation.mutate('APPROVED')}
                disabled={statusMutation.isLoading || isApproved}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                  isApproved
                    ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-emerald-300'
                    : 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 hover:bg-emerald-500/15 dark:text-emerald-300'
                }`}
              >
                <CheckCircle2 className="size-3.5" />
                Mark approved
              </button>
              <button
                type="button"
                onClick={() => statusMutation.mutate('CHANGES_REQUESTED')}
                disabled={statusMutation.isLoading || needsChanges}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
                  needsChanges
                    ? 'bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-300'
                    : 'bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 hover:bg-amber-500/15 dark:text-amber-300'
                }`}
              >
                <RefreshCcw className="size-3.5" />
                Request changes
              </button>
            </div>

            <div>
              <label className="label" htmlFor="statusSelect">
                Set custom status
              </label>
              <select
                id="statusSelect"
                value={portal.status}
                onChange={(event) => statusMutation.mutate(event.target.value)}
                className="input"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isLoading}
              className="btn-secondary w-full"
            >
              <Archive className="size-4" />
              Archive portal
            </button>

            {(statusMutation.isError || archiveMutation.isError) && (
              <p className="text-sm font-medium text-destructive">
                {getApiErrorMessage(statusMutation.error || archiveMutation.error)}
              </p>
            )}
          </div>

          {/* Payment */}
          <form
            onSubmit={(event) => {
              event.preventDefault()
              paymentMutation.mutate()
            }}
            className="card space-y-4 p-5 sm:p-6"
          >
            <SectionHeader
              icon={<Wallet className="size-5" />}
              title="Payment"
              description="Track invoicing alongside the review."
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="projectAmount">
                  Total
                </label>
                <input
                  id="projectAmount"
                  value={paymentForm.projectAmount}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      projectAmount: event.target.value,
                    }))
                  }
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="label" htmlFor="amountPaid">
                  Paid
                </label>
                <input
                  id="amountPaid"
                  value={paymentForm.amountPaid}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, amountPaid: event.target.value }))
                  }
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="paymentStatus">
                  Status
                </label>
                <select
                  id="paymentStatus"
                  value={paymentForm.paymentStatus}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      paymentStatus: event.target.value as PaymentStatus,
                    }))
                  }
                  className="input"
                >
                  {paymentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="currency">
                  Currency
                </label>
                <input
                  id="currency"
                  value={paymentForm.currency}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, currency: event.target.value }))
                  }
                  className="input"
                  placeholder="USD"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="paymentDueDate">
                Due date
              </label>
              <input
                id="paymentDueDate"
                value={paymentForm.paymentDueDate}
                onChange={(event) =>
                  setPaymentForm((prev) => ({
                    ...prev,
                    paymentDueDate: event.target.value,
                  }))
                }
                className="input"
                type="date"
              />
              {portal.paymentDueDate && (
                <p className="mt-1.5 text-xs font-medium text-text-600">
                  Currently due: {formatDate(portal.paymentDueDate)}
                </p>
              )}
            </div>

            {paymentMutation.isError && (
              <p className="text-sm font-medium text-destructive">
                {getApiErrorMessage(paymentMutation.error, 'Payment update failed')}
              </p>
            )}

            <Motion.button
              {...buttonPress}
              type="submit"
              disabled={paymentMutation.isLoading}
              className="btn-primary w-full"
            >
              <RefreshCcw className="size-4" />
              {paymentMutation.isLoading ? 'Saving…' : 'Save payment'}
            </Motion.button>
          </form>

          {/* Video quick meta */}
          {portal.video && (
            <div className="card space-y-2 p-5 sm:p-6">
              <SectionHeader
                icon={<VideoIcon className="size-5" />}
                title="Current video"
              />
              <dl className="mt-2 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-text-600">
                    Comments
                  </dt>
                  <dd className="mt-1 text-lg font-black text-text-900">
                    {comments.length}
                  </dd>
                </div>
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-text-600">
                    Open
                  </dt>
                  <dd className="mt-1 text-lg font-black text-text-900">
                    {comments.filter((c) => !c.resolved).length}
                  </dd>
                </div>
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-text-600">
                    Source
                  </dt>
                  <dd className="mt-1 truncate text-xs font-black uppercase text-text-900">
                    {portal.video.videoProvider || 'LOCAL'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* ── Danger zone ── */}
          <div className="card space-y-3 border-destructive/30 bg-destructive/5 p-5 sm:p-6">
            <SectionHeader
              icon={<Trash2 className="size-5" />}
              title="Danger zone"
              description="Permanent actions. Archive instead if the client may return."
            />
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText('')
                setShowDeleteModal(true)
              }}
              className="btn-danger w-full"
            >
              <Trash2 className="size-4" />
              Delete project
            </button>
            <p className="text-[11px] font-medium text-text-600">
              Archive is a soft action. Delete permanently removes the portal, video,
              comments, approvals, and uploaded file from storage.
            </p>
          </div>
        </aside>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => !deleteMutation.isLoading && setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-surface-200 bg-background p-6 shadow-hover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
                <AlertCircle className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-text-900">Delete project permanently?</h3>
                <p className="mt-1 text-sm font-medium text-text-600">
                  This will remove the project, comments, approvals, video record, and the
                  uploaded video from storage. This cannot be undone.
                </p>
              </div>
            </div>

            <label className="label" htmlFor="deleteConfirm">
              Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
            </label>
            <input
              id="deleteConfirm"
              className="input"
              autoFocus
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              disabled={deleteMutation.isLoading}
            />

            {deleteMutation.isError && (
              <p className="mt-2 text-sm font-medium text-destructive">
                {getApiErrorMessage(deleteMutation.error, 'Delete failed')}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isLoading}
                className="btn-secondary"
              >
                <X className="size-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteConfirmText.trim() !== 'DELETE' || deleteMutation.isLoading}
                className="btn-danger"
              >
                <Trash2 className="size-4" />
                {deleteMutation.isLoading ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PortalDetailPage
