"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../../utils/types");
Component({
    properties: { status: { type: String, value: types_1.ParrotStatusCode.FOR_SALE } },
    data: { label: '', statusClass: '' },
    lifetimes: { attached() { this.refresh(); } },
    observers: { status() { this.refresh(); } },
    methods: { refresh() { const status = this.properties.status; this.setData({ label: types_1.STATUS_LABEL[status] || status, statusClass: types_1.STATUS_CLASS[status] || '' }); } }
});
