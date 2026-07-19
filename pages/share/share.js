"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloud_1 = require("../../utils/cloud");
const types_1 = require("../../utils/types");
const navigation_1 = require("../../utils/navigation");
Page({
    data: { parrot: null, media: [], invalid: false, loading: true, activeIndex: 0, token: '' },
    async onLoad(options) {
        const token = String(options.token || '');
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
            const parrot = { ...value, gender: types_1.GENDER_LABEL[value.gender] || value.gender, age: value.ageLabel, price: Number(value.priceCents || 0) / 100, desc: value.publicIntro, image: value.media && value.media[0] && value.media[0].url || types_1.PLACEHOLDER_IMAGE };
            this.setData({ parrot, media: value.media && value.media.length ? value.media : [{ type: 'image', url: types_1.PLACEHOLDER_IMAGE }], invalid: false, loading: false, token });
        }
        catch (error) {
            this.setData({ invalid: true, loading: false, token });
        }
    },
    swiperChange(event) { this.setData({ activeIndex: event.detail.current }); },
    onShareAppMessage() { var _a, _b; return { title: `${((_a = this.data.parrot) === null || _a === void 0 ? void 0 : _a.species) || 'Parrot Pro'} · 官方档案`, path: `/pages/share/share?token=${encodeURIComponent(this.data.token)}`, imageUrl: (_b = this.data.parrot) === null || _b === void 0 ? void 0 : _b.image }; },
    goBack() { (0, navigation_1.backOrSwitchTab)(); }
});
