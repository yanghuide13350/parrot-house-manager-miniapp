"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.initApi = initApi;
exports.isApiReady = isApiReady;
exports.createRequestId = createRequestId;
exports.getSession = getSession;
exports.callManagement = callManagement;
exports.resolvePublicShare = resolvePublicShare;
exports.importRemoteMedia = importRemoteMedia;
exports.uploadMedia = uploadMedia;
const config_1 = require("../config");
const SESSION_KEY = 'parrot-pro-api-session-v1';
let apiReady = false;
class ApiError extends Error {
    constructor(code, message, details) { super(message); this.code = code; this.details = details; }
}
exports.ApiError = ApiError;
function initApi() { apiReady = /^https:\/\//.test(config_1.API_BASE_URL) && !config_1.API_BASE_URL.includes('example.com'); }
function isApiReady() { return apiReady; }
function createRequestId(prefix = 'cmd') { return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`; }
function token() { return String(wx.getStorageSync(SESSION_KEY) || ''); }
function apiUrl(path) { return `${config_1.API_BASE_URL.replace(/\/$/, '')}${path}`; }
function request(path, method, data, authenticated = true, timeout = 30000) {
    if (!apiReady)
        return Promise.reject(new ApiError('UNAVAILABLE', 'API 服务地址尚未配置'));
    return new Promise((resolve, reject) => {
        const headers = { 'content-type': 'application/json' };
        if (authenticated && token())
            headers.Authorization = `Bearer ${token()}`;
        wx.request({ url: apiUrl(path), method, data, header: headers, timeout, success: (response) => {
                const body = response.data;
                if (response.statusCode >= 200 && response.statusCode < 300 && body && body.ok) {
                    resolve(body.data);
                    return;
                }
                if (response.statusCode === 401)
                    wx.removeStorageSync(SESSION_KEY);
                reject(new ApiError(body && body.error && body.error.code || 'INTERNAL_ERROR', body && body.error && body.error.message || '服务暂时不可用', body && body.error && body.error.details));
            }, fail: (error) => reject(new ApiError('UNAVAILABLE', error.errMsg || '无法连接服务器')) });
    });
}
function loginCode() { return new Promise((resolve, reject) => wx.login({ success: (result) => result.code ? resolve(result.code) : reject(new ApiError('UNAUTHORIZED', '微信登录失败')), fail: () => reject(new ApiError('UNAUTHORIZED', '微信登录失败')) })); }
async function getSession() {
    if (token()) {
        try {
            return await request('/api/session', 'GET');
        }
        catch (error) {
            if (error.code !== 'UNAUTHORIZED')
                throw error;
        }
    }
    const result = await request('/api/auth/login', 'POST', { code: await loginCode() }, false);
    if (result.token)
        wx.setStorageSync(SESSION_KEY, result.token);
    return { openId: result.openId, authorized: Boolean(result.authorized), configured: Boolean(result.configured) };
}
function callManagement(action, input = {}, requestId = '') { return request('/api/manage', 'POST', { action, input, requestId }); }
function resolvePublicShare(shareToken) { return request(`/api/public/shares/${encodeURIComponent(shareToken)}`, 'GET', undefined, false); }
function importRemoteMedia(url) { return request('/api/media/import', 'POST', { url, requestId: createRequestId('media-url') }, true, 60000); }
function readChunk(filePath, position, length) {
    return new Promise((resolve, reject) => wx.getFileSystemManager().readFile({ filePath, position, length, success: (result) => resolve(result.data), fail: (error) => reject(new ApiError('MEDIA_REJECTED', error.errMsg || '无法读取媒体文件')) }));
}
function uploadChunk(assetId, uploadId, partNumber, data) {
    return new Promise((resolve, reject) => {
        wx.request({ url: apiUrl(`/api/media/multipart/${encodeURIComponent(assetId)}/parts/${partNumber}?uploadId=${encodeURIComponent(uploadId)}`), method: 'PUT', data, header: { Authorization: `Bearer ${token()}`, 'content-type': 'application/octet-stream' }, timeout: 60000, success: (response) => {
                const body = response.data;
                if (response.statusCode >= 200 && response.statusCode < 300 && body && body.ok)
                    resolve(body.data);
                else
                    reject(new ApiError(body && body.error && body.error.code || 'MEDIA_REJECTED', body && body.error && body.error.message || '媒体分片上传失败'));
            }, fail: (error) => reject(new ApiError('UNAVAILABLE', error.errMsg || '媒体分片上传失败')) });
    });
}
async function uploadMedia(filePath, type) {
    const info = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().getFileInfo({
            filePath,
            success: (result) => resolve(result),
            fail: (error) => reject(new ApiError('MEDIA_REJECTED', error.errMsg || '无法读取媒体文件'))
        });
    });
    const prepared = await request('/api/media/multipart/create', 'POST', { type, size: Number(info.size || 0), fileName: filePath.split('/').pop() || `${type}.tmp`, requestId: createRequestId('media-upload') });
    const parts = [];
    for (let position = 0, partNumber = 1; position < info.size; position += prepared.partSize, partNumber += 1) {
        const length = Math.min(prepared.partSize, info.size - position);
        parts.push(await uploadChunk(prepared.assetId, prepared.uploadId, partNumber, await readChunk(filePath, position, length)));
    }
    return request(`/api/media/multipart/${encodeURIComponent(prepared.assetId)}/complete`, 'POST', { uploadId: prepared.uploadId, parts }, true, 60000);
}
