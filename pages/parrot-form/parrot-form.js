"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
const cloud_1 = require("../../utils/cloud");
const navigation_1 = require("../../utils/navigation");
Page({
    data: { isEdit: false, id: '', media: [], showUrl: false, tempUrl: '', saving: false, uploading: false, form: { species: '', ringNumber: '', gender: types_1.GenderCode.UNKNOWN, price: '', birthDate: new Date().toISOString().slice(0, 10), publicIntro: '', privateNotes: '' }, genders: [{ key: types_1.GenderCode.MALE, label: '公 (Male)' }, { key: types_1.GenderCode.FEMALE, label: '母 (Female)' }, { key: types_1.GenderCode.UNKNOWN, label: '未验卡' }] },
    onLoad(options) {
        if (!options.id)
            return;
        const parrot = store_1.store.getParrot(options.id);
        if (parrot)
            this.setData({ isEdit: true, id: options.id, media: parrot.media || [], form: { species: parrot.species, ringNumber: parrot.ringNumber, gender: parrot.gender, price: String(parrot.price), birthDate: parrot.birthDate, publicIntro: parrot.publicIntro || '', privateNotes: parrot.privateNotes || '' } });
    },
    goBack() { (0, navigation_1.backOrSwitchTab)(); },
    input(event) { this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value }); },
    chooseGender(event) { this.setData({ 'form.gender': event.currentTarget.dataset.key }); },
    chooseDate(event) { this.setData({ 'form.birthDate': event.detail.value }); },
    async chooseMedia(event) {
        if (this.data.uploading)
            return;
        const kind = event.currentTarget.dataset.kind;
        try {
            const result = await wx.chooseMedia({ count: kind === 'local' ? 9 : 1, mediaType: kind === 'video' ? ['video'] : kind === 'image' ? ['image'] : ['image', 'video'], sourceType: kind === 'local' ? ['album'] : ['camera'] });
            this.setData({ uploading: true });
            const media = [];
            for (const item of result.tempFiles || []) {
                const type = item.fileType === 'video' ? 'video' : 'image';
                const asset = await (0, cloud_1.uploadMedia)(item.tempFilePath, type);
                media.push({ assetId: asset.assetId, type, fileID: asset.fileID, url: asset.fileID });
            }
            this.setData({ media: this.data.media.concat(media) });
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
    openUrl() { this.setData({ showUrl: true, tempUrl: '' }); },
    closeUrl() { this.setData({ showUrl: false }); },
    inputUrl(event) { this.setData({ tempUrl: event.detail.value }); },
    async addUrl() {
        const url = String(this.data.tempUrl || '').trim();
        if (!/^https:\/\//.test(url)) {
            wx.showToast({ title: '请输入 HTTPS 地址', icon: 'none' });
            return;
        }
        this.setData({ uploading: true });
        try {
            const asset = await (0, cloud_1.importRemoteMedia)(url);
            this.setData({ media: this.data.media.concat([{ assetId: asset.assetId, type: asset.type, fileID: asset.fileID, url: asset.fileID }]), showUrl: false });
        }
        catch (error) {
            wx.showToast({ title: error.message || 'URL 导入失败', icon: 'none' });
        }
        finally {
            this.setData({ uploading: false });
        }
    },
    removeMedia(event) { const media = this.data.media.slice(); media.splice(event.currentTarget.dataset.index, 1); this.setData({ media }); },
    async save() {
        const form = this.data.form;
        if (!form.species || !form.ringNumber || !form.birthDate) {
            wx.showToast({ title: '请填写关键信息', icon: 'none' });
            return;
        }
        if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
            wx.showToast({ title: '请输入正确价格', icon: 'none' });
            return;
        }
        if (this.data.saving || this.data.uploading)
            return;
        const normalized = String(form.ringNumber).replace(/\s+/g, '').toUpperCase();
        if (store_1.store.parrots.some(item => item.id !== this.data.id && item.ringNumber.replace(/\s+/g, '').toUpperCase() === normalized)) {
            wx.showToast({ title: '圈号已存在', icon: 'none' });
            return;
        }
        this.setData({ saving: true });
        const payload = { species: form.species, ringNumber: form.ringNumber, gender: form.gender, price: Number(form.price), birthDate: form.birthDate, media: this.data.media, publicIntro: form.publicIntro, privateNotes: form.privateNotes };
        try {
            if (this.data.isEdit)
                await store_1.store.updateParrot(this.data.id, payload);
            else
                await store_1.store.createParrot(payload);
            wx.showToast({ title: this.data.isEdit ? '档案已更新' : '档案已录入', icon: 'success' });
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
