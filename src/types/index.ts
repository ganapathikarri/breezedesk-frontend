// BreezeDesk frontend types aligned to the Spring Boot backend DTOs.

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
}

export type UserRole = 'ADMIN' | 'FREELANCER' | 'CLIENT'
export type PortalStatus = 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'ARCHIVED'
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE'
export type SubscriptionTierName = 'FREE' | 'FREELANCER' | 'PRO' | string
export type PaymentMethod = 'card' | 'upi'

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  displayName: string
  role?: 'FREELANCER' | 'CLIENT'
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface AuthResponseDTO {
  userId: number
  email: string
  displayName: string
  role: UserRole
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface UserProfileDTO {
  id: number
  email: string
  displayName: string
  role: UserRole
  profileAvatar?: string | null
}

export type User = UserProfileDTO

// ── Dashboard / portals ───────────────────────────────────────────────────────

export interface DashboardWorkspaceDTO {
  totalPortals: number
  activePortals: number
  approvedPortals: number
  totalUnresolvedComments: number
  portals: PortalSummaryDTO[]
  recentActivity: ActivityItemDTO[]
}

export interface PortalSummaryDTO {
  id: number
  token: string
  projectName: string
  clientName?: string | null
  status: PortalStatus | string
  unresolvedCount: number
  dueDate?: string | null
  coverThumbnail?: string | null
  latestVideoTitle?: string | null
  updatedAt?: string | null
}

export interface ActivityItemDTO {
  portalId: number
  projectName: string
  action: string
  actorName: string
  timestamp: string
}

export interface CreatePortalRequest {
  projectName: string
  clientName?: string
  expiryDays?: number
  projectAmount?: number
  currency?: string
  paymentDueDate?: string
}

export interface PortalResponseDTO {
  id: number
  magicToken: string
  magicLink?: string | null
  projectName: string
  clientName?: string | null
  status: PortalStatus | string
  coverThumbnail?: string | null
  expiresAt?: string | null
  accessCount?: number | null
  lastAccessedAt?: string | null
  isArchived?: boolean | null
  createdAt?: string | null
  updatedAt?: string | null
  projectAmount?: number | null
  amountPaid?: number | null
  paymentDueDate?: string | null
  paymentStatus?: PaymentStatus | string | null
  currency?: string | null
  video?: VideoResponseDTO | null
  comments?: TimelineMarkerDTO[]
  unresolvedCount?: number
}

export interface UpdatePaymentRequest {
  projectAmount?: number
  amountPaid?: number
  paymentDueDate?: string
  paymentStatus?: PaymentStatus
  currency?: string
}

// ── Client portal ─────────────────────────────────────────────────────────────

export interface ClientPortalResponseDTO {
  projectName: string
  clientName?: string | null
  status: PortalStatus | string
  magicToken: string
  video?: ClientVideoDTO | null
  comments: ClientMarkerDTO[]
  unresolvedCount: number
}

export interface ClientVideoDTO {
  id: number
  title: string
  src?: string | null
  embedUrl?: string | null
  videoProvider?: string | null
  durationSeconds?: number | null
  uploadStatus?: string | null
}

export interface ClientMarkerDTO {
  id: number
  body: string
  timestampSeconds: number
  resolved: boolean
  createdByName?: string | null
  markerColor?: string | null
  markerType?: string | null
  priorityLevel?: number | null
  createdAt?: string | null
}

// ── Video and comments ────────────────────────────────────────────────────────

export interface VideoResponseDTO {
  id: number
  title: string
  src?: string | null
  embedUrl?: string | null
  videoProvider?: string | null
  originalFileName?: string | null
  mimeType?: string | null
  fileSizeBytes?: number | null
  durationSeconds?: number | null
  thumbnailUrl?: string | null
  versionNumber?: number | null
  uploadStatus?: string | null
  processingStatus?: string | null
  createdAt?: string | null
}

export interface AddVideoLinkRequest {
  portalId: number
  title: string
  videoProvider: 'GDRIVE' | 'VIMEO' | 'YOUTUBE' | 'BUNNY' | 'CLOUDINARY' | 'URL'
  videoUrl: string
  embedUrl?: string
  durationSeconds?: number
}

export interface AddMarkerRequest {
  portalToken?: string
  videoId?: number
  body: string
  timestampSeconds: number
  authorType?: 'CLIENT' | 'EDITOR'
  createdByName?: string
  markerType?: 'COMMENT' | 'ISSUE' | 'APPROVAL' | 'REVISION' | 'NOTE' | string
  markerColor?: 'AMBER' | 'EMERALD' | 'CYAN' | 'RED' | 'PURPLE' | string
  priorityLevel?: number
  parentCommentId?: number
}

export interface TimelineMarkerDTO {
  id: number
  body: string
  timestampSeconds: number
  resolved: boolean
  resolvedAt?: string | null
  authorType?: string | null
  createdByName?: string | null
  markerType?: string | null
  markerColor?: string | null
  priorityLevel?: number | null
  parentCommentId?: number | null
  isEdited?: boolean | null
  editedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface TimelineMetadataDTO {
  videoId: number
  durationSeconds?: number | null
  totalMarkers: number
  unresolvedMarkers: number
  resolvedMarkers: number
  markerDensity: number
  clusters: Array<{ anchor: number; count: number; hasUnresolved: boolean; markerIds: number[] }>
  markers: TimelineMarkerDTO[]
}

// ── Approvals ────────────────────────────────────────────────────────────────

export interface ApprovalResponseDTO {
  id: number
  portalId: number
  videoId?: number | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | string
  approvedByName?: string | null
  approvedAt?: string | null
  rejectionReason?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CreateApprovalRequest {
  portalId: number
  videoId?: number
}

export interface ApprovalDecisionRequest { approvedByName: string }
export interface RejectApprovalRequest { approvedByName: string; rejectionReason: string }
export interface RequestChangesApprovalRequest { requestedByName: string; feedbackMessage: string }

// ── Subscription / storage ────────────────────────────────────────────────────

export interface PlanFeatures {
  maxProjects?: number
  timestampComments: boolean
  clientApprovals: boolean
  brandingRemoval: boolean
  screenRecordingBlock: boolean
  prioritySupport: boolean
}

export interface SubscriptionPlan {
  id: number
  name: SubscriptionTierName
  monthlyPrice: number
  storageGb: number
  features: PlanFeatures
}

export interface CurrentSubscription {
  currentTier: SubscriptionTierName
  monthlyPrice: number
  storageGb: number
  storageUsedBytes: number
  storageMaxBytes?: number
  storagePercentage: number
  renewalDate?: string | null
  autoRenewal?: boolean | null
  subscriptionStart?: string | null
  subscriptionEnd?: string | null
  features: PlanFeatures
}

export interface InitiatePaymentRequest {
  planId: number
  paymentMethod: PaymentMethod
}

export interface RazorpayOrderResponse {
  success: boolean
  razorpayOrderId: string
  amount: number
  currency: string
  planName: string
  planPrice: number
  razorpayKey: string
  email: string
  displayName: string
  paymentMethod: PaymentMethod
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
  paymentMethod?: PaymentMethod
}

export interface VerifyPaymentResponse {
  success: boolean
  message: string
  newTier: SubscriptionTierName
  renewalDate: string
  storageGb: number
}

export interface StorageInfo {
  currentStorageUsedBytes: number
  maxStorageAllowedBytes: number
  remainingStorageBytes: number
  percentageUsed: number
  subscriptionTier: SubscriptionTierName
}

export interface PresignUploadRequest {
  fileName: string
  fileSizeBytes: number
  contentType: string
}

export interface PresignUploadResponse {
  uploadUrl: string
  r2Path: string
  expiresInSeconds: number
  currentStorageUsedBytes: number
  maxStorageAllowedBytes: number
}

export interface ConfirmUploadRequest {
  videoId: number
  r2Path: string
  fileSizeBytes: number
}

// ── Razorpay global ───────────────────────────────────────────────────────────

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  image?: string
  prefill?: { email?: string; name?: string; contact?: string }
  method?: Partial<Record<PaymentMethod, boolean>>
  handler: (response: RazorpayPaymentResponse) => void
  modal?: { ondismiss?: () => void }
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export interface RazorpayInstance {
  open: () => void
  close: () => void
}

// ── Multipart Upload (R2) ──────────────────────────────────────────────────────

export interface InitMultipartUploadRequest {
  portalId: number
  fileName: string
  fileSizeBytes: number
  contentType: string
}

export interface InitMultipartUploadResponse {
  uploadId: string
  videoId: number
  r2Path: string
  bucket: string
  currentStorageUsedBytes: number
  maxStorageAllowedBytes: number
  fileSizeBytes: number
}

export interface GetPartPresignedUrlRequest {
  r2Path: string
  partNumber: number
}

export interface GetPartPresignedUrlResponse {
  uploadUrl: string
  partNumber: number
}

export interface CompleteMultipartUploadRequest {
  videoId: number
  r2Path: string
  fileSizeBytes: number
  etags: string[]
}

export interface AbortMultipartUploadRequest {
  r2Path: string
}

export interface GetUploadStatusResponse {
  uploadId: string
  r2Path: string
  uploadedParts: number
  storageClass: string
}
