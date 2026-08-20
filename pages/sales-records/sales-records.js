"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("../../utils/store");
const navigation_1 = require("../../utils/navigation");
const types_1 = require("../../utils/types");
const VISIT_LABEL = { WAITING: '待回访', VISITED: '已回访', UNREACHABLE: '未联系' };
const VISIT_VALUES = ['WAITING', 'VISITED', 'UNREACHABLE'];
Page({
    data: { sales: [], search: '', stats: { total: 0, revenue: 0, returnRate: 0 }, showReturn: false, selectedSale: null, returnReason: '', submitting: false },
    onLoad() { this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    refresh() {
        const query = String(this.data.search || '').toLowerCase();
        const sales = store_1.store.salesRecords.filter(item => !query || `${item.buyer} ${item.ringNumber} ${item.breed} ${item.species}`.toLowerCase().includes(query)).map(item => ({ ...item, ringNumber: item.ringNumber || '需补充', genderLabel: types_1.GENDER_LABEL[item.gender], visitLabel: VISIT_LABEL[item.visitStatus], returned: item.status === 'RETURNED' }));
        this.setData({ sales, stats: { total: store_1.store.dashboard.stats.salesTotal, revenue: Number(store_1.store.dashboard.stats.revenueCents || 0) / 100, returnRate: store_1.store.dashboard.stats.returnRate } });
    },
    inputSearch(event) { this.setData({ search: event.detail.value }, () => this.refresh()); },
    updateFollowUp(event) {
        const record = store_1.store.salesRecords.find(item => item.id === event.currentTarget.dataset.id);
        if (!record || this.data.submitting)
            return;
        wx.showActionSheet({ itemList: VISIT_VALUES.map(value => VISIT_LABEL[value]), success: async (result) => { const status = VISIT_VALUES[result.tapIndex]; if (!status || status === record.visitStatus)
                return; this.setData({ submitting: true }); try {
                await store_1.store.updateFollowUp(record.id, status);
                wx.showToast({ title: '回访状态已更新', icon: 'success' });
            }
            catch (error) {
                wx.showToast({ title: error.message || '更新失败', icon: 'none' });
            }
            finally {
                this.setData({ submitting: false });
            } } });
    },
    openReturn(event) { const selectedSale = store_1.store.salesRecords.find(item => item.id === event.currentTarget.dataset.id); if (selectedSale)
        this.setData({ selectedSale, showReturn: true, returnReason: '' }); },
    closeReturn() { if (!this.data.submitting)
        this.setData({ showReturn: false }); },
    inputReason(event) { this.setData({ returnReason: event.detail.value }); },
    async confirmReturn() { if (!this.data.returnReason.trim()) {
        wx.showToast({ title: '请填写退货原因', icon: 'none' });
        return;
    } if (this.data.submitting)
        return; this.setData({ submitting: true }); try {
        await store_1.store.returnSale(this.data.selectedSale.id, this.data.returnReason);
        this.setData({ showReturn: false });
        wx.showToast({ title: '退货已登记', icon: 'success' });
    }
    catch (error) {
        wx.showToast({ title: error.message || '退货登记失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    goBack() { (0, navigation_1.backOrSwitchTab)('/pages/home/home'); },
    noop() { },
    unsubscribe: null
});
