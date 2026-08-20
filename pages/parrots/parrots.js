"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
Page({
    data: { parrots: [], search: '', filter: '', filterLabel: '', clutchId: '', clutchLabel: '', gender: '', status: '', minPrice: '', maxPrice: '', drawer: false, longPressed: null, genders: Object.keys(types_1.GENDER_LABEL).map(key => ({ key, label: types_1.GENDER_LABEL[key] })), statuses: Object.keys(types_1.STATUS_LABEL).map(key => ({ key, label: types_1.STATUS_LABEL[key] })) },
    onLoad() { this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.refresh(); },
    onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ selected: 1, hidden: false }); const filter = this.consumeFilterIntent(); if (filter !== null)
        this.resetFilterState(filter);
    else
        this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); this.cancelSearchRefresh(); },
    async onPullDownRefresh() { await store_1.store.hydrate(true); wx.stopPullDownRefresh(); },
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
        const { gender, status, minPrice, maxPrice, filter, clutchId, clutchLabel } = this.data;
        const activeStatus = (status || filter);
        const parrots = store_1.store.parrots.filter(item => (!query || item.breed.toLowerCase().includes(query) || item.species.toLowerCase().includes(query) || item.ringNumber.toLowerCase().includes(query)) && (!gender || item.gender === gender) && (!activeStatus || item.status === activeStatus) && (!clutchId || item.birthHatchingRecordId === clutchId) && (!minPrice || item.price >= Number(minPrice)) && (!maxPrice || item.price <= Number(maxPrice))).map(item => {
            const firstImage = (item.media || []).find(media => media.type === 'image' && media.url);
            return { ...item, image: (firstImage === null || firstImage === void 0 ? void 0 : firstImage.thumbnailUrl) || (firstImage === null || firstImage === void 0 ? void 0 : firstImage.url) || types_1.PLACEHOLDER_IMAGE, coverType: firstImage ? 'image' : 'placeholder', genderLabel: types_1.GENDER_LABEL[item.gender], ringLabel: item.ringNumber || '需补充' };
        });
        this.setData({ parrots, filterLabel: clutchLabel || (activeStatus ? types_1.STATUS_LABEL[activeStatus] || '' : '') });
    },
    inputSearch(event) { this.setData({ search: event.detail.value }); this.scheduleSearchRefresh(); },
    scheduleSearchRefresh() { this.cancelSearchRefresh(); this.searchDebounceTimer = setTimeout(() => { this.searchDebounceTimer = null; this.refresh(); }, 300); },
    cancelSearchRefresh() { if (this.searchDebounceTimer)
        clearTimeout(this.searchDebounceTimer); this.searchDebounceTimer = null; },
    setTabHidden(hidden) { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ hidden }); },
    openDrawer() { this.setTabHidden(true); this.setData({ drawer: true }); }, closeDrawer() { this.setData({ drawer: false }); this.setTabHidden(false); },
    chooseGender(event) { this.setData({ gender: this.data.gender === event.currentTarget.dataset.key ? '' : event.currentTarget.dataset.key }); },
    chooseStatus(event) { this.setData({ status: this.data.status === event.currentTarget.dataset.key ? '' : event.currentTarget.dataset.key }); },
    inputMin(event) { this.setData({ minPrice: event.detail.value }); }, inputMax(event) { this.setData({ maxPrice: event.detail.value }); },
    consumeFilterIntent() { const intent = wx.getStorageSync('parrot-pro-filter-intent'); if (!intent || typeof intent !== 'object' || typeof intent.timestamp !== 'number' || Date.now() - intent.timestamp > 60000)
        return null; wx.removeStorageSync('parrot-pro-filter-intent'); return { status: String(intent.status || ''), clutchId: String(intent.birthHatchingRecordId || ''), clutchLabel: String(intent.label || '') }; },
    resetFilterState(intent) { this.setData({ search: '', gender: '', status: intent.status, clutchId: intent.clutchId, clutchLabel: intent.clutchLabel, minPrice: '', maxPrice: '', filter: '' }, () => this.refresh()); },
    resetFilter() { this.setData({ search: '', gender: '', status: '', clutchId: '', clutchLabel: '', minPrice: '', maxPrice: '', filter: '' }, () => { wx.removeStorageSync('parrot-pro-filter'); wx.removeStorageSync('parrot-pro-filter-intent'); this.refresh(); }); },
    quickReset() { this.resetFilter(); wx.showToast({ title: '筛选已重置', icon: 'none' }); },
    applyFilter() { this.setData({ filter: '', drawer: false }, () => this.refresh()); this.setTabHidden(false); },
    selectParrot(event) { wx.navigateTo({ url: `/pages/parrot-detail/parrot-detail?id=${event.currentTarget.dataset.id}` }); },
    addParrot() { wx.navigateTo({ url: '/pages/parrot-form/parrot-form' }); },
    startLongPress(event) { const id = event.currentTarget.dataset.id; this.longPressTimer = setTimeout(() => { const item = store_1.store.getParrot(id); this.setTabHidden(true); this.setData({ longPressed: item }); }, 600); },
    cancelLongPress() { if (this.longPressTimer)
        clearTimeout(this.longPressTimer); this.longPressTimer = null; },
    closeLongPress() { this.setData({ longPressed: null }); this.setTabHidden(false); }, shareLongPress() { this.setData({ longPressed: null }); this.setTabHidden(false); wx.showToast({ title: '请在详情页生成分享', icon: 'none' }); },
    noop() { },
    unsubscribe: null, longPressTimer: null, searchDebounceTimer: null
});
