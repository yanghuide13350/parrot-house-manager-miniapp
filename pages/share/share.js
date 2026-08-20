"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloud_1 = require("../../utils/cloud");
const types_1 = require("../../utils/types");
const navigation_1 = require("../../utils/navigation");
Page({
    data: { parrot: null, media: [], invalid: false, loading: true, activeIndex: 0, token: '', shareTopStyle: '' },
    async onLoad(options) {
        var _a;
        const token = String(options.token || '');
        this.syncTopBar();
        if (!token) {
            this.setData({ invalid: true, loading: false });
            return;
        }
        try {
            const result = await (0, cloud_1.resolvePublicShare)(token);
            if (!result.valid || !result.parrot) {
                this.setData({ invalid: true, loading: false, token });
                return;
            }
            const value = result.parrot;
            const parentLabel = (parent) => parent ? `${parent.species}${parent.ringNumber ? ` · ${parent.ringNumber}` : ''}` : '暂未录入';
            const photos = (value.media || []).filter((item) => item.type === 'image' && item.url);
            const parrot = { ...value, ringNumber: value.ringNumber || '需补充', gender: types_1.GENDER_LABEL[value.gender] || value.gender, age: value.ageLabel, price: Number(value.priceCents || 0) / 100, desc: value.publicIntro, birthDateLabel: String(value.birthDate || '').slice(0, 10), fatherLabel: parentLabel(value.father), motherLabel: parentLabel(value.mother), clutchLabel: value.clutch ? `本窝出壳 ${value.clutch.hatched} 只` : '', image: ((_a = photos[0]) === null || _a === void 0 ? void 0 : _a.url) || types_1.PLACEHOLDER_IMAGE };
            this.setData({ parrot, media: photos.length ? photos : [{ type: 'image', url: types_1.PLACEHOLDER_IMAGE }], invalid: false, loading: false, token });
        }
        catch (error) {
            this.setData({ invalid: true, loading: false, token });
        }
    },
    onShow() { this.syncTopBar(); },
    syncTopBar() {
        const menu = typeof wx.getMenuButtonBoundingClientRect === 'function' ? wx.getMenuButtonBoundingClientRect() : null;
        if (!menu) {
            this.setData({ shareTopStyle: '' });
            return;
        }
        const top = Math.max(menu.bottom + 14, 34);
        this.setData({ shareTopStyle: `top:${top}px;left:20px;right:20px;` });
    },
    swiperChange(event) { this.setData({ activeIndex: event.detail.current }); },
    onShareAppMessage() { var _a, _b; return { title: `${((_a = this.data.parrot) === null || _a === void 0 ? void 0 : _a.species) || 'Parrot Pro'} · 血统档案`, path: `/pages/share/share?token=${encodeURIComponent(this.data.token)}`, imageUrl: (_b = this.data.parrot) === null || _b === void 0 ? void 0 : _b.image }; },
    goBack() { (0, navigation_1.backOrSwitchTab)(); }
});
