import { GenderCode, ParrotDoc, ParrotStatusCode, STATUS_LABEL, GENDER_LABEL } from '../../utils/types'
import { store } from '../../utils/store'

Page({
  data: { parrots: [] as ParrotDoc[], search: '', filter: '', gender: '', status: '', minPrice: '', maxPrice: '', drawer: false, longPressed: null as any, genders: Object.keys(GENDER_LABEL).map(key => ({ key, label: GENDER_LABEL[key as GenderCode] })), statuses: Object.keys(STATUS_LABEL).map(key => ({ key, label: STATUS_LABEL[key as ParrotStatusCode] })) },
  onLoad() { this.unsubscribe = store.subscribe(() => this.refresh()); store.hydrate(); this.setData({ filter: wx.getStorageSync('parrot-pro-filter') || '' }); this.refresh() },
  onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar) tabBar.setData({ selected: 1, hidden: false }); this.refresh() },
  onUnload() { if (this.unsubscribe) this.unsubscribe() },
  onPullDownRefresh() { store.hydrate(); setTimeout(() => wx.stopPullDownRefresh(), 400) },
  refresh() {
    const query = String(this.data.search || '').trim().toLowerCase(); const { gender, status, minPrice, maxPrice, filter } = this.data
    const parrots = store.parrots.filter(item => (!query || item.species.toLowerCase().includes(query) || item.ringNumber.toLowerCase().includes(query)) && (!gender || item.gender === gender) && ((!status && !filter) || item.status === (status || filter)) && (!minPrice || item.price >= Number(minPrice)) && (!maxPrice || item.price <= Number(maxPrice))).map(item => ({ ...item, genderLabel: GENDER_LABEL[item.gender] }))
    this.setData({ parrots })
  },
  inputSearch(event: any) { this.setData({ search: event.detail.value }, () => this.refresh()) },
  setTabHidden(hidden: boolean) { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar) tabBar.setData({ hidden }) },
  openDrawer() { this.setTabHidden(true); this.setData({ drawer: true }) }, closeDrawer() { this.setData({ drawer: false }); this.setTabHidden(false) },
  chooseGender(event: any) { this.setData({ gender: this.data.gender === event.currentTarget.dataset.key ? '' : event.currentTarget.dataset.key }) },
  chooseStatus(event: any) { this.setData({ status: this.data.status === event.currentTarget.dataset.key ? '' : event.currentTarget.dataset.key }) },
  inputMin(event: any) { this.setData({ minPrice: event.detail.value }) }, inputMax(event: any) { this.setData({ maxPrice: event.detail.value }) },
  resetFilter() { this.setData({ search: '', gender: '', status: '', minPrice: '', maxPrice: '', filter: '' }, () => { wx.removeStorageSync('parrot-pro-filter'); this.refresh() }) },
  quickReset() { this.resetFilter(); wx.showToast({ title: '筛选已重置', icon: 'none' }) },
  applyFilter() { this.setData({ filter: '', drawer: false }, () => this.refresh()); this.setTabHidden(false) },
  selectParrot(event: any) { wx.navigateTo({ url: `/pages/parrot-detail/parrot-detail?id=${event.currentTarget.dataset.id}` }) },
  addParrot() { wx.navigateTo({ url: '/pages/parrot-form/parrot-form' }) },
  startLongPress(event: any) { const id = event.currentTarget.dataset.id; this.longPressTimer = setTimeout(() => { const item = store.getParrot(id); this.setTabHidden(true); this.setData({ longPressed: item }) }, 600) },
  cancelLongPress() { if (this.longPressTimer) clearTimeout(this.longPressTimer); this.longPressTimer = null },
  closeLongPress() { this.setData({ longPressed: null }); this.setTabHidden(false) }, shareLongPress() { this.setData({ longPressed: null }); this.setTabHidden(false); wx.showToast({ title: '请在详情页生成分享', icon: 'none' }) },
  noop() {},
  unsubscribe: null, longPressTimer: null
})
