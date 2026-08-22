import { API_BASE_URL } from '../config'
import { SessionDoc } from './types'

const SESSION_KEY = 'parrot-pro-api-session-v1'
let apiReady = false

export class ApiError extends Error {
  code: string
  details: any
  constructor(code: string, message: string, details?: any) { super(message); this.code = code; this.details = details }
}

export function initApi() { apiReady = /^(https:\/\/|http:\/\/127\.0\.0\.1(?::\d+)?$)/.test(API_BASE_URL) && !API_BASE_URL.includes('example.com') }
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

export async function getSession(): Promise<SessionDoc> {
  if (token()) {
    try { return await request('/api/session', 'GET') } catch (error: any) { if (error.code !== 'UNAUTHORIZED') throw error }
  }
  const result = await request('/api/auth/login', 'POST', { code: await loginCode() }, false)
  if (result.token) wx.setStorageSync(SESSION_KEY, result.token)
  return {
    openId: result.openId,
    authorized: Boolean(result.authorized),
    configured: Boolean(result.configured),
    role: result.role || 'NONE',
    accessStatus: result.accessStatus || 'none',
    canManageAccess: Boolean(result.canManageAccess),
    requestNote: result.requestNote || '',
    reviewNote: result.reviewNote || ''
  }
}

export function callManagement(action: string, input: any = {}, requestId = '', timeout = 30000) { return request('/api/manage', 'POST', { action, input, requestId }, true, timeout) }
export function resolvePublicShare(shareToken: string) { return request(`/api/public/shares/${encodeURIComponent(shareToken)}`, 'GET', undefined, false) }

export function streamSaleCopy(input: any, onEvent: (event: any) => void, onFailure: (error: ApiError) => void) {
  if (!apiReady) { onFailure(new ApiError('UNAVAILABLE', 'API 服务地址尚未配置')); return null }
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  const consume = (chunk: ArrayBuffer) => {
    buffer += decoder.decode(chunk, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''
    for (const event of events) {
      const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('')
      if (!data) continue
      try { onEvent(JSON.parse(data)) } catch { /* Wait for the next complete server event. */ }
    }
  }
  const headers: any = { 'content-type': 'application/json' }
  if (token()) headers.Authorization = `Bearer ${token()}`
  const task: any = wx.request({ url: apiUrl('/api/ai/sale-copy/stream'), method: 'POST', data: input, header: headers, timeout: 125000, responseType: 'arraybuffer', enableChunked: true, success: (response: any) => {
    if (response.statusCode >= 400) onFailure(new ApiError('AI_UNAVAILABLE', 'AI 服务暂时不可用，请稍后重试'))
  }, fail: (error: any) => onFailure(new ApiError('UNAVAILABLE', error.errMsg || '实时生成连接已断开')) } as any)
  task.onChunkReceived((result: any) => consume(result.data))
  return task
}

function readChunk(filePath: string, position: number, length: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => wx.getFileSystemManager().readFile({ filePath, position, length, success: (result: any) => resolve(result.data), fail: (error: any) => reject(new ApiError('MEDIA_REJECTED', error.errMsg || '无法读取媒体文件')) }))
}

function getLocalFileInfo(filePath: string): Promise<{ size: number }> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().getFileInfo({
      filePath,
      success: (result: { size: number }) => resolve(result),
      fail: (error: { errMsg?: string }) => reject(new ApiError('MEDIA_REJECTED', error.errMsg || '无法读取媒体文件'))
    })
  })
}

function getImageSize(filePath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => wx.getImageInfo({ src: filePath, success: resolve, fail: reject }))
}

function uploadFileName(filePath: string, type: 'image' | 'video') {
  const extension = (filePath.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const allowed = type === 'image' ? ['jpg', 'jpeg', 'png', 'webp', 'gif'] : ['mp4', 'mov', 'm4v']
  return `${type}.${allowed.includes(extension) ? extension : type === 'image' ? 'jpg' : 'mp4'}`
}

async function compressLocalImage(filePath: string) {
  try {
    const { width, height } = await getImageSize(filePath)
    const scale = Math.min(1, 1200 / Math.max(width, height))
    return await new Promise<string>((resolve, reject) => wx.compressImage({
      src: filePath,
      quality: 70,
      compressedWidth: Math.max(1, Math.round(width * scale)),
      compressedHeight: Math.max(1, Math.round(height * scale)),
      success: (result: { tempFilePath: string }) => resolve(result.tempFilePath),
      fail: reject
    }))
  } catch { throw new ApiError('MEDIA_REJECTED', '图片转换失败，请重新选择 JPG、PNG 或 WebP 图片') }
}

async function compressLocalVideo(filePath: string, size: number) {
  if (size <= 8 * 1024 * 1024) return filePath
  try {
    return await new Promise<string>((resolve, reject) => wx.compressVideo({ src: filePath, quality: 'medium', success: (result: { tempFilePath: string }) => resolve(result.tempFilePath), fail: reject }))
  } catch { return filePath }
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
  const sourceInfo = await getLocalFileInfo(filePath)
  const preparedPath = type === 'image' ? await compressLocalImage(filePath) : await compressLocalVideo(filePath, sourceInfo.size)
  const info = await getLocalFileInfo(preparedPath)
  const uploadPath = type === 'image' || info.size < sourceInfo.size ? preparedPath : filePath
  const uploadInfo = uploadPath === preparedPath ? info : sourceInfo
  const prepared = await request('/api/media/multipart/create', 'POST', { type, size: Number(uploadInfo.size || 0), fileName: uploadFileName(uploadPath, type), requestId: createRequestId('media-upload') })
  const parts: Array<{ partNumber: number; etag: string }> = []
  for (let position = 0, partNumber = 1; position < uploadInfo.size; position += prepared.partSize, partNumber += 1) {
    const length = Math.min(prepared.partSize, uploadInfo.size - position)
    parts.push(await uploadChunk(prepared.assetId, prepared.uploadId, partNumber, await readChunk(uploadPath, position, length)))
  }
  return request(`/api/media/multipart/${encodeURIComponent(prepared.assetId)}/complete`, 'POST', { uploadId: prepared.uploadId, parts }, true, 60000)
}
