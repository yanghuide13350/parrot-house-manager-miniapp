import { GENDER_LABEL, ParrotDoc, ParrotStatusCode, PLACEHOLDER_IMAGE } from '../../utils/types'
import { store } from '../../utils/store'
import { backOrSwitchTab } from '../../utils/navigation'

const monthLabel = (date: string) => `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月`

Page({
  data: { months: [] as any[], totalCost: 0 },
  onLoad() { this.unsubscribe = store.subscribe(() => this.refresh()); store.hydrate(); this.refresh() },
  onShow() { this.refresh() },
  onUnload() { if (this.unsubscribe) this.unsubscribe() },
  refresh() {
    const imported = store.parrots.filter(item => item.recordSource === 'INTRODUCTION' && item.purchaseDate)
    const groups = new Map<string, ParrotDoc[]>()
    for (const item of imported) { const key = String(item.purchaseDate).slice(0, 7); groups.set(key, [...(groups.get(key) || []), item]) }
    const months = [...groups.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([key, parrots]) => ({ key, label: monthLabel(`${key}-01`), open: false, count: parrots.length, cost: parrots.reduce((sum, item) => sum + Number(item.price || 0), 0), parrots: parrots.sort((a, b) => String(b.purchaseDate).localeCompare(String(a.purchaseDate))).map(item => { const image = (item.media || []).find(media => media.type === 'image' && media.url); const statusLabel = item.status === ParrotStatusCode.FOR_SALE && item.introductionStage === 'GROWING' ? '待成长' : ''; return { ...item, image: image?.thumbnailUrl || image?.url || PLACEHOLDER_IMAGE, genderLabel: GENDER_LABEL[item.gender], ringLabel: item.ringNumber || '需补充', statusLabel } }) }))
    this.setData({ months, totalCost: imported.reduce((sum, item) => sum + Number(item.price || 0), 0) })
  },
  toggleMonth(event: any) { const key = event.currentTarget.dataset.key; this.setData({ months: this.data.months.map((month: any) => month.key === key ? { ...month, open: !month.open } : month) }) },
  addIntroduction() { wx.navigateTo({ url: '/pages/parrot-form/parrot-form?mode=introduction' }) },
  selectParrot(event: any) { wx.navigateTo({ url: `/pages/parrot-detail/parrot-detail?id=${encodeURIComponent(event.currentTarget.dataset.id)}` }) },
  goBack() { backOrSwitchTab() },
  unsubscribe: null as any
})
