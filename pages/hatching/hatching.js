"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
const date_1 = require("../../utils/date");
Page({
    data: { records: [], search: '', showAdd: false, showUpdate: false, updateRecord: null, updateValue: 0, submitting: false, newRecord: { species: '', maleId: '', femaleId: '', startDate: (0, date_1.todayDate)(), eggs: '3' }, breeders: [], maleBreeders: [], femaleBreeders: [] },
    onLoad(options) { this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.setData({ search: options.ring || '' }); this.refresh(); },
    onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ selected: 3, hidden: false }); const ring = this.consumeSearchIntent(); if (ring !== null)
        this.setData({ search: ring }, () => this.refresh());
    else
        this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    refresh() { const query = String(this.data.search || '').toLowerCase(); const records = store_1.store.hatchingRecords.filter(item => !query || `${item.maleRingNumber} ${item.femaleRingNumber} ${item.species}`.toLowerCase().includes(query)); const breeders = store_1.store.parrots.filter(item => item.status === types_1.ParrotStatusCode.BREEDER); this.setData({ records, breeders, maleBreeders: breeders.filter(item => item.gender === types_1.GenderCode.MALE), femaleBreeders: breeders.filter(item => item.gender === types_1.GenderCode.FEMALE) }); },
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
        this.setData({ updateRecord: record, updateValue: record.hatched, showUpdate: true });
    } },
    closeUpdate() { if (this.data.submitting)
        return; this.setData({ showUpdate: false }); this.setTabHidden(false); },
    stepUpdate(event) { const diff = Number(event.currentTarget.dataset.diff); this.setData({ updateValue: Math.max(0, Math.min(this.data.updateRecord.eggs, this.data.updateValue + diff)) }); },
    async confirmUpdate() { if (this.data.submitting || !this.data.updateRecord)
        return; this.setData({ submitting: true }); try {
        await store_1.store.updateHatching(this.data.updateRecord.id, { hatched: this.data.updateValue });
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
    remove(event) { if (this.data.submitting)
        return; const id = event.currentTarget.dataset.id; wx.showModal({ title: '确认删除', content: '记录会从列表隐藏并保留审计。', success: async (result) => { if (!result.confirm || this.data.submitting)
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
