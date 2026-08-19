"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
const date_1 = require("../../utils/date");
Page({
    data: { records: [], search: '', showAdd: false, showUpdate: false, updateRecord: null, updateValue: 0, offspringText: '', submitting: false, canRemoveCompleted: false, newRecord: { species: '', maleId: '', femaleId: '', startDate: (0, date_1.todayDate)(), eggs: '3' }, breeders: [], maleBreeders: [], femaleBreeders: [] },
    onLoad(options) { this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.setData({ search: options.ring || '' }); this.refresh(); },
    onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ selected: 3, hidden: false }); const ring = this.consumeSearchIntent(); if (ring !== null)
        this.setData({ search: ring }, () => this.refresh());
    else
        this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    refresh() { const query = String(this.data.search || '').toLowerCase(); const records = store_1.store.hatchingRecords.filter(item => !query || `${item.maleRingNumber} ${item.femaleRingNumber} ${item.species}`.toLowerCase().includes(query)); const breeders = store_1.store.parrots.filter(item => item.status === types_1.ParrotStatusCode.BREEDER); const role = store_1.store.session?.role; this.setData({ records, breeders, maleBreeders: breeders.filter(item => item.gender === types_1.GenderCode.MALE), femaleBreeders: breeders.filter(item => item.gender === types_1.GenderCode.FEMALE), canRemoveCompleted: role === 'OWNER' || role === 'ADMIN' }); },
    inputSearch(event) { this.setData({ search: event.detail.value }, () => this.refresh()); },
    clearSearch() { this.setData({ search: '' }, () => this.refresh()); },
    consumeSearchIntent() { const intent = wx.getStorageSync('parrot-pro-hatching-search-intent'); if (!intent || typeof intent !== 'object' || typeof intent.timestamp !== 'number' || Date.now() - intent.timestamp > 60000)
        return null; wx.removeStorageSync('parrot-pro-hatching-search-intent'); return String(intent.ring || ''); },
    setTabHidden(hidden) { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ hidden }); },
    openAdd() { this.setTabHidden(true); this.setData({ showAdd: true, newRecord: { species: '', maleId: '', femaleId: '', startDate: (0, date_1.todayDate)(), eggs: '3' } }); },
    closeAdd() { if (this.data.submitting)
        return; this.setData({ showAdd: false }); this.setTabHidden(false); },
    inputNew(event) { this.setData({ [`newRecord.${event.currentTarget.dataset.key}`]: event.detail.value }); },
    chooseMale(event) { const item = this.data.maleBreeders[event.detail.value]; if (item)
        this.setData({ 'newRecord.maleId': item.id }); },
    chooseFemale(event) { const item = this.data.femaleBreeders[event.detail.value]; if (item)
        this.setData({ 'newRecord.femaleId': item.id }); },
    chooseDate(event) { this.setData({ 'newRecord.startDate': event.detail.value }); },
    async saveNew() {
        if (this.data.submitting)
            return;
        const form = this.data.newRecord;
        const male = store_1.store.getParrot(form.maleId);
        const female = store_1.store.getParrot(form.femaleId);
        const eggs = Number(form.eggs);
        if (!form.species || !male || !female || !Number.isInteger(eggs) || eggs < 1) {
            wx.showToast({ title: '请完整填写关键信息', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        try {
            await store_1.store.addHatching({ maleRingNumber: male.ringNumber, femaleRingNumber: female.ringNumber, maleId: male.id, femaleId: female.id, species: form.species, startDate: form.startDate, eggs, hatched: 0, status: 'INCUBATING' });
            this.setData({ showAdd: false });
            this.setTabHidden(false);
            wx.showToast({ title: '孵化档案已创建', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '创建失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        }
    },
    openUpdate(event) { const record = store_1.store.hatchingRecords.find(item => item.id === event.currentTarget.dataset.id); if (record) {
        this.setTabHidden(true);
        this.setData({ updateRecord: record, updateValue: record.hatched, offspringText: (record.offspringGroups || []).map(item => `${item.species} ${item.count}`).join('\n'), showUpdate: true });
    } },
    closeUpdate() { if (this.data.submitting)
        return; this.setData({ showUpdate: false }); this.setTabHidden(false); },
    stepUpdate(event) { const diff = Number(event.currentTarget.dataset.diff); this.setData({ updateValue: Math.max(0, Math.min(this.data.updateRecord.eggs, this.data.updateValue + diff)) }); },
    inputOffspring(event) { this.setData({ offspringText: event.detail.value }); },
    parseOffspringGroups() { const lines = String(this.data.offspringText || '').split(/\n|，|,/).map(item => item.trim()).filter(Boolean), groups = lines.map(line => { const match = line.match(/^(.+?)\s*[：:\s]\s*(\d+)\s*(只)?$/); if (!match)
        throw new Error('请按“品种 数量”逐行填写'); return { species: match[1].trim(), count: Number(match[2]) }; }); if (groups.reduce((sum, item) => sum + item.count, 0) > this.data.updateValue)
        throw new Error('品种数量不能超过出壳数量'); return groups; },
    async confirmUpdate() { if (this.data.submitting || !this.data.updateRecord)
        return; let offspringGroups; try {
        offspringGroups = this.parseOffspringGroups();
    }
    catch (error) {
        wx.showToast({ title: error.message, icon: 'none' }); return;
    } this.setData({ submitting: true }); try {
        await store_1.store.updateHatching(this.data.updateRecord.id, { hatched: this.data.updateValue, offspringGroups });
        this.setData({ showUpdate: false });
        this.setTabHidden(false);
        wx.showToast({ title: '进度已更新', icon: 'success' });
    }
    catch (error) {
        wx.showToast({ title: error.message || '更新失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    complete(event) { if (this.data.submitting)
        return; const id = event.currentTarget.dataset.id; wx.showModal({ title: '确认完成', content: '完成后父母鸟将恢复为种鸟状态。', success: async (result) => { if (!result.confirm || this.data.submitting)
            return; this.setData({ submitting: true }); try {
            await store_1.store.completeHatching(id);
            wx.showToast({ title: '孵化任务已完成', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '操作失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        } } }); },
    intakeChicks(event) { const record = store_1.store.hatchingRecords.find(item => item.id === event.currentTarget.dataset.id); if (!record || record.status !== 'COMPLETED' || record.hatched < 1)
        return; wx.navigateTo({ url: `/pages/clutch-intake/clutch-intake?id=${record.id}` }); },
    remove(event) { if (this.data.submitting || !this.data.canRemoveCompleted)
        return; const id = event.currentTarget.dataset.id; wx.showModal({ title: '确认移除', content: '此操作会删除该窝的孵化记录，并从父母鸟详情中同步移除。', confirmColor: '#b42318', success: async (result) => { if (!result.confirm || this.data.submitting)
            return; this.setData({ submitting: true }); try {
            await store_1.store.deleteHatching(id);
            wx.showToast({ title: '记录已移除', icon: 'none' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        } } }); },
    noop() { },
    unsubscribe: null
});
