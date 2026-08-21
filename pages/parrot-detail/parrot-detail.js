"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
const navigation_1 = require("../../utils/navigation");
const date_1 = require("../../utils/date");
const config_1 = require("../../config");
const repository_1 = require("../../utils/repository");
const SHARE_CACHE_KEY = 'parrot-pro-share-cache';
const ageDays = (birthDate) => Math.max(0, Math.floor((Date.now() - new Date(`${birthDate}T00:00:00+08:00`).getTime()) / 86400000));
const planStart = (plan) => Number(plan.ageFromMonths || 0) * 31 + Number(plan.ageFromDays || 0);
const planEnd = (plan) => Number(plan.ageToMonths || 0) * 31 + Number(plan.ageToDays || 0);
Page({
    data: { parrot: null, genderLabel: '', statusLabel: '', media: [], clutches: [], visibleClutches: [], clutchTotal: 0, showAllClutches: false, activeIndex: 0, showPairing: false, showSale: false, showProgress: false, showFeedingPlan: false, feedingPlan: null, eligible: [], selectedMate: '', eggCount: '3', buyer: '', price: '', contact: '', shareToken: '', shareUrl: '', shareExpiryLabel: '', submitting: false, detailTopStyle: '', detailActionsStyle: '' },
    onLoad(options) { wx.hideShareMenu(); this.id = options.id; this.syncTopBar(); this.restoreShareState(); this.unsubscribe = store_1.store.subscribe(() => this.refresh()); this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    onShow() { this.syncTopBar(); this.restoreShareState(); if (this.id) {
        this.refresh();
        this.loadFeedingPlans();
    } },
    syncTopBar() {
        const menu = typeof wx.getMenuButtonBoundingClientRect === 'function' ? wx.getMenuButtonBoundingClientRect() : null;
        const windowInfo = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : null;
        if (!menu || !windowInfo) {
            this.setData({ detailTopStyle: '', detailActionsStyle: '' });
            return;
        }
        const top = Math.max(menu.bottom + 14, 34);
        const rightGap = Math.max(windowInfo.windowWidth - menu.left + 12, 0);
        this.setData({ detailTopStyle: `top:${top}px;left:14px;right:14px;`, detailActionsStyle: `margin-right:${rightGap}px;` });
    },
    readShareCache() {
        const raw = wx.getStorageSync(SHARE_CACHE_KEY);
        return raw && typeof raw === 'object' ? raw : {};
    },
    writeShareCache(cache) { wx.setStorageSync(SHARE_CACHE_KEY, cache); },
    restoreShareState() {
        const cache = this.readShareCache();
        const entry = cache[this.id];
        if (!entry)
            return;
        if (!entry.expiresAt || new Date(entry.expiresAt).getTime() <= Date.now()) {
            delete cache[this.id];
            this.writeShareCache(cache);
            this.setData({ shareToken: '', shareUrl: '', shareExpiryLabel: '' });
            wx.hideShareMenu();
            return;
        }
        this.setData({ shareToken: entry.token || '', shareUrl: entry.url || '', shareExpiryLabel: this.shareExpiryText(entry.expiresAt) });
        if (entry.token)
            wx.showShareMenu({ menus: ['shareAppMessage'] });
    },
    saveShareState(token, expiresAt) {
        const cache = this.readShareCache();
        cache[this.id] = { token, url: this.sharePublicUrl(token), expiresAt };
        this.writeShareCache(cache);
    },
    clearShareState() {
        const cache = this.readShareCache();
        if (cache[this.id]) {
            delete cache[this.id];
            this.writeShareCache(cache);
        }
    },
    refresh() { const source = store_1.store.getParrot(this.id); if (!source)
        return; const parrot = { ...source, ringLabel: source.ringNumber || '需补充', isIntroduction: source.recordSource === 'INTRODUCTION', canSell: source.status === types_1.ParrotStatusCode.FOR_SALE && (source.recordSource !== 'INTRODUCTION' || source.introductionStage === 'FOR_SALE') }; const statusLabel = parrot.isIntroduction && parrot.status === types_1.ParrotStatusCode.FOR_SALE && parrot.introductionStage === 'GROWING' ? '待成长' : ''; const photos = (parrot.media || []).filter(item => item.type === 'image' && item.url); const media = photos.length ? photos : [{ type: 'image', url: parrot.image }], clutches = store_1.store.hatchingRecords.filter(item => item.maleId === this.id || item.femaleId === this.id).sort((a, b) => { const paired = String(a.pairingDate || a.startDate || a.createdAt || '').localeCompare(String(b.pairingDate || b.startDate || b.createdAt || '')); if (paired)
        return paired; const hatched = String(a.startDate || '').localeCompare(String(b.startDate || '')); return hatched || String(a.createdAt || '').localeCompare(String(b.createdAt || '')); }).map((item, index) => { const isMale = item.maleId === this.id, partnerSpecies = isMale ? item.femaleSpecies : item.maleSpecies, partnerRing = isMale ? item.femaleRingNumber : item.maleRingNumber, registered = Number(item.offspringRegistered || 0), rings = (item.offspring || []).map(chick => chick.ringNumber || '未戴环'); return { ...item, clutchNo: index + 1, partnerText: `${partnerSpecies || '配偶'}${partnerRing ? `｜${partnerRing}` : ''}`, pairingDateLabel: item.pairingDate ? String(item.pairingDate).slice(0, 10) : '未记录', offspringRingText: rings.length ? rings.join('、') : '暂无圈号', canIntake: item.status === 'COMPLETED' && item.hatched > 0 && registered === 0, intakeLabel: registered ? `已录入 ${registered} / ${item.hatched} 只幼鸟` : `录入本窝 ${item.hatched} 只幼鸟` }; }); const visibleClutches = this.data.showAllClutches ? clutches : clutches.slice(-2); this.setData({ parrot, statusLabel, genderLabel: types_1.GENDER_LABEL[parrot.gender], media, clutches, visibleClutches, clutchTotal: clutches.length, price: String(parrot.price || '') }); },
    toggleClutches() { this.setData({ showAllClutches: !this.data.showAllClutches }, () => this.refresh()); },
    swiperChange(event) { this.setData({ activeIndex: event.detail.current }); },
    async loadFeedingPlans() { try {
        const feedingPlans = await repository_1.repository.feedingPlans(), current = store_1.store.getParrot(this.id), currentAge = current ? ageDays(current.birthDate) : -1, feedingPlan = feedingPlans.find(item => item.isEnabled && item.species === (current === null || current === void 0 ? void 0 : current.breed) && currentAge >= planStart(item) && currentAge <= planEnd(item)) || null;
        this.setData({ feedingPlan });
    }
    catch (error) {
        wx.showToast({ title: error.message || '喂养方案加载失败', icon: 'none' });
    } },
    openFeedingPlan() { if (this.data.feedingPlan)
        this.setData({ showFeedingPlan: true }); },
    closeFeedingPlan() { this.setData({ showFeedingPlan: false }); },
    copyFeedingGuide() { const item = this.data.feedingPlan; if (!item)
        return; const mixed = item.feedingType === 'MIXED', solid = item.feedingType === 'SOLID', lines = [`【${this.data.parrot.species}喂养指南】`, `阶段：${item.stage}（${item.ageFromMonths}月${item.ageFromDays || 0}天–${item.ageToMonths}月${item.ageToDays || 0}天）`, `食物：${mixed ? '奶粉 + 谷子' : solid ? '谷子 / 固体食物' : '奶粉'}`, `每天：${item.feedingsPerDay || '请按说明'}次；单次：${item.amountMl || '请按说明'}`]; if (!solid)
        lines.push(`奶粉：${item.formulaName || '请咨询卖家'}`, `冲泡：${item.waterMl || '—'}ml 水 + ${item.powderScoops || '—'}`, `水温：${item.temperatureMin}–${item.temperatureMax}℃`, `水温判断：${item.temperatureCheck || '请按方案操作'}`); if (mixed || solid)
        lines.push(`谷子/固体食物：${item.seedFoodName || '请按说明'}`, `参考量：${item.seedFoodAmount || '请按说明'}`, `说明：${item.seedFoodNotes || '请按方案操作'}`); lines.push(`方式：${item.feedingMethod || '请按说明'}`, '', `注意事项：${item.feedingNotes || '请按方案操作'}`, `喂饱判断：${item.fullnessNotes || '请观察嗉囊和精神状态'}`, `异常提醒：${item.warningNotes || '如有异常请及时联系卖家或兽医'}`); wx.setClipboardData({ data: lines.join('\n') }); },
    openMedia(event) {
        const item = this.data.media[Number(event.currentTarget.dataset.index)];
        if (!item || !item.url)
            return;
        const urls = this.data.media.filter((media) => media.url).map((media) => media.url);
        wx.previewImage({ current: item.url, urls });
    },
    goBack() { (0, navigation_1.backOrSwitchTab)(); },
    viewRelatedParrot(event) { const id = String(event.currentTarget.dataset.id || ''); if (!id || id === this.id || !store_1.store.getParrot(id))
        return; wx.navigateTo({ url: `/pages/parrot-detail/parrot-detail?id=${encodeURIComponent(id)}` }); },
    edit() { wx.navigateTo({ url: `/pages/parrot-form/parrot-form?id=${this.id}` }); },
    remove() { if (this.data.submitting)
        return; wx.showModal({ title: '确认彻底删除', content: '将永久删除这只鹦鹉及其关联记录，无法恢复。', success: async (result) => { if (!result.confirm || this.data.submitting)
            return; this.setData({ submitting: true }); try {
            await store_1.store.deleteParrot(this.id);
            (0, navigation_1.backOrSwitchTab)();
        }
        catch (error) {
            wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
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
    async markForSale() { if (this.data.submitting)
        return; this.setData({ submitting: true }); try {
        await store_1.store.markIntroductionForSale(this.id);
        wx.showToast({ title: '已转为待售', icon: 'success' });
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
        await store_1.store.addSale({ parrotId: parrot.id, species: parrot.species, ringNumber: parrot.ringNumber, gender: parrot.gender, buyer: this.data.buyer, buyerContact: this.data.contact, date: (0, date_1.todayDate)(), price: Number(this.data.price), visitStatus: 'WAITING', image: parrot.image });
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
    async startProgress() { const parrot = this.data.parrot; const pair = store_1.store.getPair(parrot.activePairId) || store_1.store.pairs.find(item => item.maleId === parrot.id || item.femaleId === parrot.id); const mateId = parrot.mateId || (pair ? pair.maleId === parrot.id ? pair.femaleId : pair.maleId : ''); const mate = mateId ? store_1.store.getParrot(mateId) : null; const eggs = Number(this.data.eggCount); if (!mate) {
        wx.showToast({ title: '配对关系异常，请刷新后重试', icon: 'none' });
        await store_1.store.hydrate(true);
        return;
    } if (!Number.isInteger(eggs) || eggs < 1) {
        wx.showToast({ title: '请输入正确蛋数', icon: 'none' });
        return;
    } if (this.data.submitting)
        return; this.setData({ submitting: true }); try {
        await store_1.store.addHatching({ maleRingNumber: parrot.gender === types_1.GenderCode.MALE ? parrot.ringNumber : mate.ringNumber, femaleRingNumber: parrot.gender === types_1.GenderCode.FEMALE ? parrot.ringNumber : mate.ringNumber, maleId: parrot.gender === types_1.GenderCode.MALE ? parrot.id : mate.id, femaleId: parrot.gender === types_1.GenderCode.FEMALE ? parrot.id : mate.id, species: parrot.species, startDate: (0, date_1.todayDate)(), eggs, hatched: 0, status: 'INCUBATING' });
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
    viewClutchParrots(event) { const record = store_1.store.hatchingRecords.find(item => item.id === event.currentTarget.dataset.id); if (!record)
        return; if (!Number(record.offspringRegistered || 0)) {
        wx.showToast({ title: '本窝暂未录入幼鸟档案', icon: 'none' });
        return;
    } wx.setStorageSync('parrot-pro-filter-intent', { birthHatchingRecordId: record.id, label: `第${event.currentTarget.dataset.no}窝幼鸟`, timestamp: Date.now() }); wx.switchTab({ url: '/pages/parrots/parrots' }); },
    intakeChicks(event) { const record = store_1.store.hatchingRecords.find(item => item.id === event.currentTarget.dataset.id); if (!record || record.status !== 'COMPLETED' || record.hatched < 1)
        return; wx.navigateTo({ url: `/pages/clutch-intake/clutch-intake?id=${record.id}` }); },
    sharePublicUrl(token) { return `${String(config_1.API_BASE_URL || '').replace(/\/+$/, '')}/share/${encodeURIComponent(token)}`; },
    shareExpiryText(expiresAt) { return expiresAt ? `有效期至 ${String(expiresAt).slice(0, 10)}` : ''; },
    previewShare() { if (!this.data.shareToken)
        return; wx.navigateTo({ url: `/pages/share/share?token=${encodeURIComponent(this.data.shareToken)}` }); },
    copyShareLink() { if (!this.data.shareUrl)
        return; wx.setClipboardData({ data: this.data.shareUrl }); },
    async generateShare() { if (this.data.submitting)
        return; this.setData({ submitting: true }); try {
        const result = await store_1.store.createShareToken(this.id);
        this.saveShareState(result.token, result.expiresAt);
        this.setData({ shareToken: result.token, shareUrl: this.sharePublicUrl(result.token), shareExpiryLabel: this.shareExpiryText(result.expiresAt) });
        wx.showShareMenu({ menus: ['shareAppMessage'] });
        wx.showToast({ title: '分享链接已生成', icon: 'none' });
    }
    catch (error) {
        wx.showToast({ title: error.message || '分享生成失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    revokeShare() { const token = this.data.shareToken; if (!token || this.data.submitting)
        return; wx.showModal({ title: '撤销当前分享', content: '撤销后，已复制的链接和已转发的分享都会立即失效。', success: async (result) => { if (!result.confirm)
            return; this.setData({ submitting: true }); try {
            await store_1.store.revokeShareToken(token);
            this.clearShareState();
            this.setData({ shareToken: '', shareUrl: '', shareExpiryLabel: '' });
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
