"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
Component({
    properties: { status: { type: String, value: types_1.ParrotStatusCode.FOR_SALE }, labelOverride: { type: String, value: '' } },
    data: { label: '', statusClass: '' },
    lifetimes: { attached() { this.refresh(); } },
    observers: { status() { this.refresh(); }, labelOverride() { this.refresh(); } },
    methods: { refresh() { const status = this.properties.status; this.setData({ label: this.properties.labelOverride || types_1.STATUS_LABEL[status] || status, statusClass: types_1.STATUS_CLASS[status] || '' }); } }
});
