import { API_BASE_URL } from '../config'

const SESSION_KEY = 'parrot-pro-api-session-v1'
let apiReady = false

export class ApiError extends Error {
  code: string
  details: any
  constructor(code: string, message: string, details?: any) { super(message); this.code = code; this.details = details }
}

export function initApi() { apiReady = /^https:\/\//.test(API_BASE_URL) && !API_BASE_URL.includes('example.com') }
export function isApiReady() { return apiReady }
export function createRequestId(prefix = 'cmd') { return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 12)}` }
function token() { return String(wx.getStorageSync(SESSION_KEY) || '') }
function apiUrl(path: string) { return `${API_BASE_URL.replace(/\/$/, '')}${path}` }

function request(path: string, method: string, data?: any, authenticated = true, timeout = 30000): Promise<any> {
  if (!apiReady) return Promise.reject(new ApiError('UNAVAILABLE', 'API 服务地址尚未配置'))
  return new Promise((resolve, reject) => {
    const headers: any = { 'content-type': 'application/json' }
    if (authenticated && token()) headers.Authorization = `Bearer ${token()}`
    wx.request({ url: apiUrl(path), method, data, header: headers, timeout, success: (response: any) => {
      const body = response.data
      if (response.statusCode >= 200 && response.statusCode < 300 && body && body.ok) { resolve(body.data); return }
      if (response.statusCode === 401) wx.removeStorageSync(SESSION_KEY)
      reject(new ApiError(body && body.error && body.error.code || 'INTERNAL_ERROR', body && body.error && body.error.message || '服务暂时不可用', body && body.error && body.error.details))
    }, fail: (error: any) => reject(new ApiError('UNAVAILABLE', error.errMsg || '无法连接服务器')) })
  })
}

function loginCode(): Promise<string> { return new Promise((resolve, reject) => wx.login({ success: (result: any) => result.code ? resolve(result.code) : reject(new ApiError('UNAUTHORIZED', '微信登录失败')), fail: () => reject(new ApiError('UNAUTHORIZED', '微信登录失败')) })) }

export async function getSession(): Promise<{ openId: string; authorized: boolean; configured: boolean }> {
  if (token()) {
    try { return await request('/api/session', 'GET') } catch (error: any) { if (error.code !== 'UNAUTHORIZED') throw error }
  }
  const result = await request('/api/auth/login', 'POST', { code: await loginCode() }, false)
  if (result.token) wx.setStorageSync(SESSION_KEY, result.token)
  return { openId: result.openId, authorized: Boolean(result.authorized), configured: Boolean(result.configured) }
}

export function callManagement(action: string, input: any = {}, requestId = '') { return request('/api/manage', 'POST', { action, input, requestId }) }
export function resolvePublicShare(shareToken: string) { return request(`/api/public/shares/${encodeURIComponent(shareToken)}`, 'GET', undefined, false) }
export function importRemoteMedia(url: string) { return request('/api/media/import', 'POST', { url, requestId: createRequestId('media-url') }, true, 60000) }

function readChunk(filePath: string, position: number, length: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => wx.getFileSystemManager().readFile({ filePath, position, length, success: (result: any) => resolve(result.data), fail: (error: any) => reject(new ApiError('MEDIA_REJECTED', error.errMsg || '无法读取媒体文件')) }))
}

function uploadChunk(assetId: string, uploadId: string, partNumber: number, data: ArrayBuffer): Promise<{ partNumber: number; etag: string }> {
  return new Promise((resolve, reject) => {
    wx.request({ url: apiUrl(`/api/media/multipart/${encodeURIComponent(assetId)}/parts/${partNumber}?uploadId=${encodeURIComponent(uploadId)}`), method: 'PUT', data, header: { Authorization: `Bearer ${token()}`, 'content-type': 'application/octet-stream' }, timeout: 60000, success: (response: any) => {
      const body = response.data
      if (response.statusCode >= 200 && response.statusCode < 300 && body && body.ok) resolve(body.data)
      else reject(new ApiError(body && body.error && body.error.code || 'MEDIA_REJECTED', body && body.error && body.error.message || '媒体分片上传失败'))
    }, fail: (error: any) => reject(new ApiError('UNAVAILABLE', error.errMsg || '媒体分片上传失败')) })
  })
}

export async function uploadMedia(filePath: string, type: 'image' | 'video') {
  const info = await new Promise<{ size: number }>((resolve, reject) => {
    wx.getFileSystemManager().getFileInfo({
      filePath,
      success: (result: { size: number }) => resolve(result),
      fail: (error: { errMsg?: string }) => reject(new ApiError('MEDIA_REJECTED', error.errMsg || '无法读取媒体文件'))
    })
  })
  const prepared = await request('/api/media/multipart/create', 'POST', { type, size: Number(info.size || 0), fileName: filePath.split('/').pop() || `${type}.tmp`, requestId: createRequestId('media-upload') })
  const parts: Array<{ partNumber: number; etag: string }> = []
  for (let position = 0, partNumber = 1; position < info.size; position += prepared.partSize, partNumber += 1) {
    const length = Math.min(prepared.partSize, info.size - position)
    parts.push(await uploadChunk(prepared.assetId, prepared.uploadId, partNumber, await readChunk(filePath, position, length)))
  }
  return request(`/api/media/multipart/${encodeURIComponent(prepared.assetId)}/complete`, 'POST', { uploadId: prepared.uploadId, parts }, true, 60000)
}
