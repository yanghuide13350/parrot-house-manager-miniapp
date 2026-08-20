import { store } from '../../utils/store'

Page({
  data: { parrots: [], stats: { total: 0, forSale: 0, sold: 0, returned: 0, breeder: 0, paired: 0, incubating: 0, revenue: 0 }, species: [], trend: [] as any[], trendMode: 'revenue', chartLabel: '¥0', pullRefreshing: false },
  onLoad() { this.unsubscribe = store.subscribe(() => this.refresh()); store.hydrate(); this.refresh() },
  onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar) tabBar.setData({ selected: 0, hidden: false }) },
  onReady() { this.canvasReady = true; this.drawTrend() },
  onUnload() { if (this.unsubscribe) this.unsubscribe() },
  async onPullDownRefresh() { this.setData({ pullRefreshing: true }); await store.hydrate(true); this.setData({ pullRefreshing: false }); wx.stopPullDownRefresh() },
  async refreshFromTab() {
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
    await store.hydrate(true)
    this.refresh()
    if (store.lastError) wx.showToast({ title: store.lastError, icon: 'none' })
    else wx.showToast({ title: '已刷新', icon: 'none' })
  },
  refresh() {
    const dashboard = store.dashboard
    const stats = { ...dashboard.stats, revenue: Number(dashboard.stats.revenueCents || 0) / 100 }
    const latest = dashboard.trend[dashboard.trend.length - 1]
    const chartLabel = this.data.trendMode === 'revenue' ? `¥${latest ? latest.revenueCents / 100 : 0}` : `${latest ? latest.volume : 0} 只`
    this.setData({ parrots: store.parrots, stats, species: dashboard.species, trend: dashboard.trend, chartLabel, canManageAccess: Boolean(store.session && store.session.canManageAccess), accessRole: store.session && store.session.role || 'NONE' }, () => { if (this.canvasReady) this.drawTrend() })
  },
  setTrendMode(event: any) { const trendMode = event.currentTarget.dataset.mode; const latest = this.data.trend[this.data.trend.length - 1]; const chartLabel = trendMode === 'revenue' ? `¥${latest ? latest.revenueCents / 100 : 0}` : `${latest ? latest.volume : 0} 只`; this.setData({ trendMode, chartLabel }, () => this.drawTrend()) },
  drawTrend() {
    wx.createSelectorQuery().in(this).select('#trendCanvas').fields({ node: true, size: true }).exec((result: any[]) => {
      const target = result && result[0]
      if (!target || !target.node) return
      const canvas = target.node; const ctx = canvas.getContext('2d')
      const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio
      const width = target.width; const height = target.height
      canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height)
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1; ctx.setLineDash([4, 5])
      ;[0.25, 0.55, 0.85].forEach(position => { ctx.beginPath(); ctx.moveTo(0, height * position); ctx.lineTo(width, height * position); ctx.stroke() }); ctx.setLineDash([])
      const values = (this.data.trend.length ? this.data.trend : [{ revenueCents: 0, volume: 0 }]).map((item: any) => this.data.trendMode === 'revenue' ? Number(item.revenueCents || 0) / 100 : Number(item.volume || 0))
      const max = Math.max(...values, 1); const min = Math.min(...values, 0); const range = Math.max(1, max - min)
      const points = values.map((value: number, index: number) => ({ x: values.length === 1 ? width / 2 : index * width / (values.length - 1), y: height - 18 - ((value - min) / range) * (height - 44) }))
      const trace = () => { ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); for (let index = 1; index < points.length; index++) { const previous = points[index - 1]; const current = points[index]; const middle = (previous.x + current.x) / 2; ctx.bezierCurveTo(middle, previous.y, middle, current.y, current.x, current.y) } }
      trace(); ctx.lineWidth = 3; ctx.strokeStyle = '#1e293b'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
      ctx.lineTo(points[points.length - 1].x, height); ctx.lineTo(points[0].x, height); ctx.closePath()
      const gradient = ctx.createLinearGradient(0, 0, 0, height); gradient.addColorStop(0, 'rgba(30,41,59,.16)'); gradient.addColorStop(1, 'rgba(30,41,59,0)'); ctx.fillStyle = gradient; ctx.fill()
    })
  },
  goParrots(event: any) { const filter = event.currentTarget.dataset.filter || ''; wx.removeStorageSync('parrot-pro-filter'); wx.setStorageSync('parrot-pro-filter-intent', { status: filter, timestamp: Date.now() }); wx.switchTab({ url: '/pages/parrots/parrots' }) },
  goSales() { wx.navigateTo({ url: '/pages/sales-records/sales-records' }) },
  goFeedingPlans() { wx.navigateTo({ url: '/pages/feeding-plans/feeding-plans' }) },
  goAccess() { wx.navigateTo({ url: '/pages/access/access' }) },
  unsubscribe: null as any,
  canvasReady: false
})
