import { GenderCode, MediaItem, ParentInfo } from '../../utils/types'
import { store } from '../../utils/store'
import { uploadMedia } from '../../utils/cloud'
import { backOrSwitchTab } from '../../utils/navigation'
import { todayDate } from '../../utils/date'

Page({
  data: { isEdit: false, introductionMode: false, id: '', media: [] as MediaItem[], saving: false, uploading: false, focusedParentField: '', breedOptions: [] as string[], form: { breed: '', species: '', ringNumber: '', gender: GenderCode.UNKNOWN, price: '', birthDate: todayDate(), purchaseDate: todayDate(), publicIntro: '', privateNotes: '' }, father: null as ParentInfo | null, mother: null as ParentInfo | null, maleCandidates: [] as any[], femaleCandidates: [] as any[], genders: [{ key: GenderCode.MALE, label: '公 (Male)' }, { key: GenderCode.FEMALE, label: '母 (Female)' }, { key: GenderCode.UNKNOWN, label: '未验卡' }] },
  onLoad(options: any) {
    const introductionMode = options.mode === 'introduction'
    this.setData({ introductionMode })
    if (!options.id) return
    const parrot = store.getParrot(options.id)
    if (parrot) this.setData({ isEdit: true, introductionMode: parrot.recordSource === 'INTRODUCTION', id: options.id, media: parrot.media || [], father: parrot.father || null, mother: parrot.mother || null, form: { breed: parrot.breed || '', species: parrot.species, ringNumber: parrot.ringNumber, gender: parrot.gender, price: String(parrot.price), birthDate: parrot.birthDate, purchaseDate: parrot.purchaseDate || todayDate(), publicIntro: parrot.publicIntro || '', privateNotes: parrot.privateNotes || '' } })
  },
  onShow() { this.refreshCandidates() },
  refreshCandidates() {
    const available = store.parrots.filter(item => item.id !== this.data.id).map(item => ({ ...item, label: `${item.species}｜${item.ringNumber}` }))
    this.setData({ maleCandidates: available.filter(item => item.gender === GenderCode.MALE), femaleCandidates: available.filter(item => item.gender === GenderCode.FEMALE) })
    this.refreshBreedOptions()
  },
  goBack() { backOrSwitchTab() },
  refreshBreedOptions(keyword = this.data.form.breed) {
    const normalized = String(keyword || '').trim().toLowerCase()
    const breedOptions = [...new Set(store.parrots.map(item => String(item.breed || '').trim()).filter(Boolean))].filter(item => !normalized || item.toLowerCase().includes(normalized)).slice(0, 8)
    this.setData({ breedOptions })
  },
  input(event: any) { const key = event.currentTarget.dataset.key, value = event.detail.value; this.setData({ [`form.${key}`]: value }); if (key === 'breed') this.refreshBreedOptions(value) },
  focusBreed() { this.refreshBreedOptions() },
  chooseBreed(event: any) { this.setData({ 'form.breed': event.currentTarget.dataset.value, breedOptions: [] }) },
  chooseGender(event: any) { this.setData({ 'form.gender': event.currentTarget.dataset.key }) },
  chooseDate(event: any) { this.setData({ 'form.birthDate': event.detail.value }) },
  choosePurchaseDate(event: any) { this.setData({ 'form.purchaseDate': event.detail.value }) },
  chooseParent(event: any) {
    const role = event.currentTarget.dataset.role as 'father' | 'mother'
    const candidates = role === 'father' ? this.data.maleCandidates : this.data.femaleCandidates
    const parent = candidates[Number(event.detail.value)]
    if (parent) this.setData({ [role]: { source: 'LIBRARY', id: parent.id, species: parent.species, ringNumber: parent.ringNumber } })
  },
  inputManualParent(event: any) {
    const role = event.currentTarget.dataset.role as 'father' | 'mother', key = event.currentTarget.dataset.key
    const current: any = this.data[role] || { source: 'MANUAL', species: '', ringNumber: '' }
    // 修改带入内容即转为手工资料，避免关联的库内档案被误改。
    this.setData({ [role]: { ...current, source: 'MANUAL', id: null, [key]: event.detail.value } })
  },
  focusParentField(event: any) { this.setData({ focusedParentField: event.currentTarget.dataset.focus }) },
  blurParentField() { this.setData({ focusedParentField: '' }) },
  clearParent(event: any) { this.setData({ [event.currentTarget.dataset.role]: null }) },
  async chooseImage(event: any) {
    if (this.data.uploading) return
    const kind = event.currentTarget.dataset.kind
    try {
      const result = await wx.chooseImage({ count: kind === 'local' ? 9 : 1, sizeType: ['compressed'], sourceType: kind === 'local' ? ['album'] : ['camera'] })
      this.setData({ uploading: true })
      const media: MediaItem[] = []
      for (const filePath of result.tempFilePaths || []) {
        const asset = await uploadMedia(filePath)
        media.push({ assetId: asset.assetId, type: 'image', fileID: asset.fileID, url: asset.fileID })
      }
      this.setData({ media: this.data.media.concat(media) })
    } catch (error: any) {
      if (error && error.errMsg && error.errMsg.includes('cancel')) return
      wx.showToast({ title: error.message || '媒体上传失败', icon: 'none' })
    } finally { this.setData({ uploading: false }) }
  },
  removeMedia(event: any) { const media = this.data.media.slice(); media.splice(event.currentTarget.dataset.index, 1); this.setData({ media }) },
  previewMedia(event: any) {
    const item = this.data.media[Number(event.currentTarget.dataset.index)]
    if (!item || !item.url) return
    const urls = this.data.media.filter((media: MediaItem) => media.url).map((media: MediaItem) => media.url)
    wx.previewImage({ current: item.url, urls })
  },
  async save() {
    const form = this.data.form
    if (!form.breed || !form.species || !form.birthDate) { wx.showToast({ title: '请填写品种、名称和出生日期', icon: 'none' }); return }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) { wx.showToast({ title: '请输入正确价格', icon: 'none' }); return }
    if (this.data.saving || this.data.uploading) return
    const normalized = String(form.ringNumber).replace(/\s+/g, '').toUpperCase()
    if (normalized && store.parrots.some(item => item.id !== this.data.id && item.ringNumber.replace(/\s+/g, '').toUpperCase() === normalized)) { wx.showToast({ title: '圈号已存在', icon: 'none' }); return }
    if (!this.data.introductionMode && (!this.data.father || !this.data.mother || !this.data.father.species || !this.data.mother.species)) { wx.showToast({ title: '请配置父鸟和母鸟', icon: 'none' }); return }
    const complete: any = { breed: form.breed, species: form.species, ringNumber: form.ringNumber, gender: form.gender, price: Number(form.price), birthDate: form.birthDate, purchaseDate: form.purchaseDate, media: this.data.media, publicIntro: form.publicIntro, privateNotes: form.privateNotes, father: this.data.father, mother: this.data.mother }
    let payload = complete
    if (this.data.isEdit) {
      const current = store.getParrot(this.data.id)
      if (!current) { wx.showToast({ title: '档案不存在，请刷新后重试', icon: 'none' }); return }
      payload = {}
      for (const key of ['breed', 'species', 'ringNumber', 'gender', 'birthDate', 'purchaseDate', 'publicIntro', 'privateNotes', 'father', 'mother']) if (JSON.stringify(complete[key]) !== JSON.stringify((current as any)[key])) payload[key] = complete[key]
      if (complete.price !== current.price) payload.price = complete.price
      const mediaKey = (items: MediaItem[]) => JSON.stringify(items.map(item => ({ assetId: item.assetId, type: item.type })))
      if (mediaKey(complete.media) !== mediaKey(current.media || [])) payload.media = complete.media
      if (!Object.keys(payload).length) { wx.showToast({ title: '没有需要保存的修改', icon: 'none' }); return }
    }
    this.setData({ saving: true })
    try {
      if (this.data.isEdit) await store.updateParrot(this.data.id, payload)
      else if (this.data.introductionMode) await store.createIntroduction(payload)
      else await store.createParrot(payload)
      wx.showToast({ title: this.data.isEdit ? '档案已更新' : this.data.introductionMode ? '引种鸟已录入' : '档案已录入', icon: 'success' })
      backOrSwitchTab()
    } catch (error: any) { wx.showToast({ title: error.message || '保存失败', icon: 'none' }) } finally { this.setData({ saving: false }) }
  }
})
