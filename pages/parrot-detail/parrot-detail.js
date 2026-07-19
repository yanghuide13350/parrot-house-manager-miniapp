"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
const navigation_1 = require("../../utils/navigation");
Page({
    data: { parrot: null, genderLabel: '', media: [], activeIndex: 0, showPairing: false, showSale: false, showProgress: false, eligible: [], selectedMate: '', eggCount: '3', buyer: '', price: '', contact: '', shareToken: '', submitting: false },
    onLoad(options) { wx.hideShareMenu(); this.id = options.id; this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    onShow() { if (this.id)
        this.refresh(); },
    refresh() { const parrot = store_1.store.getParrot(this.id); if (!parrot)
        return; const media = parrot.media && parrot.media.length ? parrot.media : [{ type: 'image', url: parrot.image }]; this.setData({ parrot, genderLabel: types_1.GENDER_LABEL[parrot.gender], media, price: String(parrot.price || '') }); },
    swiperChange(event) { this.setData({ activeIndex: event.detail.current }); },
    goBack() { (0, navigation_1.backOrSwitchTab)(); },
    edit() { wx.navigateTo({ url: `/pages/parrot-form/parrot-form?id=${this.id}` }); },
    remove() { wx.showModal({ title: '确认删除档案', content: '档案会隐藏并保留后台审计。', success: async (result) => { if (!result.confirm)
            return; try {
            await store_1.store.deleteParrot(this.id);
            (0, navigation_1.backOrSwitchTab)();
        }
        catch (error) {
            wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        } } }); },
    async setBreeder() { if (this.data.submitting)
        return; this.setData({ submitting: true }); try {
        await store_1.store.setBreeder(this.id);
        wx.showToast({ title: '已设为种鸟', icon: 'success' });
    }
    catch (error) {
        wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    async removeBreeder() { if (this.data.submitting)
        return; this.setData({ submitting: true }); try {
        await store_1.store.unsetBreeder(this.id);
        wx.showToast({ title: '已取消种鸟身份', icon: 'success' });
    }
    catch (error) {
        wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    openPairing() { const current = this.data.parrot; const opposite = current.gender === types_1.GenderCode.MALE ? types_1.GenderCode.FEMALE : types_1.GenderCode.MALE; const eligible = store_1.store.parrots.filter(item => item.id !== current.id && item.gender === opposite && item.status === types_1.ParrotStatusCode.BREEDER).map(item => ({ ...item, genderLabel: types_1.GENDER_LABEL[item.gender] })); this.setData({ eligible, showPairing: true, selectedMate: '' }); },
    closePairing() { if (!this.data.submitting)
        this.setData({ showPairing: false }); },
    chooseMate(event) { this.setData({ selectedMate: event.currentTarget.dataset.id }); },
    async confirmPairing() { if (!this.data.selectedMate) {
        wx.showToast({ title: '请选择配偶', icon: 'none' });
        return;
    } const current = this.data.parrot; const mate = store_1.store.getParrot(this.data.selectedMate); if (!mate || this.data.submitting)
        return; this.setData({ submitting: true }); try {
        await store_1.store.pairParrots(current.gender === types_1.GenderCode.MALE ? current.id : mate.id, current.gender === types_1.GenderCode.MALE ? mate.id : current.id);
        this.setData({ showPairing: false });
        wx.showToast({ title: '配对成功', icon: 'success' });
    }
    catch (error) {
        wx.showToast({ title: error.message || '配对失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    openSale() { this.setData({ showSale: true, buyer: '', contact: '', price: String(this.data.parrot.price || '') }); },
    closeSale() { if (!this.data.submitting)
        this.setData({ showSale: false }); },
    inputSale(event) { this.setData({ [event.currentTarget.dataset.key]: event.detail.value }); },
    async confirmSale() { if (!this.data.buyer || !this.data.price) {
        wx.showToast({ title: '请完整填写销售信息', icon: 'none' });
        return;
    } if (this.data.submitting)
        return; const parrot = this.data.parrot; this.setData({ submitting: true }); try {
        await store_1.store.addSale({ parrotId: parrot.id, species: parrot.species, ringNumber: parrot.ringNumber, gender: parrot.gender, buyer: this.data.buyer, buyerContact: this.data.contact, date: new Date().toISOString().slice(0, 10), price: Number(this.data.price), visitStatus: 'WAITING', image: parrot.image });
        this.setData({ showSale: false });
        wx.showToast({ title: '成交记录已保存', icon: 'success' });
    }
    catch (error) {
        wx.showToast({ title: error.message || '成交保存失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    openProgress() { this.setData({ showProgress: true, eggCount: '3' }); },
    closeProgress() { if (!this.data.submitting)
        this.setData({ showProgress: false }); },
    inputEgg(event) { this.setData({ eggCount: event.detail.value }); },
    async startProgress() { const parrot = this.data.parrot; const mate = parrot.mateId ? store_1.store.getParrot(parrot.mateId) : null; const eggs = Number(this.data.eggCount); if (!mate) {
        wx.showToast({ title: '未找到配偶档案', icon: 'none' });
        return;
    } if (!Number.isInteger(eggs) || eggs < 1) {
        wx.showToast({ title: '请输入正确蛋数', icon: 'none' });
        return;
    } if (this.data.submitting)
        return; this.setData({ submitting: true }); try {
        await store_1.store.addHatching({ maleRingNumber: parrot.gender === types_1.GenderCode.MALE ? parrot.ringNumber : mate.ringNumber, femaleRingNumber: parrot.gender === types_1.GenderCode.FEMALE ? parrot.ringNumber : mate.ringNumber, maleId: parrot.gender === types_1.GenderCode.MALE ? parrot.id : mate.id, femaleId: parrot.gender === types_1.GenderCode.FEMALE ? parrot.id : mate.id, species: parrot.species, startDate: new Date().toISOString().slice(0, 10), eggs, hatched: 0, status: 'INCUBATING' });
        this.setData({ showProgress: false });
        wx.showToast({ title: '已启动孵化任务', icon: 'success' });
    }
    catch (error) {
        wx.showToast({ title: error.message || '启动失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    viewHatching() { wx.switchTab({ url: '/pages/hatching/hatching' }); },
    async generateShare() { if (this.data.submitting)
        return; this.setData({ submitting: true }); try {
        const result = await store_1.store.createShareToken(this.id);
        this.setData({ shareToken: result.token });
        wx.showShareMenu({ menus: ['shareAppMessage'] });
        wx.showToast({ title: '分享已生成，请从右上角转发', icon: 'none' });
    }
    catch (error) {
        wx.showToast({ title: error.message || '分享生成失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    revokeShare() { const token = this.data.shareToken; if (!token || this.data.submitting)
        return; wx.showModal({ title: '撤销当前分享', content: '撤销后，已经转发的分享卡片也会立即失效。', success: async (result) => { if (!result.confirm)
            return; this.setData({ submitting: true }); try {
            await store_1.store.revokeShareToken(token);
            this.setData({ shareToken: '' });
            wx.hideShareMenu();
            wx.showToast({ title: '分享已撤销', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '撤销失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        } } }); },
    onShareAppMessage() { var _a, _b; const token = this.data.shareToken; return { title: `${((_a = this.data.parrot) === null || _a === void 0 ? void 0 : _a.species) || '鹦鹉'} · Parrot Pro`, path: token ? `/pages/share/share?token=${encodeURIComponent(token)}` : '/pages/share/share', imageUrl: (_b = this.data.parrot) === null || _b === void 0 ? void 0 : _b.image }; },
    noop() { },
    id: '',
    unsubscribe: null
});
