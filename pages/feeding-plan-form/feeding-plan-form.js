"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const navigation_1 = require("../../utils/navigation");
const repository_1 = require("../../utils/repository");
const store_1 = require("../../utils/store");
const emptyForm = () => ({ name: '', species: '', stage: '无毛雏鸟', ageFromMonths: '0', ageFromDays: '0', ageToMonths: '1', ageToDays: '0', feedingType: 'FORMULA', formulaName: '', waterMl: '', powderScoops: '', temperatureMin: '38', temperatureMax: '40', feedingsPerDay: '', amountMl: '', feedingMethod: '针管', temperatureCheck: '', preparationNotes: '', seedFoodName: '', seedFoodAmount: '', seedFoodNotes: '', feedingNotes: '', fullnessNotes: '', warningNotes: '' });
const numberKeys = new Set(['ageFromMonths', 'ageFromDays', 'ageToMonths', 'ageToDays', 'waterMl', 'temperatureMin', 'temperatureMax', 'feedingsPerDay']);
Page({
    data: { form: emptyForm(), plan: null, isEdit: false, submitting: false, step: 1, breedOptions: [] },
    async onLoad(options) {
        if (!options.id)
            return;
        try {
            const plan = (await repository_1.repository.feedingPlans()).find((item) => item.id === options.id);
            if (!plan) {
                wx.showToast({ title: '方案不存在或已删除', icon: 'none' });
                return;
            }
            if (plan.isEnabled) {
                wx.showToast({ title: '请先关闭方案后再编辑', icon: 'none' });
                setTimeout(() => (0, navigation_1.backOrSwitchTab)('/pages/feeding-plans/feeding-plans'), 400);
                return;
            }
            this.setData({ plan, isEdit: true, form: Object.keys(emptyForm()).reduce((result, key) => { var _a; return ({ ...result, [key]: String((_a = plan[key]) !== null && _a !== void 0 ? _a : '') }); }, {}) });
        }
        catch (error) {
            wx.showToast({ title: error.message || '加载方案失败', icon: 'none' });
        }
    },
    onShow() { this.refreshBreedOptions(); },
    goBack() { if (!this.data.submitting)
        (0, navigation_1.backOrSwitchTab)('/pages/feeding-plans/feeding-plans'); },
    input(event) { const key = event.currentTarget.dataset.key, value = event.detail.value; this.setData({ [`form.${key}`]: value }); if (key === 'species')
        this.refreshBreedOptions(value); },
    refreshBreedOptions(keyword = this.data.form.species) { const normalized = String(keyword || '').trim().toLowerCase(), breedOptions = [...new Set(store_1.store.parrots.map(item => String(item.breed || '').trim()).filter(Boolean))].filter(item => !normalized || item.toLowerCase().includes(normalized)).slice(0, 8); this.setData({ breedOptions }); },
    focusBreed() { this.refreshBreedOptions(); },
    chooseBreed(event) { this.setData({ 'form.species': event.currentTarget.dataset.value, breedOptions: [] }); },
    chooseFeedingType(event) { this.setData({ 'form.feedingType': event.currentTarget.dataset.type }); },
    goStep(event) { const step = Number(event.currentTarget.dataset.step); if (step >= 1 && step <= 3)
        this.setData({ step }); },
    previousStep() { if (this.data.step > 1)
        this.setData({ step: this.data.step - 1 }); },
    nextStep() {
        const form = this.data.form;
        if (this.data.step === 1 && (!form.name || !form.species || !form.stage)) {
            wx.showToast({ title: '请填写方案名称、品种和阶段', icon: 'none' });
            return;
        }
        if (this.data.step < 3)
            this.setData({ step: this.data.step + 1 });
        else
            this.save();
    },
    async save() {
        const form = this.data.form;
        if (!form.name || !form.species || !form.stage || this.data.submitting)
            return;
        const input = { ...form };
        numberKeys.forEach(key => input[key] = Number(input[key] || 0));
        this.setData({ submitting: true });
        try {
            if (this.data.isEdit)
                await repository_1.repository.updateFeedingPlan(this.data.plan, input);
            else
                await repository_1.repository.createFeedingPlan(input);
            wx.showToast({ title: '方案已保存', icon: 'success' });
            setTimeout(() => (0, navigation_1.backOrSwitchTab)('/pages/feeding-plans/feeding-plans'), 500);
        }
        catch (error) {
            wx.showToast({ title: error.message || '保存失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        }
    },
    remove() {
        if (!this.data.plan || this.data.submitting)
            return;
        if (this.data.plan.isEnabled) {
            wx.showToast({ title: '请先关闭方案后再删除', icon: 'none' });
            return;
        }
        wx.showModal({ title: '删除喂养方案', content: '删除后无法恢复，已关联的鸟将自动解除该方案。确认删除？', success: async (result) => {
                if (!result.confirm)
                    return;
                this.setData({ submitting: true });
                try {
                    await repository_1.repository.deleteFeedingPlan(this.data.plan);
                    wx.showToast({ title: '已删除', icon: 'success' });
                    setTimeout(() => (0, navigation_1.backOrSwitchTab)('/pages/feeding-plans/feeding-plans'), 500);
                }
                catch (error) {
                    wx.showToast({ title: error.message || '删除失败', icon: 'none' });
                }
                finally {
                    this.setData({ submitting: false });
                }
            } });
    }
});
