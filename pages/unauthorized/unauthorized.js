Page({
    data: { title: '无管理权限', detail: '当前微信账号不是已配置的养殖场主账号。', openId: '' },
    onLoad(options) {
        if (options.unavailable === '1')
            this.setData({ title: '服务暂不可用', detail: '无法连接 Cloudflare API，请检查域名、HTTPS 和 Worker 部署配置。' });
        else if (options.configured !== '1')
            this.setData({ title: '主账号未配置', detail: '复制下面的 OpenID，填入 Worker 的 OWNER_OPENID 后重新部署。', openId: decodeURIComponent(options.openId || '') });
    },
    copyOpenId() { if (this.data.openId)
        wx.setClipboardData({ data: this.data.openId }); }
});
