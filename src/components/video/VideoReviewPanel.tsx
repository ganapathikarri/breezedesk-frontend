import React, { useMemo, useRef, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { CheckCircle2, Film, MessageSquarePlus, PlayCircle } from 'lucide-react'
import type { ClientMarkerDTO, ClientVideoDTO, TimelineMarkerDTO, VideoResponseDTO } from '../../types'
import { formatDuration, formatShortDate } from '../../lib/format'
import { buttonPress, fadeUp } from '../ui/motion'

export type ReviewMarker = TimelineMarkerDTO | ClientMarkerDTO
export type ReviewVideo = VideoResponseDTO | ClientVideoDTO

const isEmbeddable = (video: ReviewVideo) =>
  Boolean(video.embedUrl && video.videoProvider && video.videoProvider !== 'LOCAL')

export const VideoReviewPanel: React.FC<{
  video?: ReviewVideo | null
  comments?: ReviewMarker[]
  currentUserName?: string
  readOnly?: boolean
  submitLabel?: string
  hideComposer?: boolean
  onAddComment?: (body: string, timestampSeconds: number, createdByName: string) => Promise<void>
  onToggleResolve?: (commentId: number, nextResolved: boolean) => Promise<void>
  /** Called with a controller so parents (e.g. sticky mobile bar) can seek / read current time. */
  onReady?: (ctrl: { seekTo: (s: number) => void; getCurrentTime: () => number }) => void
}> = ({
  video,
  comments = [],
  currentUserName = '',
  readOnly = false,
  submitLabel = 'Add marker',
  hideComposer = false,
  onAddComment,
  onToggleResolve,
  onReady,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [body, setBody] = useState('')
  const [timestamp, setTimestamp] = useState(0)
  const [duration, setDuration] = useState<number>(video?.durationSeconds || 0)
  const [authorName, setAuthorName] = useState(currentUserName)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null)

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => a.timestampSeconds - b.timestampSeconds),
    [comments],
  )
  const openCount = comments.filter((c) => !c.resolved).length

  const updateCurrentTime = () => {
    if (videoRef.current) setTimestamp(videoRef.current.currentTime || 0)
  }

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = seconds
    void videoRef.current.play().catch(() => undefined)
  }

  const seekAndHighlight = (id: number, seconds: number) => {
    setActiveCommentId(id)
    seekTo(seconds)
  }

  // Expose controller to parent
  React.useEffect(() => {
    if (!onReady) return
    onReady({
      seekTo,
      getCurrentTime: () => videoRef.current?.currentTime ?? 0,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReady, video?.id])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!onAddComment || !body.trim()) return
    const safeTimestamp = videoRef.current?.currentTime ?? timestamp
    setIsSubmitting(true)
    try {
      await onAddComment(
        body.trim(),
        Number(safeTimestamp.toFixed(2)),
        authorName.trim() || currentUserName || 'Reviewer',
      )
      setBody('')
      setTimestamp(videoRef.current?.currentTime ?? 0)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!video) {
    return (
      <div className="card flex min-h-[22rem] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          <PlayCircle className="size-7" />
        </div>
        <h3 className="text-xl font-bold text-text-900">No video attached yet</h3>
        <p className="mt-2 max-w-md text-sm font-medium text-text-600">
          Upload a review file or paste an external link to start collecting frame-accurate feedback.
        </p>
      </div>
    )
  }

  const playable = isEmbeddable(video) || Boolean(video.src)
  const effectiveDuration = duration || video.durationSeconds || 0

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Video + mini timeline (single premium surface) ── */}
      <Motion.section
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="card overflow-hidden p-3 sm:p-5"
      >
        <div className="overflow-hidden rounded-2xl border border-surface-200 bg-black">
          {isEmbeddable(video) ? (
            <iframe
              title={video.title}
              src={video.embedUrl || undefined}
              className="aspect-video w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : video.src ? (
            <video
              ref={videoRef}
              src={video.src}
              controls
              playsInline
              onTimeUpdate={updateCurrentTime}
              onLoadedMetadata={(e) => {
                updateCurrentTime()
                setDuration((e.currentTarget as HTMLVideoElement).duration || 0)
              }}
              className="aspect-video w-full bg-black"
            />
          ) : (
            <div className="grid aspect-video place-items-center gap-3 bg-gradient-to-br from-slate-900 to-slate-800 px-6 text-center text-white/80">
              <PlayCircle className="mx-auto size-10 opacity-70" />
              <p className="text-sm font-semibold">
                Video is finalizing — playback will appear here shortly.
              </p>
            </div>
          )}
        </div>

        {/* Mini timeline with markers */}
        {effectiveDuration > 0 && !isEmbeddable(video) && (
          <div className="mt-4 px-1">
            <div className="relative h-8">
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-200" />
              <div
                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand/60"
                style={{ width: `${Math.min(100, (timestamp / effectiveDuration) * 100)}%` }}
              />
              {sortedComments.map((c) => {
                const left = Math.min(100, Math.max(0, (c.timestampSeconds / effectiveDuration) * 100))
                const isActive = activeCommentId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Jump to comment at ${formatDuration(c.timestampSeconds)}`}
                    onClick={() => seekAndHighlight(c.id, c.timestampSeconds)}
                    style={{ left: `${left}%` }}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background transition ${
                      c.resolved ? 'bg-emerald-500' : 'bg-amber-500'
                    } ${isActive ? 'size-3.5 scale-110' : 'size-2.5 hover:scale-125'}`}
                  />
                )
              })}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[11px] font-semibold text-text-600">
              <span>{formatDuration(timestamp)}</span>
              <span>{formatDuration(effectiveDuration)}</span>
            </div>
          </div>
        )}

        {/* Compact meta strip */}
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-100 px-2.5 py-1 text-[11px] font-semibold text-text-600">
            <Film className="size-3.5" />
            <span className="truncate max-w-[14rem]">{video.title || 'Untitled'}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              playable
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
            }`}
          >
            <span className={`size-1.5 rounded-full ${playable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {playable ? 'Ready' : 'Processing'}
          </span>
          {openCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {openCount} open
            </span>
          )}
        </div>
      </Motion.section>

      {/* ── Composer (owner / freelancer view) ── */}
      {!readOnly && !hideComposer && onAddComment && (
        <Motion.form
          variants={fadeUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.05 }}
          onSubmit={handleSubmit}
          className="card space-y-3 p-4 sm:p-5"
        >
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="size-4 text-brand" />
            <h3 className="text-sm font-bold text-text-900">
              Add comment at{' '}
              <span className="font-mono text-brand">
                {formatDuration(videoRef.current?.currentTime ?? timestamp)}
              </span>
            </h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
            <input
              className="input"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name"
            />
            <input
              className="input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What should change?"
              maxLength={5000}
            />
            <Motion.button
              {...buttonPress}
              type="submit"
              disabled={isSubmitting || !body.trim()}
              className="btn-primary"
            >
              {isSubmitting ? 'Saving…' : submitLabel}
            </Motion.button>
          </div>
        </Motion.form>
      )}

      {/* ── Comments list ── */}
      <Motion.section
        variants={fadeUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
        className="card p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-surface-200 px-4 py-3 sm:px-5">
          <h3 className="text-sm font-bold text-text-900">Comments</h3>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-text-600">
            <span className="rounded-full bg-surface-100 px-2 py-0.5">{sortedComments.length} total</span>
            {openCount > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                {openCount} open
              </span>
            )}
          </div>
        </div>
        <ul className="max-h-[32rem] divide-y divide-surface-200 overflow-y-auto">
          {sortedComments.length === 0 ? (
            <li className="flex flex-col items-center gap-1 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-text-900">No feedback yet</p>
              <p className="max-w-sm text-xs font-medium text-text-600">
                Pause the video where something needs to change, then add a note.
              </p>
            </li>
          ) : (
            sortedComments.map((c) => {
              const isActive = activeCommentId === c.id
              return (
                <li
                  key={c.id}
                  className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-3 transition-colors sm:px-5 ${
                    isActive ? 'bg-brand/5' : 'hover:bg-surface-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => seekAndHighlight(c.id, c.timestampSeconds)}
                    className={`inline-flex h-fit items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] font-bold transition ${
                      c.resolved
                        ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
                        : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300'
                    }`}
                  >
                    {formatDuration(c.timestampSeconds)}
                  </button>
                  <div className="min-w-0">
                    <p className="break-words text-sm leading-6 text-text-900">{c.body}</p>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-text-600">
                      <span className="truncate">
                        {c.createdByName || 'Reviewer'} · {formatShortDate(c.createdAt)}
                      </span>
                      {onToggleResolve ? (
                        <button
                          type="button"
                          onClick={() => onToggleResolve(c.id, !c.resolved)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition ${
                            c.resolved
                              ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-surface-100 text-text-600 hover:bg-surface-200'
                          }`}
                        >
                          <CheckCircle2 className="size-3" />
                          {c.resolved ? 'Resolved' : 'Mark resolved'}
                        </button>
                      ) : (
                        <span className="rounded-full bg-surface-100 px-2 py-0.5 font-semibold">
                          {c.resolved ? 'Resolved' : 'Open'}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </Motion.section>
    </div>
  )
}

export default VideoReviewPanel
