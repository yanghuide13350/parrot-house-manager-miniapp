"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
const cloud_1 = require("../../utils/cloud");
const navigation_1 = require("../../utils/navigation");
const date_1 = require("../../utils/date");
Page({
    data: { isEdit: false, introductionMode: false, id: '', media: [], saving: false, uploading: false, focusedParentField: '', breedOptions: [], form: { breed: '', species: '', ringNumber: '', gender: types_1.GenderCode.UNKNOWN, price: '', birthDate: (0, date_1.todayDate)(), purchaseDate: (0, date_1.todayDate)(), publicIntro: '', privateNotes: '' }, father: null, mother: null, maleCandidates: [], femaleCandidates: [], genders: [{ key: types_1.GenderCode.MALE, label: '公 (Male)' }, { key: types_1.GenderCode.FEMALE, label: '母 (Female)' }, { key: types_1.GenderCode.UNKNOWN, label: '未验卡' }] },
    onLoad(options) {
        const introductionMode = options.mode === 'introduction';
        this.setData({ introductionMode });
        if (!options.id)
            return;
        const parrot = store_1.store.getParrot(options.id);
        if (parrot)
            this.setData({ isEdit: true, introductionMode: parrot.recordSource === 'INTRODUCTION', id: options.id, media: parrot.media || [], father: parrot.father || null, mother: parrot.mother || null, form: { breed: parrot.breed || '', species: parrot.species, ringNumber: parrot.ringNumber, gender: parrot.gender, price: String(parrot.price), birthDate: parrot.birthDate, purchaseDate: parrot.purchaseDate || (0, date_1.todayDate)(), publicIntro: parrot.publicIntro || '', privateNotes: parrot.privateNotes || '' } });
    },
    onShow() { this.refreshCandidates(); },
    refreshCandidates() {
        const available = store_1.store.parrots.filter(item => item.id !== this.data.id).map(item => ({ ...item, label: `${item.species}｜${item.ringNumber}` }));
        this.setData({ maleCandidates: available.filter(item => item.gender === types_1.GenderCode.MALE), femaleCandidates: available.filter(item => item.gender === types_1.GenderCode.FEMALE) });
        this.refreshBreedOptions();
    },
    goBack() { (0, navigation_1.backOrSwitchTab)(); },
    refreshBreedOptions(keyword = this.data.form.breed) {
        const normalized = String(keyword || '').trim().toLowerCase();
        const breedOptions = [...new Set(store_1.store.parrots.map(item => String(item.breed || '').trim()).filter(Boolean))].filter(item => !normalized || item.toLowerCase().includes(normalized)).slice(0, 8);
        this.setData({ breedOptions });
    },
    input(event) { const key = event.currentTarget.dataset.key, value = event.detail.value; this.setData({ [`form.${key}`]: value }); if (key === 'breed')
        this.refreshBreedOptions(value); },
    focusBreed() { this.refreshBreedOptions(); },
    chooseBreed(event) { this.setData({ 'form.breed': event.currentTarget.dataset.value, breedOptions: [] }); },
    chooseGender(event) { this.setData({ 'form.gender': event.currentTarget.dataset.key }); },
    chooseDate(event) { this.setData({ 'form.birthDate': event.detail.value }); },
    choosePurchaseDate(event) { this.setData({ 'form.purchaseDate': event.detail.value }); },
    chooseParent(event) {
        const role = event.currentTarget.dataset.role;
        const candidates = role === 'father' ? this.data.maleCandidates : this.data.femaleCandidates;
        const parent = candidates[Number(event.detail.value)];
        if (parent)
            this.setData({ [role]: { source: 'LIBRARY', id: parent.id, species: parent.species, ringNumber: parent.ringNumber } });
    },
    inputManualParent(event) {
        const role = event.currentTarget.dataset.role, key = event.currentTarget.dataset.key;
        const current = this.data[role] || { source: 'MANUAL', species: '', ringNumber: '' };
        // 修改带入内容即转为手工资料，避免关联的库内档案被误改。
        this.setData({ [role]: { ...current, source: 'MANUAL', id: null, [key]: event.detail.value } });
    },
    focusParentField(event) { this.setData({ focusedParentField: event.currentTarget.dataset.focus }); },
    blurParentField() { this.setData({ focusedParentField: '' }); },
    clearParent(event) { this.setData({ [event.currentTarget.dataset.role]: null }); },
    async chooseMedia(event) {
        if (this.data.uploading)
            return;
        const kind = event.currentTarget.dataset.kind;
        try {
            const result = await wx.chooseMedia({ count: kind === 'local' ? 9 : 1, mediaType: ['image', 'video'], sourceType: kind === 'local' ? ['album'] : ['camera'] });
            const selected = (result.tempFiles || []).map((item, index) => ({ filePath: item.tempFilePath, type: item.fileType === 'video' ? 'video' : 'image', placeholderId: `uploading-${Date.now()}-${index}` }));
            if (!selected.length)
                return;
            const placeholders = selected.map(item => ({ assetId: item.placeholderId, type: item.type, url: '', uploading: true }));
            this.setData({ media: this.data.media.concat(placeholders), uploading: true });
            let failed = 0;
            for (const item of selected) {
                try {
                    const asset = await (0, cloud_1.uploadMedia)(item.filePath, item.type);
                    const media = this.data.media.map((current) => current.assetId === item.placeholderId ? { assetId: asset.assetId, type: item.type, fileID: asset.fileID, url: asset.fileID } : current);
                    this.setData({ media });
                }
                catch (_a) {
                    failed += 1;
                    this.setData({ media: this.data.media.filter((current) => current.assetId !== item.placeholderId) });
                }
            }
            if (failed)
                wx.showToast({ title: failed === selected.length ? '媒体上传失败' : `${failed} 个媒体上传失败`, icon: 'none' });
        }
        catch (error) {
            if (error && error.errMsg && error.errMsg.includes('cancel'))
                return;
            wx.showToast({ title: error.message || '媒体上传失败', icon: 'none' });
        }
        finally {
            this.setData({ uploading: false });
        }
    },
    removeMedia(event) { const media = this.data.media.slice(); media.splice(event.currentTarget.dataset.index, 1); this.setData({ media }); },
    previewMedia(event) {
        const item = this.data.media[Number(event.currentTarget.dataset.index)];
        if (!item || !item.url)
            return;
        if (item.type === 'image') {
            const urls = this.data.media.filter((media) => media.type === 'image' && media.url).map((media) => media.url);
            wx.previewImage({ current: item.url, urls });
            return;
        }
        wx.previewMedia({ current: 0, sources: [{ url: item.url, type: 'video', poster: item.poster || '' }] });
    },
    async save() {
        const form = this.data.form;
        if (!form.breed || !form.species || !form.birthDate) {
            wx.showToast({ title: '请填写品种、名称和出生日期', icon: 'none' });
            return;
        }
        if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
            wx.showToast({ title: '请输入正确价格', icon: 'none' });
            return;
        }
        if (this.data.saving || this.data.uploading)
            return;
        const normalized = String(form.ringNumber).replace(/\s+/g, '').toUpperCase();
        if (normalized && store_1.store.parrots.some(item => item.id !== this.data.id && item.ringNumber.replace(/\s+/g, '').toUpperCase() === normalized)) {
            wx.showToast({ title: '圈号已存在', icon: 'none' });
            return;
        }
        if (!this.data.introductionMode && (!this.data.father || !this.data.mother || !this.data.father.species || !this.data.mother.species)) {
            wx.showToast({ title: '请配置父鸟和母鸟', icon: 'none' });
            return;
        }
        const complete = { breed: form.breed, species: form.species, ringNumber: form.ringNumber, gender: form.gender, price: Number(form.price), birthDate: form.birthDate, purchaseDate: form.purchaseDate, media: this.data.media, publicIntro: form.publicIntro, privateNotes: form.privateNotes, father: this.data.father, mother: this.data.mother };
        let payload = complete;
        if (this.data.isEdit) {
            const current = store_1.store.getParrot(this.data.id);
            if (!current) {
                wx.showToast({ title: '档案不存在，请刷新后重试', icon: 'none' });
                return;
            }
            payload = {};
            for (const key of ['breed', 'species', 'ringNumber', 'gender', 'birthDate', 'purchaseDate', 'publicIntro', 'privateNotes', 'father', 'mother'])
                if (JSON.stringify(complete[key]) !== JSON.stringify(current[key]))
                    payload[key] = complete[key];
            if (complete.price !== current.price)
                payload.price = complete.price;
            const mediaKey = (items) => JSON.stringify(items.map(item => ({ assetId: item.assetId, type: item.type })));
            if (mediaKey(complete.media) !== mediaKey(current.media || []))
                payload.media = complete.media;
            if (!Object.keys(payload).length) {
                wx.showToast({ title: '没有需要保存的修改', icon: 'none' });
                return;
            }
        }
        this.setData({ saving: true });
        try {
            if (this.data.isEdit)
                await store_1.store.updateParrot(this.data.id, payload);
            else if (this.data.introductionMode)
                await store_1.store.createIntroduction(payload);
            else
                await store_1.store.createParrot(payload);
            wx.showToast({ title: this.data.isEdit ? '档案已更新' : this.data.introductionMode ? '引种鸟已录入' : '档案已录入', icon: 'success' });
            (0, navigation_1.backOrSwitchTab)();
        }
        catch (error) {
            wx.showToast({ title: error.message || '保存失败', icon: 'none' });
        }
        finally {
            this.setData({ saving: false });
        }
    }
});
