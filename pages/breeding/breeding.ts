import { GENDER_LABEL, ParrotStatusCode } from '../../utils/types'
import { store } from '../../utils/store'
import { todayDate } from '../../utils/date'

Page({
  data: { pairs: [] as any[], breeders: [] as any[], search: '', selected: null as any, showModal: false, eggCount: '3', submitting: false },
  onLoad() { this.unsubscribe = store.subscribe(() => this.refresh()); store.hydrate(); this.refresh() },
  onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar) tabBar.setData({ selected: 2, hidden: false }); this.refresh() },
  onUnload() { if (this.unsubscribe) this.unsubscribe(); this.cancelSearchRefresh() },
  async refreshFromTab() {
    wx.pageScrollTo({ scrollTop: 0, duration: 0 })
    await store.hydrate(true)
    this.refresh()
    if (store.lastError) wx.showToast({ title: store.lastError, icon: 'none' })
    else wx.showToast({ title: '已刷新', icon: 'none' })
  },
  refresh() {
    const query = String(this.data.search || '').trim().toLowerCase()
    const matches = (item: any) => !query || [item.breed, item.species, item.ringNumber].some(value => String(value || '').toLowerCase().includes(query))
    const pairs = store.pairs.filter(pair => matches(pair.male) || matches(pair.female)).map(pair => ({ ...pair, male: { ...pair.male, ringLabel: pair.male.ringNumber || '需补充' }, female: { ...pair.female, ringLabel: pair.female.ringNumber || '需补充' }, breed: pair.male.breed || '', species: pair.male.species, status: pair.status === 'INCUBATING' ? ParrotStatusCode.INCUBATING : ParrotStatusCode.PAIRED, duration: pair.male.pairDays || 0 }))
    const breeders = store.parrots.filter(item => item.status === ParrotStatusCode.BREEDER && matches(item)).map(item => ({ ...item, genderLabel: GENDER_LABEL[item.gender], ringLabel: item.ringNumber || '需补充' }))
    this.setData({ pairs, breeders })
  },
  inputSearch(event: any) { this.setData({ search: event.detail.value }); this.scheduleSearchRefresh() },
  scheduleSearchRefresh() { this.cancelSearchRefresh(); this.searchDebounceTimer = setTimeout(() => { this.searchDebounceTimer = null; this.refresh() }, 300) },
  cancelSearchRefresh() { if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer); this.searchDebounceTimer = null },
  clearSearch() { this.cancelSearchRefresh(); this.setData({ search: '' }, () => this.refresh()) },
  setTabHidden(hidden: boolean) { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar) tabBar.setData({ hidden }) },
  openProgress(event: any) { const pair = this.data.pairs.find((item: any) => item.male.id === event.currentTarget.dataset.male); this.setTabHidden(true); this.setData({ selected: pair, showModal: true, eggCount: '3' }) },
  closeModal() { if (this.data.submitting) return; this.setData({ showModal: false }); this.setTabHidden(false) },
  inputEgg(event: any) { this.setData({ eggCount: event.detail.value }) },
  async startIncubation() {
    if (this.data.submitting) return
    const pair = this.data.selected; const eggs = Number(this.data.eggCount)
    if (!pair || !Number.isInteger(eggs) || eggs < 1) { wx.showToast({ title: '请输入正确蛋数', icon: 'none' }); return }
    this.setData({ submitting: true })
    try { await store.addHatching({ maleRingNumber: pair.male.ringNumber, femaleRingNumber: pair.female.ringNumber, maleId: pair.male.id, femaleId: pair.female.id, species: pair.species, startDate: todayDate(), eggs, hatched: 0, status: 'INCUBATING' }); this.setData({ showModal: false }); this.setTabHidden(false); wx.showToast({ title: `任务已启动：${eggs} 枚蛋`, icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '启动失败', icon: 'none' }) } finally { this.setData({ submitting: false }) }
  },
  cancelPair(event: any) {
    if (this.data.submitting) return
    const pair = this.data.pairs.find((item: any) => item.male.id === event.currentTarget.dataset.male)
    if (!pair) return
    if (pair.status === ParrotStatusCode.INCUBATING) { wx.showToast({ title: '孵化期内禁止拆对', icon: 'none' }); return }
    wx.showModal({ title: '确认拆对', content: `解除 ${pair.male.ringNumber} 与 ${pair.female.ringNumber} 的配对关系？`, success: async (result: any) => { if (!result.confirm || this.data.submitting) return; this.setData({ submitting: true }); try { await store.cancelPair(pair.id); wx.showToast({ title: '配对已拆除', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '拆对失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } } })
  },
  viewHatching(event: any) { wx.setStorageSync('parrot-pro-hatching-search-intent', { ring: String(event.currentTarget.dataset.ring || ''), timestamp: Date.now() }); wx.switchTab({ url: '/pages/hatching/hatching' }) },
  viewParrot(event: any) { wx.navigateTo({ url: `/pages/parrot-detail/parrot-detail?id=${event.currentTarget.dataset.id}` }) },
  noop() {},
  unsubscribe: null as any,
  searchDebounceTimer: null as any
})
