import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import { AlertCircle, ExternalLink, UploadCloud } from 'lucide-react'
import { dashboardApi, getApiErrorMessage, storageApi, uploadPartToR2 } from '../lib/api'
import { toast } from 'sonner'
import { buttonPress, fadeUp } from '../components/ui/motion'
import type { InitMultipartUploadRequest } from '../types'

const UploadPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['dashboard-workspace'], queryFn: dashboardApi.workspace })
  
  const [portalId, setPortalId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(0)
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'completing'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const numericPortalId = Number(portalId)
      if (!numericPortalId) throw new Error('Select a portal before uploading')
      if (!file) throw new Error('Choose a video file')

      setUploadError(null)
      setProgress(0)

      // Step 1: Initialize multipart upload
      setUploadState('uploading')
      const initPayload: InitMultipartUploadRequest = {
        portalId: numericPortalId,
        fileName: file.name,
        fileSizeBytes: file.size,
        contentType: file.type || 'video/mp4',
      }
      const session = await storageApi.initMultipart(initPayload)

      // Step 2: Upload file in chunks
      const chunkSize = 5 * 1024 * 1024 // 5 MB chunks
      const chunks = Math.ceil(file.size / chunkSize)
      const etags: string[] = []

      for (let i = 0; i < chunks; i++) {
        try {
          const start = i * chunkSize
          const end = Math.min(start + chunkSize, file.size)
          const chunk = file.slice(start, end)

          // Get presigned URL for this part
          const partUrlData = await storageApi.getPartPresignedUrl(session.uploadId, {
            r2Path: session.r2Path,
            partNumber: i + 1,
          })

          // Upload chunk directly to R2
          const etag = await uploadPartToR2(partUrlData.uploadUrl, chunk, (chunkProgress) => {
            const overallProgress = Math.round(((i + chunkProgress / 100) / chunks) * 100)
            setProgress(Math.min(99, overallProgress))
          })

          etags.push(etag)
        } catch (error) {
          // Abort on first failure
          await storageApi.abortMultipart(session.uploadId, session.r2Path).catch(() => {})
          throw new Error(`Failed to upload chunk ${i + 1}/${chunks}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // Step 3: Complete multipart upload
      setUploadState('completing')
      setProgress(95)
      await storageApi.completeMultipart(session.uploadId, {
        videoId: session.videoId,
        r2Path: session.r2Path,
        fileSizeBytes: file.size,
        etags,
      })

      setProgress(100)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['dashboard-workspace'] })
      setFile(null)
      setTitle('')
      setProgress(0)
      setUploadState('idle')
      toast.success('Video uploaded successfully')
    },
    onError: (error) => {
      setUploadError(getApiErrorMessage(error, 'Upload failed'))
      setUploadState('idle')
    },
  })

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Motion.header variants={fadeUp} initial="initial" animate="animate">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Direct R2 upload</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-text-900 md:text-5xl">Upload a video to a portal</h1>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-text-600">
          Files are uploaded directly to Cloudflare R2 in chunks, supporting videos up to 10 GB+.
          Your browser uploads directly to R2 — Spring Boot only manages authentication and metadata.
        </p>
      </Motion.header>

      <Motion.form 
        variants={fadeUp} 
        initial="initial" 
        animate="animate" 
        onSubmit={event => { 
          event.preventDefault()
          uploadMutation.mutate() 
        }} 
        className="card space-y-5"
      >
        <div>
          <label htmlFor="portalId" className="label">Target client portal</label>
          <select 
            id="portalId" 
            value={portalId} 
            onChange={event => setPortalId(event.target.value)} 
            className="input" 
            required
            disabled={uploadMutation.isLoading}
          >
            <option value="">Select portal</option>
            {(data?.portals ?? []).map(portal => (
              <option key={portal.id} value={portal.id}>
                {portal.clientName || 'Client'} · {portal.projectName}
              </option>
            ))}
          </select>
          {(data?.portals ?? []).length === 0 && (
            <p className="mt-2 text-sm font-medium text-text-600">
              No portals yet. <Link to="/portals/new" className="font-bold text-brand">Create one first</Link>.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="title" className="label">Video title (optional)</label>
          <input 
            id="title" 
            value={title} 
            onChange={event => setTitle(event.target.value)} 
            className="input" 
            placeholder="Launch cut v2"
            disabled={uploadMutation.isLoading}
          />
        </div>

        <div>
          <label htmlFor="file" className="label">Video file</label>
          <input 
            id="file" 
            type="file" 
            accept="video/*" 
            onChange={event => setFile(event.target.files?.[0] ?? null)} 
            className="input" 
            required
            disabled={uploadMutation.isLoading}
          />
          {file && (
            <p className="mt-2 text-xs font-medium text-text-600">
              {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}
        </div>

        {uploadMutation.isLoading && (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-text-600">
              <span>{uploadState === 'completing' ? 'Finalizing' : 'Uploading'}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-100">
              <div className="h-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {uploadError && (
          <div className="alert-error flex gap-2">
            <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Upload failed</p>
              <p className="text-sm">{uploadError}</p>
            </div>
          </div>
        )}

        {uploadMutation.isSuccess && (
          <div className="alert-success">
            Upload complete! The video is now visible in the chosen portal.
          </div>
        )}

        <Motion.button 
          {...buttonPress} 
          type="submit" 
          disabled={uploadMutation.isLoading || !file || !portalId} 
          className="btn-primary"
        >
          <UploadCloud className="size-4" />
          {uploadMutation.isLoading ? `${uploadState === 'completing' ? 'Finalizing' : 'Uploading'} ${progress}%` : 'Upload video'}
        </Motion.button>
      </Motion.form>

      {portalId && (
        <Link to={`/portals/${portalId}`} className="btn-secondary w-fit">
          <ExternalLink className="size-4" />Open selected portal
        </Link>
      )}
    </div>
  )
}

export default UploadPage
