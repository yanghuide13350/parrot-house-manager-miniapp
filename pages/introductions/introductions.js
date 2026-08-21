"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
const navigation_1 = require("../../utils/navigation");
const monthLabel = (date) => `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月`;
Page({
    data: { months: [], totalCost: 0 },
    onLoad() { this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.refresh(); },
    onShow() { this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    refresh() {
        const imported = store_1.store.parrots.filter(item => item.recordSource === 'INTRODUCTION' && item.purchaseDate);
        const groups = new Map();
        for (const item of imported) {
            const key = String(item.purchaseDate).slice(0, 7);
            groups.set(key, [...(groups.get(key) || []), item]);
        }
        const months = [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([key, parrots]) => ({ key, label: monthLabel(`${key}-01`), open: false, count: parrots.length, cost: parrots.reduce((sum, item) => sum + Number(item.price || 0), 0), parrots: parrots.sort((a, b) => String(b.purchaseDate).localeCompare(String(a.purchaseDate))).map(item => { const image = (item.media || []).find(media => media.type === 'image' && media.url); const statusLabel = item.status === types_1.ParrotStatusCode.FOR_SALE && item.introductionStage === 'GROWING' ? '待成长' : ''; return { ...item, image: (image === null || image === void 0 ? void 0 : image.thumbnailUrl) || (image === null || image === void 0 ? void 0 : image.url) || types_1.PLACEHOLDER_IMAGE, genderLabel: types_1.GENDER_LABEL[item.gender], ringLabel: item.ringNumber || '需补充', statusLabel }; }) }));
        this.setData({ months, totalCost: imported.reduce((sum, item) => sum + Number(item.price || 0), 0) });
    },
    toggleMonth(event) { const key = event.currentTarget.dataset.key; this.setData({ months: this.data.months.map((month) => month.key === key ? { ...month, open: !month.open } : month) }); },
    addIntroduction() { wx.navigateTo({ url: '/pages/parrot-form/parrot-form?mode=introduction' }); },
    selectParrot(event) { wx.navigateTo({ url: `/pages/parrot-detail/parrot-detail?id=${encodeURIComponent(event.currentTarget.dataset.id)}` }); },
    goBack() { (0, navigation_1.backOrSwitchTab)(); },
    unsubscribe: null
});
