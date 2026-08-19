"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
const store_1 = require("../../utils/store");
const navigation_1 = require("../../utils/navigation");
const genders = [types_1.GenderCode.MALE, types_1.GenderCode.FEMALE, types_1.GenderCode.UNKNOWN].map(key => ({ key, label: types_1.GENDER_LABEL[key] }));
Page({
    data: { record: null, father: null, mother: null, birthDateLabel: '', chicks: [], genders, submitting: false, loaded: false },
    onLoad(options) { this.id = String(options.id || ''); this.unsubscribe = store_1.store.subscribe(() => this.refresh()); store_1.store.hydrate(); this.refresh(); },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    refresh() { const record = store_1.store.hatchingRecords.find(item => item.id === this.id); if (!record)
        return; const father = store_1.store.getParrot(record.maleId), mother = store_1.store.getParrot(record.femaleId), birthDateLabel = String(record.completedAt || record.startDate || '').slice(0, 10); if (!this.data.loaded)
        this.setData({ record, father, mother, birthDateLabel, chicks: this.initialChicks(record), loaded: true });
    else
        this.setData({ record, father, mother, birthDateLabel }); },
    initialChicks(record) { const species = (record.offspringGroups || []).flatMap(group => Array.from({ length: group.count }, () => group.species)); return Array.from({ length: record.hatched }, (_item, index) => ({ index: index + 1, species: species[index] || record.species || '', ringNumber: '', gender: types_1.GenderCode.UNKNOWN, price: '', privateNotes: '' })); },
    input(event) { const index = Number(event.currentTarget.dataset.index), key = event.currentTarget.dataset.key; this.setData({ [`chicks[${index}].${key}`]: event.detail.value }); },
    chooseGender(event) { const index = Number(event.currentTarget.dataset.index); this.setData({ [`chicks[${index}].gender`]: event.currentTarget.dataset.gender }); },
    async submit() { if (this.data.submitting || !this.data.record)
        return; if (this.data.chicks.some(item => !String(item.species || '').trim())) {
        wx.showToast({ title: '请填写每只幼鸟的品种', icon: 'none' });
        return;
    } this.setData({ submitting: true }); try {
        const result = await store_1.store.createFromClutch(this.id, this.data.chicks);
        wx.showToast({ title: `已录入${result.ids.length}只幼鸟`, icon: 'success' });
        setTimeout(() => (0, navigation_1.backOrSwitchTab)('/pages/hatching/hatching'), 500);
    }
    catch (error) {
        wx.showToast({ title: error.message || '录入失败', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    goBack() { (0, navigation_1.backOrSwitchTab)('/pages/hatching/hatching'); },
    id: '',
    unsubscribe: null
});
