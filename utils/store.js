"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const repository_1 = require("./repository");
const emptyDashboard = () => ({ stats: { total: 0, forSale: 0, sold: 0, returned: 0, breeder: 0, paired: 0, incubating: 0, revenueCents: 0, salesTotal: 0, returnRate: 0 }, species: [], trend: [] });
class Store {
    constructor() {
        this.parrots = [];
        this.pairs = [];
        this.hatchingRecords = [];
        this.salesRecords = [];
        this.dashboard = emptyDashboard();
        this.session = null;
        this.lastError = '';
        this.listeners = [];
        this.loading = null;
        this.refreshQueued = false;
    }
    subscribe(listener) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter(item => item !== listener); }; }
    emit() { this.listeners.forEach(listener => listener()); }
    apply(snapshot) {
        this.parrots = snapshot.parrots || [];
        this.pairs = snapshot.pairs || [];
        this.hatchingRecords = snapshot.hatchingRecords || [];
        this.salesRecords = snapshot.salesRecords || [];
        this.dashboard = snapshot.dashboard || emptyDashboard();
        this.emit();
    }
    setSession(session) {
        this.session = session;
        this.emit();
    }
    hydrate(force = false) {
        if (this.loading) {
            if (!force)
                return this.loading;
            this.refreshQueued = true;
            return this.loading.then(() => {
                if (!this.refreshQueued)
                    return;
                this.refreshQueued = false;
                return this.hydrate(true);
            });
        }
        this.loading = (async () => {
            try {
                if (!repository_1.repository.currentSession())
                    this.setSession(await repository_1.repository.session());
                const cached = repository_1.repository.loadCache();
                if (cached && !this.parrots.length)
                    this.apply(cached);
                this.apply(await repository_1.repository.bootstrap());
                this.setSession(repository_1.repository.currentSession());
                this.lastError = '';
            }
            catch (error) {
                this.lastError = error && error.message || '数据加载失败';
            }
            finally {
                this.loading = null;
            }
        })();
        return this.loading;
    }
    getParrot(id) { return this.parrots.find(item => item.id === id); }
    getPair(id) { return id ? this.pairs.find(item => item.id === id) : undefined; }
    async createParrot(input) { const result = await repository_1.repository.createParrot(input); await this.hydrate(true); return result; }
    async createIntroduction(input) { const result = await repository_1.repository.createIntroduction(input); await this.hydrate(true); return result; }
    async updateParrot(id, updates) { const item = this.getParrot(id); if (!item)
        throw new Error('找不到鹦鹉档案'); const result = await repository_1.repository.updateParrot(id, item.revision, updates); await this.hydrate(true); return result; }
    async deleteParrot(id) { const item = this.getParrot(id); if (!item)
        throw new Error('找不到鹦鹉档案'); await repository_1.repository.deleteParrot(id, item.revision); await this.hydrate(true); }
    async setBreeder(id) { const item = this.getParrot(id); if (!item)
        throw new Error('找不到鹦鹉档案'); await repository_1.repository.setBreeder(id, item.revision); await this.hydrate(true); }
    async unsetBreeder(id) { const item = this.getParrot(id); if (!item)
        throw new Error('找不到鹦鹉档案'); await repository_1.repository.unsetBreeder(id, item.revision); await this.hydrate(true); }
    async markIntroductionForSale(id) { const item = this.getParrot(id); if (!item)
        throw new Error('找不到引种鸟'); await repository_1.repository.markIntroductionForSale(id, item.revision); await this.hydrate(true); }
    async setFeedingPlan(id, feedingPlanId) { const item = this.getParrot(id); if (!item)
        throw new Error('找不到鹦鹉档案'); await repository_1.repository.setParrotFeedingPlan(id, item.revision, feedingPlanId); await this.hydrate(true); }
    async pairParrots(maleId, femaleId) { const male = this.getParrot(maleId); const female = this.getParrot(femaleId); if (!male || !female)
        throw new Error('找不到配对档案'); await repository_1.repository.pairParrots(male, female); await this.hydrate(true); }
    async cancelPair(pairId) { const pair = this.getPair(pairId); if (!pair)
        throw new Error('找不到配对记录'); await repository_1.repository.cancelPair(pair); await this.hydrate(true); }
    async addHatching(input) { const male = this.getParrot(input.maleId); const female = this.getParrot(input.femaleId); if (!male || !female)
        throw new Error('找不到孵化父母档案'); const pair = this.getPair(male.activePairId); const result = await repository_1.repository.createHatching(input, male, female, pair); await this.hydrate(true); return result; }
    async updateHatching(id, updates) { const record = this.hatchingRecords.find(item => item.id === id); if (!record)
        throw new Error('找不到孵化记录'); if (updates.hatched == null)
        throw new Error('出壳数量无效'); await repository_1.repository.updateHatching(record, updates.hatched, updates.offspringGroups || []); await this.hydrate(true); }
    async completeHatching(id) { const record = this.hatchingRecords.find(item => item.id === id); if (!record)
        throw new Error('找不到孵化记录'); await repository_1.repository.completeHatching(record); await this.hydrate(true); }
    async deleteHatching(id) { const record = this.hatchingRecords.find(item => item.id === id); if (!record)
        throw new Error('找不到孵化记录'); await repository_1.repository.deleteHatching(record); await this.hydrate(true); }
    async createFromClutch(id, chicks) { const record = this.hatchingRecords.find(item => item.id === id); if (!record)
        throw new Error('找不到孵化记录'); const result = await repository_1.repository.createFromClutch(record, chicks); await this.hydrate(true); return result; }
    async addSale(input) { const parrot = this.getParrot(input.parrotId); if (!parrot)
        throw new Error('找不到鹦鹉档案'); const result = await repository_1.repository.createSale(input, parrot); await this.hydrate(true); return result; }
    async returnSale(id, reason) { const record = this.salesRecords.find(item => item.id === id); if (!record)
        throw new Error('找不到销售记录'); await repository_1.repository.returnSale(record, reason); await this.hydrate(true); }
    async updateFollowUp(id, status) { const record = this.salesRecords.find(item => item.id === id); if (!record)
        throw new Error('找不到销售记录'); await repository_1.repository.updateFollowUp(record, status); await this.hydrate(true); }
    async createShareToken(parrotId) { return repository_1.repository.createShareToken(parrotId); }
    async revokeShareToken(token) { return repository_1.repository.revokeShareToken(token); }
}
exports.store = new Store();
