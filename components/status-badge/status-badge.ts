import { STATUS_CLASS, STATUS_LABEL, ParrotStatusCode } from '../../utils/types'
Component({
  properties: { status: { type: String, value: ParrotStatusCode.FOR_SALE }, labelOverride: { type: String, value: '' } },
  data: { label: '', statusClass: '' },
  lifetimes: { attached() { this.refresh() } },
  observers: { status() { this.refresh() }, labelOverride() { this.refresh() } },
  methods: { refresh() { const status = this.properties.status as ParrotStatusCode; this.setData({ label: this.properties.labelOverride || STATUS_LABEL[status] || status, statusClass: STATUS_CLASS[status] || '' }) } }
})
