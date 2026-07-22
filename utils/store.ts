import { repository } from './repository'
import { BreedingPairDoc, DashboardData, HatchingRecordDoc, ParrotDoc, SaleRecordDoc, SessionDoc } from './types'

type Listener = () => void
const emptyDashboard = (): DashboardData => ({ stats: { total: 0, forSale: 0, sold: 0, returned: 0, breeder: 0, paired: 0, incubating: 0, revenueCents: 0, salesTotal: 0, returnRate: 0 }, species: [], trend: [] })

class Store {
  parrots: ParrotDoc[] = []
  pairs: BreedingPairDoc[] = []
  hatchingRecords: HatchingRecordDoc[] = []
  salesRecords: SaleRecordDoc[] = []
  dashboard: DashboardData = emptyDashboard()
  session: SessionDoc | null = null
  lastError = ''
  private listeners: Listener[] = []
  private loading: Promise<void> | null = null
  private refreshQueued = false

  subscribe(listener: Listener) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter(item => item !== listener) } }
  private emit() { this.listeners.forEach(listener => listener()) }
  private apply(snapshot: any) {
    this.parrots = snapshot.parrots || []
    this.pairs = snapshot.pairs || []
    this.hatchingRecords = snapshot.hatchingRecords || []
    this.salesRecords = snapshot.salesRecords || []
    this.dashboard = snapshot.dashboard || emptyDashboard()
    this.emit()
  }
  setSession(session: SessionDoc | null) {
    this.session = session
    this.emit()
  }
  hydrate(force = false) {
    if (this.loading) {
      if (!force) return this.loading
      this.refreshQueued = true
      return this.loading.then(() => {
        if (!this.refreshQueued) return
        this.refreshQueued = false
        return this.hydrate(true)
      })
    }
    this.loading = (async () => {
      try {
        if (!repository.currentSession()) this.setSession(await repository.session())
        const cached = repository.loadCache()
        if (cached && !this.parrots.length) this.apply(cached)
        this.apply(await repository.bootstrap())
        this.setSession(repository.currentSession())
        this.lastError = ''
      } catch (error: any) {
        this.lastError = error && error.message || '数据加载失败'
      } finally { this.loading = null }
    })()
    return this.loading
  }
  getParrot(id: string) { return this.parrots.find(item => item.id === id) }
  getPair(id?: string) { return id ? this.pairs.find(item => item.id === id) : undefined }
  async createParrot(input: Omit<ParrotDoc, 'id' | 'revision' | 'priceCents'>) { const result = await repository.createParrot(input); await this.hydrate(true); return result }
  async updateParrot(id: string, updates: Partial<ParrotDoc>) { const item = this.getParrot(id); if (!item) throw new Error('找不到鹦鹉档案'); const result = await repository.updateParrot(id, item.revision, updates); await this.hydrate(true); return result }
  async deleteParrot(id: string) { const item = this.getParrot(id); if (!item) throw new Error('找不到鹦鹉档案'); await repository.deleteParrot(id, item.revision); await this.hydrate(true) }
  async setBreeder(id: string) { const item = this.getParrot(id); if (!item) throw new Error('找不到鹦鹉档案'); await repository.setBreeder(id, item.revision); await this.hydrate(true) }
  async unsetBreeder(id: string) { const item = this.getParrot(id); if (!item) throw new Error('找不到鹦鹉档案'); await repository.unsetBreeder(id, item.revision); await this.hydrate(true) }
  async pairParrots(maleId: string, femaleId: string) { const male = this.getParrot(maleId); const female = this.getParrot(femaleId); if (!male || !female) throw new Error('找不到配对档案'); await repository.pairParrots(male, female); await this.hydrate(true) }
  async cancelPair(pairId: string) { const pair = this.getPair(pairId); if (!pair) throw new Error('找不到配对记录'); await repository.cancelPair(pair); await this.hydrate(true) }
  async addHatching(input: Omit<HatchingRecordDoc, 'id' | 'revision' | 'pairId'>) { const male = this.getParrot(input.maleId); const female = this.getParrot(input.femaleId); if (!male || !female) throw new Error('找不到孵化父母档案'); const pair = this.getPair(male.activePairId); const result = await repository.createHatching(input, male, female, pair); await this.hydrate(true); return result }
  async updateHatching(id: string, updates: Partial<HatchingRecordDoc>) { const record = this.hatchingRecords.find(item => item.id === id); if (!record) throw new Error('找不到孵化记录'); if (updates.hatched == null) throw new Error('出壳数量无效'); await repository.updateHatching(record, updates.hatched); await this.hydrate(true) }
  async completeHatching(id: string) { const record = this.hatchingRecords.find(item => item.id === id); if (!record) throw new Error('找不到孵化记录'); await repository.completeHatching(record); await this.hydrate(true) }
  async deleteHatching(id: string) { const record = this.hatchingRecords.find(item => item.id === id); if (!record) throw new Error('找不到孵化记录'); await repository.deleteHatching(record); await this.hydrate(true) }
  async addSale(input: Omit<SaleRecordDoc, 'id' | 'revision' | 'priceCents' | 'status'>) { const parrot = this.getParrot(input.parrotId); if (!parrot) throw new Error('找不到鹦鹉档案'); const result = await repository.createSale(input, parrot); await this.hydrate(true); return result }
  async returnSale(id: string, reason: string) { const record = this.salesRecords.find(item => item.id === id); if (!record) throw new Error('找不到销售记录'); await repository.returnSale(record, reason); await this.hydrate(true) }
  async updateFollowUp(id: string, status: SaleRecordDoc['visitStatus']) { const record = this.salesRecords.find(item => item.id === id); if (!record) throw new Error('找不到销售记录'); await repository.updateFollowUp(record, status); await this.hydrate(true) }
  async createShareToken(parrotId: string) { return repository.createShareToken(parrotId) }
  async revokeShareToken(token: string) { return repository.revokeShareToken(token) }
}

export const store = new Store()
