import { resolvePublicShare } from '../../utils/cloud'
import { GENDER_LABEL, PLACEHOLDER_IMAGE } from '../../utils/types'
import { backOrSwitchTab } from '../../utils/navigation'

Page({
  data: { parrot: null as any, media: [] as any[], invalid: false, loading: true, activeIndex: 0, token: '', shareTopStyle: '' },
  async onLoad(options: any) {
    const token = String(options.token || '')
    this.syncTopBar()
    if (!token) { this.setData({ invalid: true, loading: false }); return }
    try {
      const result = await resolvePublicShare(token)
      if (!result.valid || !result.parrot) { this.setData({ invalid: true, loading: false, token }); return }
      const value = result.parrot
      const parentLabel = (parent: any) => parent ? `${parent.species}${parent.ringNumber ? ` · ${parent.ringNumber}` : ''}` : '暂未录入'
      const photos = (value.media || []).filter((item: any) => item.type === 'image' && item.url)
      const parrot = { ...value, ringNumber: value.ringNumber || '需补充', gender: GENDER_LABEL[value.gender] || value.gender, age: value.ageLabel, price: Number(value.priceCents || 0) / 100, desc: value.publicIntro, birthDateLabel: String(value.birthDate || '').slice(0, 10), fatherLabel: parentLabel(value.father), motherLabel: parentLabel(value.mother), clutchLabel: value.clutch ? `本窝出壳 ${value.clutch.hatched} 只` : '', image: photos[0]?.url || PLACEHOLDER_IMAGE }
      this.setData({ parrot, media: photos.length ? photos : [{ type: 'image', url: PLACEHOLDER_IMAGE }], invalid: false, loading: false, token })
    } catch (error) { this.setData({ invalid: true, loading: false, token }) }
  },
  onShow() { this.syncTopBar() },
  syncTopBar() {
    const menu = typeof wx.getMenuButtonBoundingClientRect === 'function' ? wx.getMenuButtonBoundingClientRect() : null
    if (!menu) {
      this.setData({ shareTopStyle: '' })
      return
    }
    const top = Math.max(menu.bottom + 14, 34)
    this.setData({ shareTopStyle: `top:${top}px;left:20px;right:20px;` })
  },
  swiperChange(event: any) { this.setData({ activeIndex: event.detail.current }) },
  onShareAppMessage() { return { title: `${this.data.parrot?.species || 'Parrot Pro'} · 血统档案`, path: `/pages/share/share?token=${encodeURIComponent(this.data.token)}`, imageUrl: this.data.parrot?.image } },
  goBack() { backOrSwitchTab() }
})
