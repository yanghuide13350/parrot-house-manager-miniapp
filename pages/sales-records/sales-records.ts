import { store } from '../../utils/store'
import { backOrSwitchTab } from '../../utils/navigation'
import { GENDER_LABEL } from '../../utils/types'

const VISIT_LABEL: Record<string, string> = { WAITING: '待回访', VISITED: '已回访', UNREACHABLE: '未联系' }
const VISIT_VALUES = ['WAITING', 'VISITED', 'UNREACHABLE'] as const

Page({
  data: { sales: [] as any[], search: '', stats: { total: 0, revenue: 0, returnRate: 0 }, showReturn: false, selectedSale: null as any, returnReason: '', submitting: false },
  onLoad() { this.unsubscribe = store.subscribe(() => this.refresh()); store.hydrate(); this.refresh() },
  onUnload() { if (this.unsubscribe) this.unsubscribe() },
  refresh() {
    const query = String(this.data.search || '').toLowerCase()
    const sales = store.salesRecords.filter(item => !query || `${item.buyer} ${item.ringNumber} ${item.breed} ${item.species}`.toLowerCase().includes(query)).map(item => ({ ...item, ringNumber: item.ringNumber || '需补充', genderLabel: GENDER_LABEL[item.gender], visitLabel: VISIT_LABEL[item.visitStatus], returned: item.status === 'RETURNED' }))
    this.setData({ sales, stats: { total: store.dashboard.stats.salesTotal, revenue: Number(store.dashboard.stats.revenueCents || 0) / 100, returnRate: store.dashboard.stats.returnRate } })
  },
  inputSearch(event: any) { this.setData({ search: event.detail.value }, () => this.refresh()) },
  updateFollowUp(event: any) {
    const record = store.salesRecords.find(item => item.id === event.currentTarget.dataset.id)
    if (!record || this.data.submitting) return
    wx.showActionSheet({ itemList: VISIT_VALUES.map(value => VISIT_LABEL[value]), success: async (result: any) => { const status = VISIT_VALUES[result.tapIndex]; if (!status || status === record.visitStatus) return; this.setData({ submitting: true }); try { await store.updateFollowUp(record.id, status); wx.showToast({ title: '回访状态已更新', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '更新失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } } })
  },
  openReturn(event: any) { const selectedSale = store.salesRecords.find(item => item.id === event.currentTarget.dataset.id); if (selectedSale) this.setData({ selectedSale, showReturn: true, returnReason: '' }) },
  closeReturn() { if (!this.data.submitting) this.setData({ showReturn: false }) },
  inputReason(event: any) { this.setData({ returnReason: event.detail.value }) },
  async confirmReturn() { if (!this.data.returnReason.trim()) { wx.showToast({ title: '请填写退货原因', icon: 'none' }); return } if (this.data.submitting) return; this.setData({ submitting: true }); try { await store.returnSale(this.data.selectedSale.id, this.data.returnReason); this.setData({ showReturn: false }); wx.showToast({ title: '退货已登记', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '退货登记失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } },
  goBack() { backOrSwitchTab('/pages/home/home') },
  noop() {},
  unsubscribe: null as any
})
