const tabs = [
    { pagePath: 'pages/home/home', label: '概览', icon: 'compass' },
    { pagePath: 'pages/parrots/parrots', label: '档案', icon: 'feather' },
    { pagePath: 'pages/breeding/breeding', label: '育种', icon: 'orbit' },
    { pagePath: 'pages/hatching/hatching', label: '孵化', icon: 'stat-hatching' }
];
Component({
    options: { styleIsolation: 'isolated' },
    data: { tabs, selected: 0, hidden: false },
    attached() { this.updateSelected(); },
    detached() { if (this.tabTapTimer)
        clearTimeout(this.tabTapTimer); },
    pageLifetimes: { show() { this.updateSelected(); } },
    methods: {
        updateSelected() {
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const route = current ? current.route : '';
            const selected = tabs.findIndex(tab => route === tab.pagePath);
            this.setData({ selected: selected < 0 ? 0 : selected });
        },
        switchTab(event) {
            if (this.tabTapTimer)
                return;
            this.tabTapTimer = setTimeout(() => { this.tabTapTimer = null; }, 500);
            const path = String(event.currentTarget.dataset.path || '');
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            if ((current === null || current === void 0 ? void 0 : current.route) === path) {
                if (typeof current.refreshFromTab === 'function')
                    current.refreshFromTab();
                return;
            }
            wx.switchTab({ url: `/${path}` });
        }
    },
    tabTapTimer: null
});
