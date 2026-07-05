import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import type {
  AddMarkerRequest,
  AddVideoLinkRequest,
  ApiResponse,
  ApprovalDecisionRequest,
  ApprovalResponseDTO,
  AuthResponseDTO,
  ClientPortalResponseDTO,
  CompleteMultipartUploadRequest,
  ConfirmUploadRequest,
  CreateApprovalRequest,
  CreatePortalRequest,
  CurrentSubscription,
  DashboardWorkspaceDTO,
  GetPartPresignedUrlRequest,
  GetPartPresignedUrlResponse,
  GetUploadStatusResponse,
  InitiatePaymentRequest,
  InitMultipartUploadRequest,
  InitMultipartUploadResponse,
  LoginRequest,
  PortalResponseDTO,
  PresignUploadRequest,
  PresignUploadResponse,
  RegisterRequest,
  RejectApprovalRequest,
  RequestChangesApprovalRequest,
  RazorpayOrderResponse,
  StorageInfo,
  SubscriptionPlan,
  TimelineMarkerDTO,
  TimelineMetadataDTO,
  UpdatePaymentRequest,
  UserProfileDTO,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  VideoResponseDTO,
} from '../types'

export const ACCESS_TOKEN_KEY = 'bd_access_token'
export const REFRESH_TOKEN_KEY = 'bd_refresh_token'
export const AUTH_USER_KEY = 'bd_auth_user'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  // Note: Don't set global Content-Type header - let axios/browser set it per request
  // This ensures FormData and multipart uploads work correctly with proper boundaries
})

const isApiResponse = <T>(value: unknown): value is ApiResponse<T> =>
  typeof value === 'object' && value !== null && 'success' in value && 'data' in value

export const unwrap = <T>(response: ApiResponse<T> | T): T => {
  if (isApiResponse<T>(response)) {
    if (!response.success) throw new Error(response.message || 'Request failed')
    return response.data
  }
  return response
}


