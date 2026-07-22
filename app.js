"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloud_1 = require("./utils/cloud");
const repository_1 = require("./utils/repository");
const store_1 = require("./utils/store");
App({
    globalData: { ready: false, session: null, store: store_1.store },
    onLaunch(options) {
        (0, cloud_1.initApi)();
        if (String(options && options.path || '').replace(/^\//, '') === 'pages/share/share') {
            this.globalData.ready = true;
            return;
        }
        repository_1.repository.session().then(session => {
            this.globalData.session = session;
            this.globalData.ready = true;
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            if (session.authorized)
                store_1.store.hydrate();
            else if (!current || current.route !== 'pages/share/share')
                wx.reLaunch({ url: `/pages/unauthorized/unauthorized?configured=${session.configured ? '1' : '0'}&openId=${encodeURIComponent(session.openId || '')}` });
        }).catch((error) => {
            this.globalData.ready = true;
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const reason = encodeURIComponent(error && error.message || error && error.code || '无法连接服务器');
            if (!current || current.route !== 'pages/share/share')
                wx.reLaunch({ url: `/pages/unauthorized/unauthorized?unavailable=1&reason=${reason}` });
        });
    },
    onShow() {
        const session = repository_1.repository.currentSession();
        if (session && session.authorized)
            store_1.store.hydrate();
    },
    onShareAppMessage() { return { title: 'Parrot Pro 鹦鹉专业管理', path: '/pages/home/home' }; }
});
