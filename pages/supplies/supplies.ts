import { backOrSwitchTab } from '../../utils/navigation'
import { repository } from '../../utils/repository'

const monthLabel = (date: string) => `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月`
const today = () => new Date(Date.now() + 28800000).toISOString().slice(0, 10)
const emptyForm = () => ({ name: '', amount: '', weight: '', purchaseDate: today(), notes: '' })

Page({
  data: { activeTab: 'SUPPLY', supplyMonths: [] as any[], medicineMonths: [] as any[], currentMonths: [] as any[], currentLabel: '耗材', currentIcon: 'package', showForm: false, submitting: false, todayDate: today(), form: emptyForm() },
  onShow() { this.reload() },
  async reload() {
    try {
      const records = await repository.supplies()
      const supplyMonths = this.group(records, 'SUPPLY'), medicineMonths = this.group(records, 'MEDICINE')
      this.setData({ supplyMonths, medicineMonths, currentMonths: this.data.activeTab === 'SUPPLY' ? supplyMonths : medicineMonths })
    } catch (error: any) { wx.showToast({ title: error.message || '加载失败', icon: 'none' }) }
  },
  group(records: any[], category: string) {
    const groups = new Map<string, any[]>()
    records.filter(item => item.category === category).forEach(item => {
      const key = String(item.purchaseDate).slice(0, 7)
      groups.set(key, [...(groups.get(key) || []), { ...item, amount: (Number(item.amountCents || 0) / 100).toFixed(2).replace(/\.00$/, '') }])
    })
    return [...groups.entries()].map(([key, items]) => ({ key, label: monthLabel(`${key}-01`), open: false, count: items.length, amount: items.reduce((sum, item) => sum + Number(item.amountCents || 0), 0) / 100, items }))
  },
  switchTab(event: any) {
    const activeTab = event.currentTarget.dataset.tab
    this.setData({ activeTab, currentMonths: activeTab === 'SUPPLY' ? this.data.supplyMonths : this.data.medicineMonths, currentLabel: activeTab === 'SUPPLY' ? '耗材' : '药品', currentIcon: activeTab === 'SUPPLY' ? 'package' : 'cross' })
  },
  toggleMonth(event: any) {
    const key = event.currentTarget.dataset.key, target = this.data.activeTab === 'SUPPLY' ? 'supplyMonths' : 'medicineMonths'
    const months = this.data[target].map((item: any) => item.key === key ? { ...item, open: !item.open } : item)
    this.setData({ [target]: months, currentMonths: months })
  },
  add() { this.setData({ showForm: true, form: emptyForm(), todayDate: today() }) },
  closeForm() { if (!this.data.submitting) this.setData({ showForm: false }) },
  noop() {},
  input(event: any) { this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value }) },
  dateChange(event: any) { this.setData({ 'form.purchaseDate': event.detail.value }) },
  async save() {
    const form: any = this.data.form
    if (!form.name.trim() || !form.amount || Number(form.amount) <= 0) { wx.showToast({ title: '请填写名称和金额', icon: 'none' }); return }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try { await repository.createSupply({ ...form, category: this.data.activeTab }); await this.reload(); this.setData({ showForm: false }); wx.showToast({ title: '已保存', icon: 'success' }) }
    catch (error: any) { wx.showToast({ title: error.message || '保存失败', icon: 'none' }) }
    finally { this.setData({ submitting: false }) }
  },
  goBack() { backOrSwitchTab() }
})
