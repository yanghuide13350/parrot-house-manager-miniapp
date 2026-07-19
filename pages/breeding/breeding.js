"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
Page({
    data: { pairs: [], breeders: [], selected: null, showModal: false, eggCount: '3', submitting: false },
    onLoad() { this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.refresh(); },
    onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ selected: 2, hidden: false }); this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    refresh() {
        const pairs = store_1.store.pairs.map(pair => ({ ...pair, species: pair.male.species, status: pair.status === 'INCUBATING' ? types_1.ParrotStatusCode.INCUBATING : types_1.ParrotStatusCode.PAIRED, duration: pair.male.pairDays || 0 }));
        const breeders = store_1.store.parrots.filter(item => item.status === types_1.ParrotStatusCode.BREEDER).map(item => ({ ...item, genderLabel: types_1.GENDER_LABEL[item.gender] }));
        this.setData({ pairs, breeders });
    },
    setTabHidden(hidden) { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar)
        tabBar.setData({ hidden }); },
    openProgress(event) { const pair = this.data.pairs.find((item) => item.male.id === event.currentTarget.dataset.male); this.setTabHidden(true); this.setData({ selected: pair, showModal: true, eggCount: '3' }); },
    closeModal() { if (this.data.submitting)
        return; this.setData({ showModal: false }); this.setTabHidden(false); },
    inputEgg(event) { this.setData({ eggCount: event.detail.value }); },
    async startIncubation() {
        const pair = this.data.selected;
        const eggs = Number(this.data.eggCount);
        if (!pair || !Number.isInteger(eggs) || eggs < 1) {
            wx.showToast({ title: '请输入正确蛋数', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        try {
            await store_1.store.addHatching({ maleRingNumber: pair.male.ringNumber, femaleRingNumber: pair.female.ringNumber, maleId: pair.male.id, femaleId: pair.female.id, species: pair.species, startDate: new Date().toISOString().slice(0, 10), eggs, hatched: 0, status: 'INCUBATING' });
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
        const pair = this.data.pairs.find((item) => item.male.id === event.currentTarget.dataset.male);
        if (!pair)
            return;
        if (pair.status === types_1.ParrotStatusCode.INCUBATING) {
            wx.showToast({ title: '孵化期内禁止拆对', icon: 'none' });
            return;
        }
        wx.showModal({ title: '确认拆对', content: `解除 ${pair.male.ringNumber} 与 ${pair.female.ringNumber} 的配对关系？`, success: async (result) => { if (!result.confirm)
                return; try {
                await store_1.store.cancelPair(pair.id);
                wx.showToast({ title: '配对已拆除', icon: 'success' });
            }
            catch (error) {
                wx.showToast({ title: error.message || '拆对失败', icon: 'none' });
            } } });
    },
    viewHatching(event) { wx.navigateTo({ url: `/pages/hatching/hatching?ring=${event.currentTarget.dataset.ring}` }); },
    viewParrot(event) { wx.navigateTo({ url: `/pages/parrot-detail/parrot-detail?id=${event.currentTarget.dataset.id}` }); },
    noop() { },
    unsubscribe: null
});
