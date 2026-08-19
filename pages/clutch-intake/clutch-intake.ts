import { GenderCode, GENDER_LABEL } from '../../utils/types'
import { store } from '../../utils/store'
import { backOrSwitchTab } from '../../utils/navigation'

const genders = [GenderCode.MALE, GenderCode.FEMALE, GenderCode.UNKNOWN].map(key => ({ key, label: GENDER_LABEL[key] }))

Page({
  data: { record: null as any, father: null as any, mother: null as any, birthDateLabel: '', chicks: [] as any[], genders, submitting: false, loaded: false },
  onLoad(options: any) { this.id = String(options.id || ''); this.unsubscribe = store.subscribe(() => this.refresh()); store.hydrate(); this.refresh() },
  onUnload() { if (this.unsubscribe) this.unsubscribe() },
  refresh() {
    const record = store.hatchingRecords.find(item => item.id === this.id)
    if (!record) return
    const father = store.getParrot(record.maleId), mother = store.getParrot(record.femaleId)
    const birthDateLabel = String(record.completedAt || record.startDate || '').slice(0, 10)
    if (!this.data.loaded) this.setData({ record, father, mother, birthDateLabel, chicks: this.initialChicks(record), loaded: true })
    else this.setData({ record, father, mother, birthDateLabel })
  },
  initialChicks(record: any) {
    const species = (record.offspringGroups || []).flatMap((group: any) => Array.from({ length: group.count }, () => group.species))
    return Array.from({ length: record.hatched }, (_item, index) => ({ index: index + 1, species: species[index] || record.species || '', ringNumber: '', gender: GenderCode.UNKNOWN, price: '', privateNotes: '' }))
  },
  input(event: any) { const index = Number(event.currentTarget.dataset.index), key = event.currentTarget.dataset.key; this.setData({ [`chicks[${index}].${key}`]: event.detail.value }) },
  chooseGender(event: any) { const index = Number(event.currentTarget.dataset.index); this.setData({ [`chicks[${index}].gender`]: event.currentTarget.dataset.gender }) },
  async submit() {
    if (this.data.submitting || !this.data.record) return
    const missingSpecies = this.data.chicks.some((item: any) => !String(item.species || '').trim())
    if (missingSpecies) { wx.showToast({ title: '请填写每只幼鸟的品种', icon: 'none' }); return }
    this.setData({ submitting: true })
    try {
      const result = await store.createFromClutch(this.id, this.data.chicks)
      wx.showToast({ title: `已录入${result.ids.length}只幼鸟`, icon: 'success' })
      setTimeout(() => backOrSwitchTab('/pages/hatching/hatching'), 500)
    } catch (error: any) { wx.showToast({ title: error.message || '录入失败', icon: 'none' }) } finally { this.setData({ submitting: false }) }
  },
  goBack() { backOrSwitchTab('/pages/hatching/hatching') },
  id: '',
  unsubscribe: null as any
})
