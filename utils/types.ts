export enum ParrotStatusCode {
  FOR_SALE = 'FOR_SALE', SOLD = 'SOLD', RETURNED = 'RETURNED', BREEDER = 'BREEDER', PAIRED = 'PAIRED', INCUBATING = 'INCUBATING'
}

export enum GenderCode { MALE = 'MALE', FEMALE = 'FEMALE', UNKNOWN = 'UNKNOWN' }

export interface MediaItem {
  assetId?: string
  type: 'image'
  url: string
  fileID?: string
  thumbnailUrl?: string
  thumbnailFileID?: string
  poster?: string
  posterFileID?: string
  name?: string
}

export interface ParrotDoc {
  id: string
  breed: string
  species: string
  ringNumber: string
  gender: GenderCode
  status: ParrotStatusCode
  recordSource?: 'PROFILE' | 'INTRODUCTION'
  purchaseDate?: string
  introductionStage?: 'GROWING' | 'FOR_SALE' | ''
  price: number
  priceCents: number
  age: string
  birthDate: string
  image: string
  media: MediaItem[]
  coverType?: 'image' | 'placeholder'
  publicIntro: string
  privateNotes: string
  feedingPlanId?: string
  father?: ParentInfo | null
  mother?: ParentInfo | null
  birthHatchingRecordId?: string
  desc?: string
  mate?: string
  mateId?: string
  activePairId?: string
  pairedAt?: string
  pairDays?: number
  revision: number
  createdAt?: string
  updatedAt?: string
}

export interface FeedingPlanDoc {
  id: string
  name: string
  species: string
  stage: string
  ageFromMonths: number
  ageFromDays: number
  ageToMonths: number
  ageToDays: number
  isEnabled: boolean
  feedingType: 'FORMULA' | 'MIXED' | 'SOLID'
  formulaName: string
  waterMl: number
  powderScoops: string
  temperatureMin: number
  temperatureMax: number
  feedingsPerDay: number
  amountMl: string
  feedingMethod: string
  temperatureCheck: string
  preparationNotes: string
  seedFoodName: string
  seedFoodAmount: string
  seedFoodNotes: string
  feedingNotes: string
  fullnessNotes: string
  warningNotes: string
  revision: number
  updatedAt?: string
}

export interface ParentInfo {
  source: 'LIBRARY' | 'MANUAL'
  id?: string | null
  species: string
  ringNumber: string
}

export interface OffspringGroup { species: string; count: number }
export interface ClutchOffspring { id: string; ringNumber: string }

export interface BreedingPairDoc {
  id: string
  maleId: string
  femaleId: string
  status: 'ACTIVE' | 'INCUBATING' | 'CLOSED'
  pairedAt: string
  revision: number
  male: ParrotDoc
  female: ParrotDoc
}

export interface HatchingRecordDoc {
  id: string
  pairId: string
  maleRingNumber: string
  femaleRingNumber: string
  maleSpecies?: string
  femaleSpecies?: string
  pairingDate?: string
  maleId: string
  femaleId: string
  species: string
  startDate: string
  eggs: number
  hatched: number
  offspringGroups?: OffspringGroup[]
  offspring?: ClutchOffspring[]
  offspringRegistered?: number
  status: 'INCUBATING' | 'COMPLETED' | 'CANCELLED'
  revision: number
  completedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface SaleRecordDoc {
  id: string
  parrotId: string
  breed: string
  species: string
  ringNumber: string
  gender: GenderCode
  buyer: string
  buyerContact?: string
  date: string
  price: number
  priceCents: number
  status: 'COMPLETED' | 'RETURNED'
  returnReason?: string
  visitStatus: 'WAITING' | 'VISITED' | 'UNREACHABLE'
  image: string
  revision: number
  createdAt?: string
}

export interface DashboardData {
  stats: { total: number; forSale: number; sold: number; returned: number; breeder: number; paired: number; incubating: number; revenueCents: number; salesTotal: number; returnRate: number }
  species: Array<{ name: string; count: number; percent: number }>
  trend: Array<{ month: string; revenueCents: number; volume: number }>
}

export type AccessRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'NONE'
export type AccessStatus = 'none' | 'pending' | 'rejected' | 'active'

export interface SessionDoc {
  openId: string
  configured: boolean
  authorized: boolean
  role: AccessRole
  accessStatus: AccessStatus
  canManageAccess: boolean
  requestNote?: string
  reviewNote?: string
  token?: string
}

export interface AccessRequestDoc {
  id: string
  openId: string
  note: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requestedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNote?: string
}

export interface AccessPolicyDoc {
  openAccess: boolean
  updatedAt?: string
  updatedBy?: string
}

export interface AccessGrantDoc {
  id: string
  openId: string
  role: 'ADMIN' | 'MEMBER'
  note: string
  status: 'ACTIVE' | 'DISABLED'
  createdBy: string
  createdAt: string
  updatedAt: string
  requestedAt?: string
  requestNote?: string
  source?: 'database' | 'env'
}

export interface AccessListDoc {
  policy: AccessPolicyDoc
  pending: AccessRequestDoc[]
  grants: AccessGrantDoc[]
}

export const STATUS_LABEL: Record<ParrotStatusCode, string> = {
  FOR_SALE: '待售', SOLD: '已售', RETURNED: '退货', BREEDER: '种鸟', PAIRED: '已配对', INCUBATING: '孵化中'
}
export const GENDER_LABEL: Record<GenderCode, string> = { MALE: '公', FEMALE: '母', UNKNOWN: '未验卡' }
export const STATUS_CLASS: Record<ParrotStatusCode, string> = {
  FOR_SALE: 'status-green', SOLD: 'status-gray', RETURNED: 'status-purple', BREEDER: 'status-blue', PAIRED: 'status-rose', INCUBATING: 'status-amber'
}

export const PLACEHOLDER_IMAGE = '/assets/parrots/default-placeholder.jpg'
