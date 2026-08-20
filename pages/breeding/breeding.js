"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
const date_1 = require("../../utils/date");
Page({
    data: { pairs: [], breeders: [], search: '', selected: null, showModal: false, eggCount: '3', submitting: false },
    onLoad() { this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.refresh(); },
    onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ selected: 2, hidden: false }); this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); this.cancelSearchRefresh(); },
    async refreshFromTab() {
        wx.pageScrollTo({ scrollTop: 0, duration: 0 });
        await store_1.store.hydrate(true);
        this.refresh();
        if (store_1.store.lastError)
            wx.showToast({ title: store_1.store.lastError, icon: 'none' });
        else
            wx.showToast({ title: '已刷新', icon: 'none' });
    },
    refresh() {
        const query = String(this.data.search || '').trim().toLowerCase();
        const matches = (item) => !query || [item.breed, item.species, item.ringNumber].some(value => String(value || '').toLowerCase().includes(query));
        const pairs = store_1.store.pairs.filter(pair => matches(pair.male) || matches(pair.female)).map(pair => ({ ...pair, male: { ...pair.male, ringLabel: pair.male.ringNumber || '需补充' }, female: { ...pair.female, ringLabel: pair.female.ringNumber || '需补充' }, breed: pair.male.breed || '', species: pair.male.species, status: pair.status === 'INCUBATING' ? types_1.ParrotStatusCode.INCUBATING : types_1.ParrotStatusCode.PAIRED, duration: pair.male.pairDays || 0 }));
        const breeders = store_1.store.parrots.filter(item => item.status === types_1.ParrotStatusCode.BREEDER && matches(item)).map(item => ({ ...item, genderLabel: types_1.GENDER_LABEL[item.gender], ringLabel: item.ringNumber || '需补充' }));
        this.setData({ pairs, breeders });
    },
    inputSearch(event) { this.setData({ search: event.detail.value }); this.scheduleSearchRefresh(); },
    scheduleSearchRefresh() { this.cancelSearchRefresh(); this.searchDebounceTimer = setTimeout(() => { this.searchDebounceTimer = null; this.refresh(); }, 300); },
    cancelSearchRefresh() { if (this.searchDebounceTimer)
        clearTimeout(this.searchDebounceTimer); this.searchDebounceTimer = null; },
    clearSearch() { this.cancelSearchRefresh(); this.setData({ search: '' }, () => this.refresh()); },
    setTabHidden(hidden) { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ hidden }); },
    openProgress(event) { const pair = this.data.pairs.find((item) => item.male.id === event.currentTarget.dataset.male); this.setTabHidden(true); this.setData({ selected: pair, showModal: true, eggCount: '3' }); },
    closeModal() { if (this.data.submitting)
        return; this.setData({ showModal: false }); this.setTabHidden(false); },
    inputEgg(event) { this.setData({ eggCount: event.detail.value }); },
    async startIncubation() {
        if (this.data.submitting)
            return;
        const pair = this.data.selected;
        const eggs = Number(this.data.eggCount);
        if (!pair || !Number.isInteger(eggs) || eggs < 1) {
            wx.showToast({ title: '请输入正确蛋数', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        try {
            await store_1.store.addHatching({ maleRingNumber: pair.male.ringNumber, femaleRingNumber: pair.female.ringNumber, maleId: pair.male.id, femaleId: pair.female.id, species: pair.species, startDate: (0, date_1.todayDate)(), eggs, hatched: 0, status: 'INCUBATING' });
            this.setData({ showModal: false });
            this.setTabHidden(false);
            wx.showToast({ title: `任务已启动：${eggs} 枚蛋`, icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '启动失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        }
    },
    cancelPair(event) {
        if (this.data.submitting)
            return;
        const pair = this.data.pairs.find((item) => item.male.id === event.currentTarget.dataset.male);
        if (!pair)
            return;
        if (pair.status === types_1.ParrotStatusCode.INCUBATING) {
            wx.showToast({ title: '孵化期内禁止拆对', icon: 'none' });
            return;
        }
        wx.showModal({ title: '确认拆对', content: `解除 ${pair.male.ringNumber} 与 ${pair.female.ringNumber} 的配对关系？`, success: async (result) => { if (!result.confirm || this.data.submitting)
                return; this.setData({ submitting: true }); try {
                await store_1.store.cancelPair(pair.id);
                wx.showToast({ title: '配对已拆除', icon: 'success' });
            }
            catch (error) {
                wx.showToast({ title: error.message || '拆对失败', icon: 'none' });
            }
            finally {
                this.setData({ submitting: false });
            } } });
    },
    viewHatching(event) { wx.setStorageSync('parrot-pro-hatching-search-intent', { ring: String(event.currentTarget.dataset.ring || ''), timestamp: Date.now() }); wx.switchTab({ url: '/pages/hatching/hatching' }); },
    viewParrot(event) { wx.navigateTo({ url: `/pages/parrot-detail/parrot-detail?id=${event.currentTarget.dataset.id}` }); },
    noop() { },
    unsubscribe: null,
    searchDebounceTimer: null
});