const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  window.dispatchEvent(new Event('breezedesk:auth-expired'))
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise: Promise<AuthResponseDTO> | null = null

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean }
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const isRefreshCall = original?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && refreshToken && !original._retry && !isRefreshCall) {
      original._retry = true
      try {
        refreshPromise ??= api
          .post<ApiResponse<AuthResponseDTO>>('/auth/refresh', { refreshToken })
          .then(res => unwrap(res.data))
          .finally(() => {
            refreshPromise = null
          })
        const next = await refreshPromise
        localStorage.setItem(ACCESS_TOKEN_KEY, next.accessToken)
        localStorage.setItem(REFRESH_TOKEN_KEY, next.refreshToken)
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${next.accessToken}` }
        return api(original)
      } catch (refreshError) {
        clearSession()
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 401 && !isRefreshCall) clearSession()
    return Promise.reject(error)
  },
)

const get = async <T>(url: string, config?: AxiosRequestConfig) => unwrap((await api.get<ApiResponse<T>>(url, config)).data)
const post = async <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) => unwrap((await api.post<ApiResponse<T>>(url, body, config)).data)
const patch = async <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) => unwrap((await api.patch<ApiResponse<T>>(url, body, config)).data)
const del = async <T>(url: string, config?: AxiosRequestConfig) => unwrap((await api.delete<ApiResponse<T>>(url, config)).data)

const toErrorText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const text = value.trim()
    return text || null
  }

  if (Array.isArray(value)) {
    const messages = value
      .map(toErrorText)
      .filter((message): message is string => Boolean(message))

    return messages.length > 0 ? messages.join(', ') : null
  }

  if (value && typeof value === 'object') {
    const messages = Object.values(value)
      .map(toErrorText)
      .filter((message): message is string => Boolean(message))

    return messages.length > 0 ? messages.join(', ') : null
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return null
}

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Something went wrong',
): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined

    return (
      toErrorText(data?.message) ||
      toErrorText(data?.errors) ||
      toErrorText(data?.error) ||
      error.message ||
      fallback
    )
  }

  return error instanceof Error ? error.message : fallback
}

export const authApi = {
  login: (payload: LoginRequest) => post<AuthResponseDTO, LoginRequest>('/auth/login', payload),
  register: (payload: RegisterRequest) => post<AuthResponseDTO, RegisterRequest>('/auth/register', payload),
  me: () => get<UserProfileDTO>('/auth/me'),
  refresh: (refreshToken: string) => post<AuthResponseDTO, { refreshToken: string }>('/auth/refresh', { refreshToken }),
  logout: (refreshToken?: string) => post<void, { refreshToken?: string }>('/auth/logout', refreshToken ? { refreshToken } : {}),
}

export const dashboardApi = {
  workspace: () => get<DashboardWorkspaceDTO>('/dashboard/workspace'),
}

export const portalApi = {
  create: (payload: CreatePortalRequest) => post<PortalResponseDTO, CreatePortalRequest>('/portals/create', payload),
  getById: (portalId: number) => get<PortalResponseDTO>(`/portals/id/${portalId}`),
  getByTokenForOwner: (token: string) => get<PortalResponseDTO>(`/portals/${token}`),
  listByOwner: (ownerId: number) => get<PortalResponseDTO[]>(`/portals/owner/${ownerId}`),
  updateStatus: (portalId: number, status: string) => patch<PortalResponseDTO, { status: string }>(`/portals/${portalId}/status`, { status }),
  archive: (portalId: number) => patch<void>(`/portals/${portalId}/archive`),
  // TODO(backend): DELETE /portals/{id} must cascade in a single transaction:
  //   1. portal row
  //   2. video rows for the portal
  //   3. all timeline markers / comments belonging to those videos
  //   4. all approvals belonging to the portal
  //   5. storage metadata rows (multipart sessions, quotas)
  //   6. the underlying Cloudflare R2 object(s) using stored r2Path / objectKey
  // Frontend must NEVER reach R2 directly — server-side signed delete only.
  delete: (portalId: number) => del<void>(`/portals/${portalId}`),
  updatePayment: (portalId: number, payload: UpdatePaymentRequest) => patch<PortalResponseDTO, UpdatePaymentRequest>(`/portals/${portalId}/payment`, payload),
}

export const clientPortalApi = {
  get: (magicToken: string) => get<ClientPortalResponseDTO>(`/client/portal/${magicToken}`),
  addComment: (magicToken: string, payload: AddMarkerRequest) => post<TimelineMarkerDTO, AddMarkerRequest>(`/client/portal/${magicToken}/comments`, payload),
  approve: (magicToken: string) => patch<void>(`/client/portal/${magicToken}/approve`),
  requestChanges: (magicToken: string) => patch<void>(`/client/portal/${magicToken}/request-changes`),
}

export const videoApi = {
  upload: (payload: { file: File; portalId: number; title?: string; durationSeconds?: number }, onUploadProgress?: (progress: number) => void) => {
    const formData = new FormData()
    formData.append('file', payload.file)
    formData.append('portalId', String(payload.portalId))
    if (payload.title) formData.append('title', payload.title)
    if (payload.durationSeconds != null) formData.append('durationSeconds', String(payload.durationSeconds))
    return post<VideoResponseDTO, FormData>('/videos/upload', formData, {
      // Let the browser set the multipart boundary for Spring's @RequestParam parser.
      onUploadProgress: event => {
        if (!event.total) return
        onUploadProgress?.(Math.round((event.loaded / event.total) * 100))
      },
    })
  },
  addLink: (payload: AddVideoLinkRequest) => post<VideoResponseDTO, AddVideoLinkRequest>('/videos/link', payload),
  get: (videoId: number) => get<VideoResponseDTO>(`/videos/${videoId}`),
  markReady: (videoId: number, durationSeconds?: number) => patch<VideoResponseDTO, { durationSeconds?: number }>(`/videos/${videoId}/mark-ready`, { durationSeconds }),
}

export const commentApi = {
  add: (payload: AddMarkerRequest) => post<TimelineMarkerDTO, AddMarkerRequest>('/comments', payload),
  markers: (videoId: number) => get<TimelineMarkerDTO[]>(`/videos/${videoId}/markers`),
  metadata: (videoId: number) => get<TimelineMetadataDTO>(`/videos/${videoId}/timeline-metadata`),
  toggleResolve: (commentId: number, resolved?: boolean) => patch<TimelineMarkerDTO, { resolved?: boolean }>(`/comments/${commentId}/toggle-resolve`, resolved === undefined ? {} : { resolved }),
}

export const approvalApi = {
  create: (payload: CreateApprovalRequest) => post<ApprovalResponseDTO, CreateApprovalRequest>('/approvals', payload),
  get: (approvalId: number) => get<ApprovalResponseDTO>(`/approvals/${approvalId}`),
  byPortal: (portalId: number) => get<ApprovalResponseDTO[]>(`/approvals/portal/${portalId}`),
  byVideo: (videoId: number) => get<ApprovalResponseDTO[]>(`/approvals/video/${videoId}`),
  approve: (approvalId: number, payload: ApprovalDecisionRequest) => patch<ApprovalResponseDTO, ApprovalDecisionRequest>(`/approvals/${approvalId}/approve`, payload),
  reject: (approvalId: number, payload: RejectApprovalRequest) => patch<ApprovalResponseDTO, RejectApprovalRequest>(`/approvals/${approvalId}/reject`, payload),
  requestChanges: (approvalId: number, payload: RequestChangesApprovalRequest) => patch<ApprovalResponseDTO, RequestChangesApprovalRequest>(`/approvals/${approvalId}/request-changes`, payload),
  delete: (approvalId: number) => del<void>(`/approvals/${approvalId}`),
}

export const subscriptionApi = {
  plans: () => get<SubscriptionPlan[]>('/subscriptions/plans'),
  current: () => get<CurrentSubscription>('/subscriptions/me'),
  initiatePayment: (payload: InitiatePaymentRequest) => post<RazorpayOrderResponse, InitiatePaymentRequest>('/subscriptions/pay/initiate', payload),
  verifyPayment: (payload: VerifyPaymentRequest) => post<VerifyPaymentResponse, VerifyPaymentRequest>('/subscriptions/pay/verify', payload),
}

export const storageApi = {
  info: () => get<StorageInfo>('/storage/info'),
  presign: (payload: PresignUploadRequest) => post<PresignUploadResponse, PresignUploadRequest>('/storage/presign', payload),
  confirm: (payload: ConfirmUploadRequest) => post<string, ConfirmUploadRequest>('/storage/confirm', payload),
  
  // Multipart upload methods
  initMultipart: (payload: InitMultipartUploadRequest) => post<InitMultipartUploadResponse, InitMultipartUploadRequest>('/storage/uploads/init', payload),
  getPartPresignedUrl: (uploadId: string, payload: GetPartPresignedUrlRequest) => post<GetPartPresignedUrlResponse, GetPartPresignedUrlRequest>(`/storage/uploads/${uploadId}/parts/sign`, payload),
  completeMultipart: (uploadId: string, payload: CompleteMultipartUploadRequest) => post<string, CompleteMultipartUploadRequest>(`/storage/uploads/${uploadId}/complete`, payload),
  abortMultipart: (uploadId: string, r2Path: string) => post<string, { r2Path: string }>(`/storage/uploads/${uploadId}/abort`, { r2Path }),
  getUploadStatus: (uploadId: string, r2Path: string) => get<GetUploadStatusResponse>(`/storage/uploads/${uploadId}/status?r2Path=${encodeURIComponent(r2Path)}`),
}

/**
 * Upload a single part directly to R2 using presigned URL.
 * Returns the ETag from the response header.
 */
export const uploadPartToR2 = async (presignedUrl: string, partData: Blob, onProgress?: (progress: number) => void): Promise<string> => {
  try {
    const response = await axios.put(presignedUrl, partData, {
      headers: { 'Content-Type': 'video/mp4' },
      onUploadProgress: event => {
        if (!event.total) return
        onProgress?.(Math.round((event.loaded / event.total) * 100))
      },
    })
    
    const etag = response.headers['etag']
    if (!etag) {
      throw new Error('No ETag returned from R2')
    }
    
    return etag
  } catch (error) {
    throw new Error(`Failed to upload part to R2: ${error instanceof Error ? error.message : String(error)}`)
  }
}
