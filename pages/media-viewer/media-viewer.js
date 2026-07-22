Page({
    data: { url: '', poster: '', title: '视频预览', error: false },
    onLoad() {
        this.getOpenerEventChannel().on('openMedia', (media) => {
            if (!media || !media.url) {
                this.setData({ error: true });
                return;
            }
            this.setData({ url: media.url, poster: media.poster || '', title: media.title || '视频预览', error: false });
        });
    },
    onUnload() { if (this.data.url)
        wx.createVideoContext('mediaViewerVideo', this).stop(); },
    goBack() { wx.navigateBack(); },
    videoError() { this.setData({ error: true }); }
});
