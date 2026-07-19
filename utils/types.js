"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLACEHOLDER_IMAGE = exports.STATUS_CLASS = exports.GENDER_LABEL = exports.STATUS_LABEL = exports.GenderCode = exports.ParrotStatusCode = void 0;
var ParrotStatusCode;
(function (ParrotStatusCode) {
    ParrotStatusCode["FOR_SALE"] = "FOR_SALE";
    ParrotStatusCode["SOLD"] = "SOLD";
    ParrotStatusCode["RETURNED"] = "RETURNED";
    ParrotStatusCode["BREEDER"] = "BREEDER";
    ParrotStatusCode["PAIRED"] = "PAIRED";
    ParrotStatusCode["INCUBATING"] = "INCUBATING";
})(ParrotStatusCode || (exports.ParrotStatusCode = ParrotStatusCode = {}));
var GenderCode;
(function (GenderCode) {
    GenderCode["MALE"] = "MALE";
    GenderCode["FEMALE"] = "FEMALE";
    GenderCode["UNKNOWN"] = "UNKNOWN";
})(GenderCode || (exports.GenderCode = GenderCode = {}));
exports.STATUS_LABEL = {
    FOR_SALE: '待售', SOLD: '已售', RETURNED: '退货', BREEDER: '种鸟', PAIRED: '已配对', INCUBATING: '孵化中'
};
exports.GENDER_LABEL = { MALE: '公', FEMALE: '母', UNKNOWN: '未验卡' };
exports.STATUS_CLASS = {
    FOR_SALE: 'status-green', SOLD: 'status-gray', RETURNED: 'status-purple', BREEDER: 'status-blue', PAIRED: 'status-rose', INCUBATING: 'status-amber'
};
exports.PLACEHOLDER_IMAGE = '/assets/parrots/blue-macaw.svg';
