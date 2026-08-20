"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const navigation_1 = require("../../utils/navigation");
const repository_1 = require("../../utils/repository");
const foodLabel = (plan) => plan.feedingType === 'MIXED' ? '奶粉 + 谷子' : plan.feedingType === 'SOLID' ? '谷子 / 固体食物' : '奶粉喂养';
Page({
    data: { plan: null },
    async onLoad(options) {
        try {
            const plan = (await repository_1.repository.feedingPlans()).find((item) => item.id === options.id);
            if (!plan) {
                wx.showToast({ title: '方案不存在或已删除', icon: 'none' });
                return;
            }
            this.setData({ plan: { ...plan, ageLabel: `${plan.ageFromMonths || 0}月${plan.ageFromDays || 0}天–${plan.ageToMonths || 0}月${plan.ageToDays || 0}天`, foodLabel: foodLabel(plan) } });
        }
        catch (error) {
            wx.showToast({ title: error.message || '加载方案失败', icon: 'none' });
        }
    },
    goBack() { (0, navigation_1.backOrSwitchTab)('/pages/feeding-plans/feeding-plans'); },
    edit() { if (!this.data.plan)
        return; if (this.data.plan.isEnabled) {
        wx.showToast({ title: '请先关闭方案后再编辑', icon: 'none' });
        return;
    } ; wx.navigateTo({ url: `/pages/feeding-plan-form/feeding-plan-form?id=${this.data.plan.id}` }); },
    copy() {
        const item = this.data.plan;
        if (!item)
            return;
        const mixed = item.feedingType === 'MIXED', solid = item.feedingType === 'SOLID';
        const lines = [`【${item.species}喂养方案】`, `适用阶段：${item.stage}（${item.ageLabel}）`, `食物方案：${item.foodLabel}`, `每天：${item.feedingsPerDay || '请按说明'}次；单次：${item.amountMl || '请按说明'}`];
        if (!solid)
            lines.push(`奶粉：${item.formulaName || '请按说明'}`, `冲泡：${item.waterMl || '—'}ml 水 + ${item.powderScoops || '—'}`, `水温：${item.temperatureMin}–${item.temperatureMax}℃`, `水温判断：${item.temperatureCheck || '请按说明'}`, `冲泡说明：${item.preparationNotes || '请按说明'}`);
        if (mixed || solid)
            lines.push(`谷子/固体食物：${item.seedFoodName || '请按说明'}`, `参考量：${item.seedFoodAmount || '请按说明'}`, `说明：${item.seedFoodNotes || '请按说明'}`);
        lines.push(`喂养方式：${item.feedingMethod || '请按说明'}`, `操作与注意：${item.feedingNotes || '请按说明'}`, `喂饱判断：${item.fullnessNotes || '请按说明'}`, `异常提醒：${item.warningNotes || '如有异常请及时联系卖家或兽医'}`);
        wx.setClipboardData({ data: lines.join('\n') });
    }
});
