import { callManagement, createRequestId, getSession } from './cloud'
import { BreedingPairDoc, DashboardData, HatchingRecordDoc, MediaItem, ParrotDoc, PLACEHOLDER_IMAGE, SaleRecordDoc } from './types'

const CACHE_VERSION = 2
let session: { openId: string; authorized: boolean; configured: boolean } | null = null

interface Snapshot {
  parrots: ParrotDoc[]
  pairs: BreedingPairDoc[]
  hatchingRecords: HatchingRecordDoc[]
  salesRecords: SaleRecordDoc[]
  dashboard: DashboardData
  syncedAt: string
}

const emptyDashboard = (): DashboardData => ({ stats: { total: 0, forSale: 0, sold: 0, returned: 0, breeder: 0, paired: 0, incubating: 0, revenueCents: 0, salesTotal: 0, returnRate: 0 }, species: [], trend: [] })
const cacheKey = () => session ? `parrot-pro-v${CACHE_VERSION}:${session.openId}` : ''
const dateValue = (value: any) => value instanceof Date ? value.toISOString() : value ? String(value) : ''

function mapMedia(items: any[]): MediaItem[] {
  return (items || []).map(item => ({ assetId: item.assetId, type: item.type, fileID: item.fileID, url: item.fileID, posterFileID: item.posterFileID || '', poster: item.posterFileID || '' }))
}

function mapParrot(item: any): ParrotDoc {
  const media = mapMedia(item.media)
  return {
    id: item.id,
    species: item.species,
    ringNumber: item.ringNumber,
    gender: item.gender,
    status: item.status,
    price: Number(item.priceCents || 0) / 100,
    priceCents: Number(item.priceCents || 0),
    age: item.ageLabel || '未知',
    birthDate: item.birthDate,
    image: media[0] && media[0].url || PLACEHOLDER_IMAGE,
    media,
    publicIntro: item.publicIntro || '',
    privateNotes: item.privateNotes || '',
    desc: item.privateNotes || '',
    activePairId: item.activePairId || undefined,
    pairedAt: dateValue(item.pairedAt) || undefined,
    revision: item.revision,
    createdAt: dateValue(item.createdAt),
    updatedAt: dateValue(item.updatedAt)
  }
}

function mapPair(item: any): BreedingPairDoc {
  return { ...item, pairedAt: dateValue(item.pairedAt), male: mapParrot(item.male), female: mapParrot(item.female) }
}

function mapHatching(item: any): HatchingRecordDoc {
  return { id: item.id, pairId: item.pairId, maleId: item.maleId, femaleId: item.femaleId, maleRingNumber: item.maleSnapshot.ringNumber, femaleRingNumber: item.femaleSnapshot.ringNumber, species: item.species, startDate: item.startDate, eggs: item.eggs, hatched: item.hatched, status: item.status, revision: item.revision, createdAt: dateValue(item.createdAt), updatedAt: dateValue(item.updatedAt) }
}

function mapSale(item: any): SaleRecordDoc {
  const media = mapMedia(item.parrotSnapshot && item.parrotSnapshot.media)
  return { id: item.id, parrotId: item.parrotId, species: item.parrotSnapshot.species, ringNumber: item.parrotSnapshot.ringNumber, gender: item.parrotSnapshot.gender, buyer: item.buyer, buyerContact: item.buyerContact, date: item.saleDate, price: Number(item.priceCents || 0) / 100, priceCents: Number(item.priceCents || 0), status: item.status, returnReason: item.returnReason, visitStatus: item.followUpStatus, image: media[0] && media[0].url || PLACEHOLDER_IMAGE, revision: item.revision, createdAt: dateValue(item.createdAt) }
}

async function allPages(action: string) {
  const values: any[] = []; let cursor = ''
  do {
    const page = await callManagement(action, { cursor, pageSize: 100 })
    values.push(...(page.items || [])); cursor = page.nextCursor || ''
  } while (cursor)
  return values
}

async function ensureSession() {
  if (!session) session = await getSession()
  if (!session.authorized) throw new Error(session.configured ? '当前微信账号无管理权限' : '主账号尚未配置')
  return session
}

function applyPairViews(parrots: ParrotDoc[], pairs: BreedingPairDoc[]) {
  const map = new Map(parrots.map(item => [item.id, item]))
  for (const pair of pairs) {
    const male = map.get(pair.maleId); const female = map.get(pair.femaleId)
    if (!male || !female) continue
    const pairedAt = new Date(pair.pairedAt).getTime()
    const pairDays = Number.isFinite(pairedAt) ? Math.max(0, Math.floor((Date.now() - pairedAt) / 86400000)) : 0
    Object.assign(male, { mate: `${female.species} (${female.ringNumber})`, mateId: female.id, activePairId: pair.id, pairedAt: pair.pairedAt, pairDays })
    Object.assign(female, { mate: `${male.species} (${male.ringNumber})`, mateId: male.id, activePairId: pair.id, pairedAt: pair.pairedAt, pairDays })
  }
}

