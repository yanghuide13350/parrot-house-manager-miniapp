const tabs = [
    { pagePath: 'pages/home/home', label: '概览', icon: 'compass' },
    { pagePath: 'pages/parrots/parrots', label: '种群', icon: 'feather' },
    { pagePath: 'pages/breeding/breeding', label: '育种', icon: 'orbit' },
    { pagePath: 'pages/hatching/hatching', label: '孵化', icon: 'activity' }
];
Component({
    options: { styleIsolation: 'isolated' },
    data: { tabs, selected: 0, hidden: false },
    attached() { this.updateSelected(); },
    pageLifetimes: { show() { this.updateSelected(); } },
    methods: {
        updateSelected() {
            const pages = getCurrentPages();
            const current = pages[pages.length - 1];
            const route = current ? current.route : '';
            const selected = tabs.findIndex(tab => route === tab.pagePath);
            this.setData({ selected: selected < 0 ? 0 : selected });
        },
        switchTab(event) { wx.switchTab({ url: `/${event.currentTarget.dataset.path}` }); }
    }
});
