import { GenderCode, MediaItem } from '../../utils/types'
import { store } from '../../utils/store'
import { importRemoteMedia, uploadMedia } from '../../utils/cloud'
import { backOrSwitchTab } from '../../utils/navigation'

Page({
  data: { isEdit: false, id: '', media: [] as MediaItem[], showUrl: false, tempUrl: '', saving: false, uploading: false, form: { species: '', ringNumber: '', gender: GenderCode.UNKNOWN, price: '', birthDate: new Date().toISOString().slice(0, 10), publicIntro: '', privateNotes: '' }, genders: [{ key: GenderCode.MALE, label: '公 (Male)' }, { key: GenderCode.FEMALE, label: '母 (Female)' }, { key: GenderCode.UNKNOWN, label: '未验卡' }] },
  onLoad(options: any) {
    if (!options.id) return
    const parrot = store.getParrot(options.id)
    if (parrot) this.setData({ isEdit: true, id: options.id, media: parrot.media || [], form: { species: parrot.species, ringNumber: parrot.ringNumber, gender: parrot.gender, price: String(parrot.price), birthDate: parrot.birthDate, publicIntro: parrot.publicIntro || '', privateNotes: parrot.privateNotes || '' } })
  },
  goBack() { backOrSwitchTab() },
  input(event: any) { this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value }) },
  chooseGender(event: any) { this.setData({ 'form.gender': event.currentTarget.dataset.key }) },
  chooseDate(event: any) { this.setData({ 'form.birthDate': event.detail.value }) },
  async chooseMedia(event: any) {
    if (this.data.uploading) return
    const kind = event.currentTarget.dataset.kind
    try {
      const result = await wx.chooseMedia({ count: kind === 'local' ? 9 : 1, mediaType: kind === 'video' ? ['video'] : kind === 'image' ? ['image'] : ['image', 'video'], sourceType: kind === 'local' ? ['album'] : ['camera'] })
      this.setData({ uploading: true })
      const media: MediaItem[] = []
      for (const item of result.tempFiles || []) {
        const type = item.fileType === 'video' ? 'video' : 'image'
        const asset = await uploadMedia(item.tempFilePath, type)
        media.push({ assetId: asset.assetId, type, fileID: asset.fileID, url: asset.fileID })
      }
      this.setData({ media: this.data.media.concat(media) })
    } catch (error: any) {
      if (error && error.errMsg && error.errMsg.includes('cancel')) return
      wx.showToast({ title: error.message || '媒体上传失败', icon: 'none' })
    } finally { this.setData({ uploading: false }) }
  },
  openUrl() { this.setData({ showUrl: true, tempUrl: '' }) },
  closeUrl() { this.setData({ showUrl: false }) },
  inputUrl(event: any) { this.setData({ tempUrl: event.detail.value }) },
  async addUrl() {
    const url = String(this.data.tempUrl || '').trim()
    if (!/^https:\/\//.test(url)) { wx.showToast({ title: '请输入 HTTPS 地址', icon: 'none' }); return }
    this.setData({ uploading: true })
    try {
      const asset = await importRemoteMedia(url)
      this.setData({ media: this.data.media.concat([{ assetId: asset.assetId, type: asset.type, fileID: asset.fileID, url: asset.fileID }]), showUrl: false })
    } catch (error: any) { wx.showToast({ title: error.message || 'URL 导入失败', icon: 'none' }) } finally { this.setData({ uploading: false }) }
  },
  removeMedia(event: any) { const media = this.data.media.slice(); media.splice(event.currentTarget.dataset.index, 1); this.setData({ media }) },
  async save() {
    const form = this.data.form
    if (!form.species || !form.ringNumber || !form.birthDate) { wx.showToast({ title: '请填写关键信息', icon: 'none' }); return }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) { wx.showToast({ title: '请输入正确价格', icon: 'none' }); return }
    if (this.data.saving || this.data.uploading) return
    const normalized = String(form.ringNumber).replace(/\s+/g, '').toUpperCase()
    if (store.parrots.some(item => item.id !== this.data.id && item.ringNumber.replace(/\s+/g, '').toUpperCase() === normalized)) { wx.showToast({ title: '圈号已存在', icon: 'none' }); return }
    this.setData({ saving: true })
    const payload: any = { species: form.species, ringNumber: form.ringNumber, gender: form.gender, price: Number(form.price), birthDate: form.birthDate, media: this.data.media, publicIntro: form.publicIntro, privateNotes: form.privateNotes }
    try {
      if (this.data.isEdit) await store.updateParrot(this.data.id, payload)
      else await store.createParrot(payload)
      wx.showToast({ title: this.data.isEdit ? '档案已更新' : '档案已录入', icon: 'success' })
      backOrSwitchTab()
    } catch (error: any) { wx.showToast({ title: error.message || '保存失败', icon: 'none' }) } finally { this.setData({ saving: false }) }
  }
})
