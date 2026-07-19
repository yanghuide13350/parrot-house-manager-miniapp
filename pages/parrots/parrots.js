"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
Page({
    data: { parrots: [], search: '', filter: '', gender: '', status: '', minPrice: '', maxPrice: '', drawer: false, longPressed: null, genders: Object.keys(types_1.GENDER_LABEL).map(key => ({ key, label: types_1.GENDER_LABEL[key] })), statuses: Object.keys(types_1.STATUS_LABEL).map(key => ({ key, label: types_1.STATUS_LABEL[key] })) },
    onLoad() { this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.setData({ filter: wx.getStorageSync('parrot-pro-filter') || '' }); this.refresh(); },
    onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ selected: 1, hidden: false }); this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    onPullDownRefresh() { store_1.store.hydrate(); setTimeout(() => wx.stopPullDownRefresh(), 400); },
    refresh() {
        const query = String(this.data.search || '').trim().toLowerCase();
        const { gender, status, minPrice, maxPrice, filter } = this.data;
        const parrots = store_1.store.parrots.filter(item => (!query || item.species.toLowerCase().includes(query) || item.ringNumber.toLowerCase().includes(query)) && (!gender || item.gender === gender) && ((!status && !filter) || item.status === (status || filter)) && (!minPrice || item.price >= Number(minPrice)) && (!maxPrice || item.price <= Number(maxPrice))).map(item => ({ ...item, genderLabel: types_1.GENDER_LABEL[item.gender] }));
        this.setData({ parrots });
    },
    inputSearch(event) { this.setData({ search: event.detail.value }, () => this.refresh()); },
    setTabHidden(hidden) { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ hidden }); },
    openDrawer() { this.setTabHidden(true); this.setData({ drawer: true }); }, closeDrawer() { this.setData({ drawer: false }); this.setTabHidden(false); },
    chooseGender(event) { this.setData({ gender: this.data.gender === event.currentTarget.dataset.key ? '' : event.currentTarget.dataset.key }); },
    chooseStatus(event) { this.setData({ status: this.data.status === event.currentTarget.dataset.key ? '' : event.currentTarget.dataset.key }); },
    inputMin(event) { this.setData({ minPrice: event.detail.value }); }, inputMax(event) { this.setData({ maxPrice: event.detail.value }); },
    resetFilter() { this.setData({ search: '', gender: '', status: '', minPrice: '', maxPrice: '', filter: '' }, () => { wx.removeStorageSync('parrot-pro-filter'); this.refresh(); }); },
    quickReset() { this.resetFilter(); wx.showToast({ title: '筛选已重置', icon: 'none' }); },
    applyFilter() { this.setData({ filter: '', drawer: false }, () => this.refresh()); this.setTabHidden(false); },
    selectParrot(event) { wx.navigateTo({ url: `/pages/parrot-detail/parrot-detail?id=${event.currentTarget.dataset.id}` }); },
    addParrot() { wx.navigateTo({ url: '/pages/parrot-form/parrot-form' }); },
    startLongPress(event) { const id = event.currentTarget.dataset.id; this.longPressTimer = setTimeout(() => { const item = store_1.store.getParrot(id); this.setTabHidden(true); this.setData({ longPressed: item }); }, 600); },
    cancelLongPress() { if (this.longPressTimer)
        clearTimeout(this.longPressTimer); this.longPressTimer = null; },
    closeLongPress() { this.setData({ longPressed: null }); this.setTabHidden(false); }, shareLongPress() { this.setData({ longPressed: null }); this.setTabHidden(false); wx.showToast({ title: '请在详情页生成分享', icon: 'none' }); },
    noop() { },
    unsubscribe: null, longPressTimer: null
});
