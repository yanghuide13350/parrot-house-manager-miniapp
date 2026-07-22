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
      const parrot = { ...value, gender: GENDER_LABEL[value.gender] || value.gender, age: value.ageLabel, price: Number(value.priceCents || 0) / 100, desc: value.publicIntro, image: value.media && value.media[0] && value.media[0].url || PLACEHOLDER_IMAGE }
      this.setData({ parrot, media: value.media && value.media.length ? value.media : [{ type: 'image', url: PLACEHOLDER_IMAGE }], invalid: false, loading: false, token })
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
  onShareAppMessage() { return { title: `${this.data.parrot?.species || 'Parrot Pro'} · 官方档案`, path: `/pages/share/share?token=${encodeURIComponent(this.data.token)}`, imageUrl: this.data.parrot?.image } },
  goBack() { backOrSwitchTab() }
})
