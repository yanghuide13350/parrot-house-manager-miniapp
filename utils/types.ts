export enum ParrotStatusCode {
  FOR_SALE = 'FOR_SALE', SOLD = 'SOLD', RETURNED = 'RETURNED', BREEDER = 'BREEDER', PAIRED = 'PAIRED', INCUBATING = 'INCUBATING'
}

export enum GenderCode { MALE = 'MALE', FEMALE = 'FEMALE', UNKNOWN = 'UNKNOWN' }

export interface MediaItem {
  assetId?: string
  type: 'image' | 'video'
  url: string
  fileID?: string
  poster?: string
  posterFileID?: string
  name?: string
}

export interface ParrotDoc {
  id: string
  species: string
  ringNumber: string
  gender: GenderCode
  status: ParrotStatusCode
  price: number
  priceCents: number
  age: string
  birthDate: string
  image: string
  media: MediaItem[]
  publicIntro: string
  privateNotes: string
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
  maleId: string
  femaleId: string
  species: string
  startDate: string
  eggs: number
  hatched: number
  status: 'INCUBATING' | 'COMPLETED' | 'CANCELLED'
  revision: number
  createdAt?: string
  updatedAt?: string
}

export interface SaleRecordDoc {
  id: string
  parrotId: string
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

export const STATUS_LABEL: Record<ParrotStatusCode, string> = {
  FOR_SALE: '待售', SOLD: '已售', RETURNED: '退货', BREEDER: '种鸟', PAIRED: '已配对', INCUBATING: '孵化中'
}
export const GENDER_LABEL: Record<GenderCode, string> = { MALE: '公', FEMALE: '母', UNKNOWN: '未验卡' }
export const STATUS_CLASS: Record<ParrotStatusCode, string> = {
  FOR_SALE: 'status-green', SOLD: 'status-gray', RETURNED: 'status-purple', BREEDER: 'status-blue', PAIRED: 'status-rose', INCUBATING: 'status-amber'
}

export const PLACEHOLDER_IMAGE = '/assets/parrots/blue-macaw.svg'
