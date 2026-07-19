import { GenderCode, ParrotStatusCode } from '../../utils/types'
import { store } from '../../utils/store'

Page({
  data: { records: [] as any[], search: '', showAdd: false, showUpdate: false, updateRecord: null as any, updateValue: 0, submitting: false, newRecord: { species: '', maleId: '', femaleId: '', startDate: new Date().toISOString().slice(0, 10), eggs: '3' }, breeders: [] as any[], maleBreeders: [] as any[], femaleBreeders: [] as any[] },
  onLoad(options: any) { this.unsubscribe = store.subscribe(() => this.refresh()); store.hydrate(); this.setData({ search: options.ring || '' }); this.refresh() },
  onShow() { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar) tabBar.setData({ selected: 3, hidden: false }); this.refresh() },
  onUnload() { if (this.unsubscribe) this.unsubscribe() },
  refresh() { const query = String(this.data.search || '').toLowerCase(); const records = store.hatchingRecords.filter(item => !query || `${item.maleRingNumber} ${item.femaleRingNumber} ${item.species}`.toLowerCase().includes(query)); const breeders = store.parrots.filter(item => item.status === ParrotStatusCode.BREEDER); this.setData({ records, breeders, maleBreeders: breeders.filter(item => item.gender === GenderCode.MALE), femaleBreeders: breeders.filter(item => item.gender === GenderCode.FEMALE) }) },
  inputSearch(event: any) { this.setData({ search: event.detail.value }, () => this.refresh()) },
  clearSearch() { this.setData({ search: '' }, () => this.refresh()) },
  setTabHidden(hidden: boolean) { const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null; if (tabBar) tabBar.setData({ hidden }) },
  openAdd() { this.setTabHidden(true); this.setData({ showAdd: true, newRecord: { species: '', maleId: '', femaleId: '', startDate: new Date().toISOString().slice(0, 10), eggs: '3' } }) },
  closeAdd() { if (this.data.submitting) return; this.setData({ showAdd: false }); this.setTabHidden(false) },
  inputNew(event: any) { this.setData({ [`newRecord.${event.currentTarget.dataset.key}`]: event.detail.value }) },
  chooseMale(event: any) { const item = this.data.maleBreeders[event.detail.value]; if (item) this.setData({ 'newRecord.maleId': item.id }) },
  chooseFemale(event: any) { const item = this.data.femaleBreeders[event.detail.value]; if (item) this.setData({ 'newRecord.femaleId': item.id }) },
  chooseDate(event: any) { this.setData({ 'newRecord.startDate': event.detail.value }) },
  async saveNew() {
    const form = this.data.newRecord; const male = store.getParrot(form.maleId); const female = store.getParrot(form.femaleId); const eggs = Number(form.eggs)
    if (!form.species || !male || !female || !Number.isInteger(eggs) || eggs < 1) { wx.showToast({ title: '请完整填写关键信息', icon: 'none' }); return }
    this.setData({ submitting: true })
    try { await store.addHatching({ maleRingNumber: male.ringNumber, femaleRingNumber: female.ringNumber, maleId: male.id, femaleId: female.id, species: form.species, startDate: form.startDate, eggs, hatched: 0, status: 'INCUBATING' }); this.setData({ showAdd: false }); this.setTabHidden(false); wx.showToast({ title: '孵化档案已创建', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '创建失败', icon: 'none' }) } finally { this.setData({ submitting: false }) }
  },
  openUpdate(event: any) { const record = store.hatchingRecords.find(item => item.id === event.currentTarget.dataset.id); if (record) { this.setTabHidden(true); this.setData({ updateRecord: record, updateValue: record.hatched, showUpdate: true }) } },
  closeUpdate() { if (this.data.submitting) return; this.setData({ showUpdate: false }); this.setTabHidden(false) },
  stepUpdate(event: any) { const diff = Number(event.currentTarget.dataset.diff); this.setData({ updateValue: Math.max(0, Math.min(this.data.updateRecord.eggs, this.data.updateValue + diff)) }) },
  async confirmUpdate() { this.setData({ submitting: true }); try { await store.updateHatching(this.data.updateRecord.id, { hatched: this.data.updateValue }); this.setData({ showUpdate: false }); this.setTabHidden(false); wx.showToast({ title: '进度已更新', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '更新失败', icon: 'none' }) } finally { this.setData({ submitting: false }) } },
  complete(event: any) { const id = event.currentTarget.dataset.id; wx.showModal({ title: '确认完成', content: '完成后父母鸟将恢复为种鸟状态。', success: async (result: any) => { if (!result.confirm) return; try { await store.completeHatching(id); wx.showToast({ title: '孵化任务已完成', icon: 'success' }) } catch (error: any) { wx.showToast({ title: error.message || '操作失败', icon: 'none' }) } } }) },
  remove(event: any) { const id = event.currentTarget.dataset.id; wx.showModal({ title: '确认删除', content: '记录会从列表隐藏并保留审计。', success: async (result: any) => { if (!result.confirm) return; try { await store.deleteHatching(id); wx.showToast({ title: '记录已移除', icon: 'none' }) } catch (error: any) { wx.showToast({ title: error.message || '删除失败', icon: 'none' }) } } }) },
  noop() {},
  unsubscribe: null as any
})
