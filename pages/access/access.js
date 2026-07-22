"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const navigation_1 = require("../../utils/navigation");
const repository_1 = require("../../utils/repository");
const store_1 = require("../../utils/store");
function mapPending(list = []) {
    return list.map((item) => ({
        ...item,
        requestedDate: String(item.requestedAt || '').slice(0, 16).replace('T', ' '),
        openIdShort: shortenOpenId(item.openId)
    }));
}
function mapGrants(list = []) {
    return list.map((item) => {
        const isEnv = item.source === 'env';
        const isAdmin = item.role === 'ADMIN';
        const createdDate = item.createdAt ? String(item.createdAt).slice(0, 16).replace('T', ' ') : '';
        const requestedDate = item.requestedAt ? String(item.requestedAt).slice(0, 16).replace('T', ' ') : '';
        return {
            ...item,
            isEnv,
            isAdmin,
            openIdShort: shortenOpenId(item.openId),
            roleLabel: isAdmin ? '管理员' : '普通用户',
            sourceLabel: isEnv ? '来源：环境变量' : '来源：审批授权',
            createdLabel: createdDate ? `添加时间：${createdDate}` : (isEnv ? '添加时间：无' : '添加时间：暂无'),
            requestedLabel: requestedDate ? `申请时间：${requestedDate}` : '',
            displayNote: isEnv ? '' : (item.requestNote || item.note || ''),
            grantMeta: isEnv ? '环境变量同步 · 可在线撤销' : (createdDate ? `添加时间：${createdDate}` : '已授权')
        };
    });
}
function shortenOpenId(openId = '') {
    const value = String(openId || '');
    if (value.length <= 18)
        return value;
    return `${value.slice(0, 10)}…${value.slice(-6)}`;
}
Page({
    data: {
        policyOpenAccess: false,
        roleLabel: '普通用户',
        pending: [],
        grants: [],
        sessionRole: 'NONE',
        loading: false,
        processing: '',
        rejectingId: '',
        rejectReason: ''
    },
    onLoad() {
        this.unsubscribe = store_1.store.subscribe(() => {
            const role = store_1.store.session && store_1.store.session.role || 'NONE';
            this.setData({ sessionRole: role, roleLabel: roleText(role) });
        });
        const role = store_1.store.session && store_1.store.session.role || 'NONE';
        this.setData({ sessionRole: role, roleLabel: roleText(role) });
        this.reload();
    },
    onUnload() { if (this.unsubscribe)
        this.unsubscribe(); },
    async onPullDownRefresh() {
        await this.reload();
        wx.stopPullDownRefresh();
    },
    applyList(result) {
        this.setData({
            policyOpenAccess: Boolean(result.policy && result.policy.openAccess),
            pending: mapPending(result.pending),
            grants: mapGrants(result.grants)
        });
    },
    async reload() {
        this.setData({ loading: true });
        try {
            this.applyList(await repository_1.repository.accessList());
        }
        catch (error) {
            wx.showToast({ title: error.message || '加载失败', icon: 'none' });
        }
        finally {
            this.setData({ loading: false });
        }
    },
    copyOpenId(event) {
        const openId = event.currentTarget.dataset.openid;
        if (!openId)
            return;
        wx.setClipboardData({ data: openId });
    },
    async approve(event) {
        const requestId = event.currentTarget.dataset.id;
        const note = event.currentTarget.dataset.note || '';
        if (!requestId || this.data.processing)
            return;
        this.setData({ processing: requestId });
        try {
            this.applyList(await repository_1.repository.approveAccess(requestId, note));
            wx.showToast({ title: '已同意申请', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '操作失败', icon: 'none' });
        }
        finally {
            this.setData({ processing: '' });
        }
    },
    openReject(event) { this.setData({ rejectingId: event.currentTarget.dataset.id, rejectReason: '' }); },
    closeReject() { if (!this.data.processing)
        this.setData({ rejectingId: '', rejectReason: '' }); },
    inputRejectReason(event) { this.setData({ rejectReason: event.detail.value }); },
    async confirmReject() {
        if (!this.data.rejectingId || this.data.processing)
            return;
        this.setData({ processing: this.data.rejectingId });
        try {
            this.applyList(await repository_1.repository.rejectAccess(this.data.rejectingId, this.data.rejectReason));
            this.setData({ rejectingId: '', rejectReason: '' });
            wx.showToast({ title: '已拒绝申请', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '操作失败', icon: 'none' });
        }
        finally {
            this.setData({ processing: '' });
        }
    },
    async revoke(event) {
        const openId = event.currentTarget.dataset.openid;
        if (!openId || this.data.processing)
            return;
        const confirmed = await new Promise((resolve) => {
            wx.showModal({
                title: '撤销权限',
                content: '撤销后该账号将无法进入管理系统，确认继续？',
                success: (result) => resolve(Boolean(result.confirm)),
                fail: () => resolve(false)
            });
        });
        if (!confirmed)
            return;
        this.setData({ processing: openId });
        try {
            this.applyList(await repository_1.repository.revokeMember(openId));
            wx.showToast({ title: '已撤销权限', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '操作失败', icon: 'none' });
        }
        finally {
            this.setData({ processing: '' });
        }
    },
    async toggleAdmin(event) {
        const openId = event.currentTarget.dataset.openid;
        const mode = event.currentTarget.dataset.mode;
        if (!openId || !mode || this.data.processing)
            return;
        this.setData({ processing: `${mode}:${openId}` });
        try {
            this.applyList(mode === 'set' ? await repository_1.repository.setAdmin(openId) : await repository_1.repository.unsetAdmin(openId));
            wx.showToast({ title: mode === 'set' ? '已设为管理员' : '已降为普通用户', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '操作失败', icon: 'none' });
        }
        finally {
            this.setData({ processing: '' });
        }
    },
    async togglePolicy(event) {
        const next = event.detail.value;
        if (this.data.processing)
            return;
        this.setData({ processing: 'policy' });
        try {
            this.applyList(await repository_1.repository.setAccessPolicy(Boolean(next)));
            wx.showToast({ title: next ? '已开启免申请访问' : '已恢复申请制', icon: 'success' });
        }
        catch (error) {
            this.setData({ policyOpenAccess: !next });
            wx.showToast({ title: error.message || '操作失败', icon: 'none' });
        }
        finally {
            this.setData({ processing: '' });
        }
    },
    goBack() { (0, navigation_1.backOrSwitchTab)('/pages/home/home'); },
    noop() { },
    unsubscribe: null
});
function roleText(role) {
    if (role === 'OWNER')
        return '主账号';
    if (role === 'ADMIN')
        return '管理员';
    if (role === 'MEMBER')
        return '普通用户';
    return '未授权';
}