export const repository = {
  async session() { session = await getSession(); return session },
  currentSession() { return session },
  loadCache(): Snapshot | null {
    if (!session || !session.authorized) return null
    const cached = wx.getStorageSync(cacheKey())
    return cached && cached.version === CACHE_VERSION && cached.ownerOpenId === session.openId ? cached.snapshot : null
  },
  async bootstrap(): Promise<Snapshot> {
    await ensureSession()
    const [parrotValues, pairValues, hatchingValues, saleValues, dashboard] = await Promise.all([
      allPages('parrots.list'), callManagement('breeding.listActive'), allPages('hatching.list'), allPages('sales.list'), callManagement('dashboard.get')
    ])
    const parrots = parrotValues.map(mapParrot); const pairs = pairValues.map(mapPair)
    applyPairViews(parrots, pairs)
    const snapshot = { parrots, pairs, hatchingRecords: hatchingValues.map(mapHatching), salesRecords: saleValues.map(mapSale), dashboard: dashboard || emptyDashboard(), syncedAt: new Date().toISOString() }
    wx.setStorageSync(cacheKey(), { version: CACHE_VERSION, ownerOpenId: session!.openId, snapshot })
    return snapshot
  },
  createParrot(input: any) { return callManagement('parrots.create', { species: input.species, ringNumber: input.ringNumber, gender: input.gender, birthDate: input.birthDate, priceCents: Math.round(Number(input.price || 0) * 100), publicIntro: input.publicIntro || '', privateNotes: input.privateNotes || input.desc || '', media: toApiMedia(input.media) }, createRequestId('parrot-create')) },
  updateParrot(id: string, currentRevision: number, updates: any) { return callManagement('parrots.update', { id, revision: currentRevision, updates: cleanParrotUpdates(updates) }, createRequestId('parrot-update')) },
  deleteParrot(id: string, currentRevision: number) { return callManagement('parrots.delete', { id, revision: currentRevision }, createRequestId('parrot-delete')) },
  setBreeder(id: string, currentRevision: number) { return callManagement('parrots.setBreeder', { id, revision: currentRevision }, createRequestId('breeder-set')) },
  unsetBreeder(id: string, currentRevision: number) { return callManagement('parrots.unsetBreeder', { id, revision: currentRevision }, createRequestId('breeder-unset')) },
  pairParrots(male: ParrotDoc, female: ParrotDoc) { return callManagement('breeding.pair', { maleId: male.id, femaleId: female.id, maleRevision: male.revision, femaleRevision: female.revision }, createRequestId('pair-create')) },
  cancelPair(pair: BreedingPairDoc) { return callManagement('breeding.cancel', { pairId: pair.id, revision: pair.revision }, createRequestId('pair-cancel')) },
  createHatching(input: any, male: ParrotDoc, female: ParrotDoc, pair?: BreedingPairDoc) { return callManagement('hatching.create', { maleId: male.id, femaleId: female.id, maleRevision: male.revision, femaleRevision: female.revision, pairRevision: pair && pair.revision, species: input.species, startDate: input.startDate, eggs: input.eggs }, createRequestId('hatching-create')) },
  updateHatching(record: HatchingRecordDoc, hatched: number) { return callManagement('hatching.updateProgress', { id: record.id, revision: record.revision, hatched }, createRequestId('hatching-progress')) },
  completeHatching(record: HatchingRecordDoc) { return callManagement('hatching.complete', { id: record.id, revision: record.revision }, createRequestId('hatching-complete')) },
  deleteHatching(record: HatchingRecordDoc) { return callManagement('hatching.delete', { id: record.id, revision: record.revision }, createRequestId('hatching-delete')) },
  createSale(input: any, parrot: ParrotDoc) { return callManagement('sales.create', { parrotId: parrot.id, parrotRevision: parrot.revision, buyer: input.buyer, buyerContact: input.buyerContact || '', saleDate: input.date, priceCents: Math.round(Number(input.price || 0) * 100) }, createRequestId('sale-create')) },
  returnSale(record: SaleRecordDoc, reason: string) { return callManagement('sales.return', { id: record.id, revision: record.revision, reason }, createRequestId('sale-return')) },
  updateFollowUp(record: SaleRecordDoc, status: SaleRecordDoc['visitStatus']) { return callManagement('sales.updateFollowUp', { id: record.id, revision: record.revision, status }, createRequestId('sale-followup')) },
  createShareToken(parrotId: string) { return callManagement('shares.create', { parrotId }, createRequestId('share-create')) },
  revokeShareToken(token: string) { return callManagement('shares.revoke', { token }, createRequestId('share-revoke')) }
}

function toApiMedia(media: MediaItem[] = []) { return media.filter(item => item.assetId && (item.fileID || item.url)).map(item => ({ assetId: item.assetId, type: item.type, fileID: item.fileID || item.url, posterFileID: item.posterFileID || item.poster || '' })) }
function cleanParrotUpdates(updates: any) {
  const allowed: any = {}
  for (const key of ['species', 'ringNumber', 'gender', 'birthDate', 'publicIntro', 'privateNotes']) if (Object.prototype.hasOwnProperty.call(updates, key)) allowed[key] = updates[key]
  if (Object.prototype.hasOwnProperty.call(updates, 'price')) allowed.priceCents = Math.round(Number(updates.price || 0) * 100)
  if (Object.prototype.hasOwnProperty.call(updates, 'media')) allowed.media = toApiMedia(updates.media)
  if (Object.prototype.hasOwnProperty.call(updates, 'desc') && !Object.prototype.hasOwnProperty.call(updates, 'privateNotes')) allowed.privateNotes = updates.desc || ''
  return allowed
}

export type ParrotRepository = typeof repository
