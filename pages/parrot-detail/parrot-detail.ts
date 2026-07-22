import { GenderCode, GENDER_LABEL, ParrotStatusCode } from '../../utils/types'
import { store } from '../../utils/store'
import { backOrSwitchTab } from '../../utils/navigation'
import { todayDate } from '../../utils/date'
import { API_BASE_URL } from '../../config'

const SHARE_CACHE_KEY = 'parrot-pro-share-cache'

Page({
  data: { parrot: null as any, genderLabel: '', media: [] as any[], activeIndex: 0, showPairing: false, showSale: false, showProgress: false, eligible: [] as any[], selectedMate: '', eggCount: '3', buyer: '', price: '', contact: '', shareToken: '', shareUrl: '', shareExpiryLabel: '', submitting: false, detailTopStyle: '', detailActionsStyle: '' },
  onLoad(options: any) { wx.hideShareMenu(); this.id = options.id; this.syncTopBar(); this.restoreShareState(); this.unsubscribe = store.subscribe(() => this.refresh()); this.refresh() },
  onUnload() { if (this.unsubscribe) this.unsubscribe() },
  onShow() { this.syncTopBar(); this.restoreShareState(); if (this.id) this.refresh() },
  syncTopBar() {
    const menu = typeof wx.getMenuButtonBoundingClientRect === 'function' ? wx.getMenuButtonBoundingClientRect() : null
    const windowInfo = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : null
    if (!menu || !windowInfo) {
      this.setData({ detailTopStyle: '', detailActionsStyle: '' })
      return
    }
    const top = Math.max(menu.bottom + 14, 34)
    const rightGap = Math.max(windowInfo.windowWidth - menu.left + 12, 0)
    this.setData({ detailTopStyle: `top:${top}px;left:14px;right:14px;`, detailActionsStyle: `margin-right:${rightGap}px;` })
  },
  readShareCache() {
    const raw = wx.getStorageSync(SHARE_CACHE_KEY)
    return raw && typeof raw === 'object' ? raw : {}
  },
  writeShareCache(cache: Record<string, any>) { wx.setStorageSync(SHARE_CACHE_KEY, cache) },
  restoreShareState() {
    const cache = this.readShareCache()
    const entry = cache[this.id]
    if (!entry) return
    if (!entry.expiresAt || new Date(entry.expiresAt).getTime() <= Date.now()) {
      delete cache[this.id]
      this.writeShareCache(cache)
      this.setData({ shareToken: '', shareUrl: '', shareExpiryLabel: '' })
      wx.hideShareMenu()
      return
    }
    this.setData({ shareToken: entry.token || '', shareUrl: entry.url || '', shareExpiryLabel: this.shareExpiryText(entry.expiresAt) })
    if (entry.token) wx.showShareMenu({ menus: ['shareAppMessage'] })
  },
  saveShareState(token: string, expiresAt: string) {
    const cache = this.readShareCache()
    cache[this.id] = { token, url: this.sharePublicUrl(token), expiresAt }
    this.writeShareCache(cache)
  },
  clearShareState() {
    const cache = this.readShareCache()
    if (cache[this.id]) {
      delete cache[this.id]
      this.writeShareCache(cache)
    }
  },
  refresh() { const parrot = store.getParrot(this.id); if (!parrot) return; const media = parrot.media && parrot.media.length ? parrot.media : [{ type: 'image', url: parrot.image }]; this.setData({ parrot, genderLabel: GENDER_LABEL[parrot.gender], media, price: String(parrot.price || '') }) },
  swiperChange(event: any) { this.setData({ activeIndex: event.detail.current }) },
  openMedia(event: any) {
    const item = this.data.media[Number(event.currentTarget.dataset.index)]
    if (!item || !item.url) return
    if (item.type === 'image') {
      const urls = this.data.media.filter((media: any) => media.type === 'image' && media.url).map((media: any) => media.url)
      wx.previewImage({ current: item.url, urls })
      return
    }
    wx.navigateTo({
      url: '/pages/media-viewer/media-viewer',
      success: (result: any) => result.eventChannel.emit('openMedia', { url: item.url, poster: item.poster || '', title: `${this.data.parrot?.species || '鹦鹉'} · 视频` }),
      fail: () => wx.showToast({ title: '视频页面打开失败', icon: 'none' })
    })
  },
  goBack() { backOrSwitchTab() },
  edit() { wx.navigateTo({ url: `/pages/parrot-form/parrot-form?id=${this.id}` }) },
  remove() { if (this.data.submitting) return; wx.showModal({ title: '确认删除档案', content: '档案会隐藏并保留后台审计。', success: async (result: any) => { if (!result.confirm || this.data.submitting) return; this.setData({ submitting: true }); try { await store.deleteParrot(this.id); backOrSwitchTab() } catch (error: any) { wx.showToast({ title: error.message || '删除失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } } }) },
  async setBreeder() { if (this.data.submitting) return; this.setData({ submitting: true }); try { await store.setBreeder(this.id); wx.showToast({ title: '已设为种鸟', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '操作失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } },
  async removeBreeder() { if (this.data.submitting) return; this.setData({ submitting: true }); try { await store.unsetBreeder(this.id); wx.showToast({ title: '已取消种鸟身份', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '操作失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } },
  openPairing() { const current = this.data.parrot; const opposite = current.gender === GenderCode.MALE ? GenderCode.FEMALE : GenderCode.MALE; const eligible = store.parrots.filter(item => item.id !== current.id && item.gender === opposite && item.status === ParrotStatusCode.BREEDER).map(item => ({ ...item, genderLabel: GENDER_LABEL[item.gender] })); this.setData({ eligible, showPairing: true, selectedMate: '' }) },
  closePairing() { if (!this.data.submitting) this.setData({ showPairing: false }) },
  chooseMate(event: any) { this.setData({ selectedMate: event.currentTarget.dataset.id }) },
  async confirmPairing() { if (!this.data.selectedMate) { wx.showToast({ title: '请选择配偶', icon: 'none' }); return } const current = this.data.parrot; const mate = store.getParrot(this.data.selectedMate); if (!mate || this.data.submitting) return; this.setData({ submitting: true }); try { await store.pairParrots(current.gender === GenderCode.MALE ? current.id : mate.id, current.gender === GenderCode.MALE ? mate.id : current.id); this.setData({ showPairing: false }); wx.showToast({ title: '配对成功', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '配对失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } },
  openSale() { this.setData({ showSale: true, buyer: '', contact: '', price: String(this.data.parrot.price || '') }) },
  closeSale() { if (!this.data.submitting) this.setData({ showSale: false }) },
  inputSale(event: any) { this.setData({ [event.currentTarget.dataset.key]: event.detail.value }) },
  async confirmSale() { if (!this.data.buyer || !this.data.price) { wx.showToast({ title: '请完整填写销售信息', icon: 'none' }); return } if (this.data.submitting) return; const parrot = this.data.parrot; this.setData({ submitting: true }); try { await store.addSale({ parrotId: parrot.id, species: parrot.species, ringNumber: parrot.ringNumber, gender: parrot.gender, buyer: this.data.buyer, buyerContact: this.data.contact, date: todayDate(), price: Number(this.data.price), visitStatus: 'WAITING', image: parrot.image } as any); this.setData({ showSale: false }); wx.showToast({ title: '成交记录已保存', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '成交保存失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } },
  openProgress() { this.setData({ showProgress: true, eggCount: '3' }) },
  closeProgress() { if (!this.data.submitting) this.setData({ showProgress: false }) },
  inputEgg(event: any) { this.setData({ eggCount: event.detail.value }) },
  async startProgress() { const parrot = this.data.parrot; const pair = store.getPair(parrot.activePairId) || store.pairs.find(item => item.maleId === parrot.id || item.femaleId === parrot.id); const mateId = parrot.mateId || (pair ? pair.maleId === parrot.id ? pair.femaleId : pair.maleId : ''); const mate = mateId ? store.getParrot(mateId) : null; const eggs = Number(this.data.eggCount); if (!mate) { wx.showToast({ title: '配对关系异常，请刷新后重试', icon: 'none' }); await store.hydrate(true); return } if (!Number.isInteger(eggs) || eggs < 1) { wx.showToast({ title: '请输入正确蛋数', icon: 'none' }); return } if (this.data.submitting) return; this.setData({ submitting: true }); try { await store.addHatching({ maleRingNumber: parrot.gender === GenderCode.MALE ? parrot.ringNumber : mate.ringNumber, femaleRingNumber: parrot.gender === GenderCode.FEMALE ? parrot.ringNumber : mate.ringNumber, maleId: parrot.gender === GenderCode.MALE ? parrot.id : mate.id, femaleId: parrot.gender === GenderCode.FEMALE ? parrot.id : mate.id, species: parrot.species, startDate: todayDate(), eggs, hatched: 0, status: 'INCUBATING' }); this.setData({ showProgress: false }); wx.showToast({ title: '已启动孵化任务', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '启动失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } },
  viewHatching() { wx.switchTab({ url: '/pages/hatching/hatching' }) },
  sharePublicUrl(token: string) { return `${String(API_BASE_URL || '').replace(/\/+$/, '')}/share/${encodeURIComponent(token)}` },
  shareExpiryText(expiresAt: string) { return expiresAt ? `有效期至 ${String(expiresAt).slice(0, 10)}` : '' },
  previewShare() { if (!this.data.shareToken) return; wx.navigateTo({ url: `/pages/share/share?token=${encodeURIComponent(this.data.shareToken)}` }) },
  copyShareLink() { if (!this.data.shareUrl) return; wx.setClipboardData({ data: this.data.shareUrl }) },
  async generateShare() { if (this.data.submitting) return; this.setData({ submitting: true }); try { const result = await store.createShareToken(this.id); this.saveShareState(result.token, result.expiresAt); this.setData({ shareToken: result.token, shareUrl: this.sharePublicUrl(result.token), shareExpiryLabel: this.shareExpiryText(result.expiresAt) }); wx.showShareMenu({ menus: ['shareAppMessage'] }); wx.showToast({ title: '分享链接已生成', icon: 'none' }) } catch (error: any) { wx.showToast({ title: error.message || '分享生成失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } },
  revokeShare() { const token = this.data.shareToken; if (!token || this.data.submitting) return; wx.showModal({ title: '撤销当前分享', content: '撤销后，已复制的链接和已转发的分享都会立即失效。', success: async (result: any) => { if (!result.confirm) return; this.setData({ submitting: true }); try { await store.revokeShareToken(token); this.clearShareState(); this.setData({ shareToken: '', shareUrl: '', shareExpiryLabel: '' }); wx.hideShareMenu(); wx.showToast({ title: '分享已撤销', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '撤销失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } } }) },
  onShareAppMessage() { const token = this.data.shareToken; return { title: `${this.data.parrot?.species || '鹦鹉'} · Parrot Pro`, path: token ? `/pages/share/share?token=${encodeURIComponent(token)}` : '/pages/share/share', imageUrl: this.data.parrot?.image } },
  noop() {},
  id: '',
  unsubscribe: null as any
})
