"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repository_1 = require("../../utils/repository");
Page({
    data: { title: '申请访问权限', detail: '当前微信账号还未加入管理名单。', eyebrow: 'ACCESS REQUIRED', openId: '', accessStatus: 'none', note: '', requestNote: '', reviewNote: '', submitting: false, configured: true, unavailable: false, cta: '申请访问权限', helper: '复制 OpenID 发给管理员，或直接提交申请。' },
    onLoad(options) {
        const configured = options.configured === '1';
        const unavailable = options.unavailable === '1';
        const reason = decodeURIComponent(options.reason || '');
        const accessStatus = decodeURIComponent(options.accessStatus || 'none');
        const openId = decodeURIComponent(options.openId || '');
        const requestNote = decodeURIComponent(options.requestNote || '');
        const reviewNote = decodeURIComponent(options.reviewNote || '');
        if (unavailable)
            this.setData({
                unavailable: true,
                title: '服务暂不可用',
                detail: '当前小程序没有成功连到 API。后端健康检查正常，优先检查微信合法域名、TLS 和当前网络。',
                eyebrow: 'SERVICE UNAVAILABLE',
                cta: '重新尝试',
                helper: reason ? `请求错误：${reason}` : '确认 Worker 已部署、域名已在微信后台配置为 request 合法域名，并开启 HTTPS。'
            });
        else if (!configured)
            this.setData({ configured: false, title: '主账号未配置', detail: '复制下面的 OpenID，填入 Worker 的 OWNER_OPENID 后重新部署。', eyebrow: 'OWNER SETUP', openId, cta: '复制 OpenID', helper: '配置完成后重新进入即可。' });
        else if (accessStatus === 'pending')
            this.setData({ accessStatus, openId, requestNote, title: '申请审核中', detail: '管理员正在审核你的访问申请，审核通过后重新进入即可。', eyebrow: 'REQUEST PENDING', cta: '查看申请状态', helper: requestNote ? `申请备注：${requestNote}` : '你也可以把 OpenID 发给管理员加快处理。' });
        else if (accessStatus === 'rejected')
            this.setData({ accessStatus, openId, requestNote, reviewNote, title: '申请未通过', detail: '你可以补充备注后重新提交申请，管理员会再次收到待审批记录。', eyebrow: 'REQUEST REJECTED', cta: '重新提交申请', helper: reviewNote ? `拒绝原因：${reviewNote}` : '可补充用途说明后重新提交。' });
        else
            this.setData({ accessStatus, openId, requestNote, title: '申请访问权限', detail: '当前微信账号未获得授权，可直接提交申请给管理员审批。', eyebrow: 'ACCESS REQUIRED', cta: '申请访问权限', helper: '也可以先复制 OpenID 发给管理员。' });
    },
    inputNote(event) { this.setData({ note: event.detail.value }); },
    copyOpenId() { if (this.data.openId)
        wx.setClipboardData({ data: this.data.openId }); },
    async submitRequest() {
        if (this.data.unavailable) {
            wx.reLaunch({ url: '/pages/home/home' });
            return;
        }
        if (!this.data.configured) {
            this.copyOpenId();
            return;
        }
        if (this.data.submitting || this.data.accessStatus === 'pending')
            return;
        const note = String(this.data.note || '').trim();
        if (!note) {
            wx.showToast({ title: '请先填写申请备注', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        try {
            await repository_1.repository.requestAccess(note);
            const session = await repository_1.repository.refreshSession();
            getApp().globalData.session = session;
            this.setData({ accessStatus: session.accessStatus, requestNote: session.requestNote || note, reviewNote: session.reviewNote || '', title: '申请审核中', detail: '管理员正在审核你的访问申请，审核通过后重新进入即可。', eyebrow: 'REQUEST PENDING', cta: '查看申请状态', helper: `申请备注：${session.requestNote || note}`, note: '' });
            wx.showToast({ title: '申请已提交', icon: 'success' });
        }
        catch (error) {
            wx.showToast({ title: error.message || '提交失败', icon: 'none' });
        }
        finally {
            this.setData({ submitting: false });
        }
    }
});
