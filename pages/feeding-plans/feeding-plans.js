"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const navigation_1 = require("../../utils/navigation");
const repository_1 = require("../../utils/repository");
Page({
    data: { plans: [], submitting: false },
    onShow() { this.reload(); },
    async reload() { try {
        const plans = await repository_1.repository.feedingPlans();
        this.setData({ plans: plans.map((item) => ({ ...item, ageLabel: `${item.ageFromMonths || 0}月${item.ageFromDays || 0}天–${item.ageToMonths || 0}月${item.ageToDays || 0}天`, foodLabel: item.feedingType === 'MIXED' ? '奶粉 + 谷子' : item.feedingType === 'SOLID' ? (item.seedFoodName || '谷子 / 固体食物') : (item.formulaName || '奶粉喂养') })) });
    }
    catch (error) {
        wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    } },
    goBack() { (0, navigation_1.backOrSwitchTab)(); },
    openCreate() { wx.navigateTo({ url: '/pages/feeding-plan-form/feeding-plan-form' }); },
    openEdit(event) { const plan = this.data.plans.find((item) => item.id === event.currentTarget.dataset.id); if (!plan)
        return; if (plan.isEnabled) {
        wx.showToast({ title: '请先关闭方案后再编辑', icon: 'none' });
        return;
    } ; wx.navigateTo({ url: `/pages/feeding-plan-form/feeding-plan-form?id=${plan.id}` }); },
    preview(event) { wx.navigateTo({ url: `/pages/feeding-plan-view/feeding-plan-view?id=${event.currentTarget.dataset.id}` }); },
    async toggleEnabled(event) { const plan = this.data.plans.find((item) => item.id === event.currentTarget.dataset.id), enabled = Boolean(event.detail.value); if (!plan || this.data.submitting)
        return; this.setData({ submitting: true }); try {
        await repository_1.repository.setFeedingPlanEnabled(plan, enabled);
        await this.reload();
        wx.showToast({ title: enabled ? '方案已开启' : '方案已关闭', icon: 'success' });
    }
    catch (error) {
        await this.reload();
        wx.showToast({ title: error.message || '无法开启方案', icon: 'none' });
    }
    finally {
        this.setData({ submitting: false });
    } },
    remove(event) { const plan = this.data.plans.find((item) => item.id === event.currentTarget.dataset.id); if (!plan || this.data.submitting)
        return; if (plan.isEnabled) {
        wx.showToast({ title: '请先关闭方案后再删除', icon: 'none' });
        return;
    } ; wx.showModal({ title: '删除喂养方案', content: '删除后无法恢复，已关联的鸟将自动解除该方案。确认删除？', success: async (result) => { if (!result.confirm)
            return; this.setData({ submitting: true }); try {
            await repository_1.repository.deleteFeedingPlan(plan);
            await this.reload();
            wx.showToast({ title: '已删除', icon: 'success' });
        }
        catch (error) {
            await this.reload();
            wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        } } }); },
});
