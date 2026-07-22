import { initApi } from './utils/cloud'
import { repository } from './utils/repository'
import { store } from './utils/store'

App({
  globalData: { ready: false, session: null, store },
  onLaunch(options: any) {
    initApi()
    if (String(options && options.path || '').replace(/^\//, '') === 'pages/share/share') {
      this.globalData.ready = true
      return
    }
    repository.session().then(session => {
      this.globalData.session = session
      this.globalData.ready = true
      const pages = getCurrentPages(); const current = pages[pages.length - 1]
      if (session.authorized) store.hydrate()
      else if (!current || current.route !== 'pages/share/share') wx.reLaunch({ url: `/pages/unauthorized/unauthorized?configured=${session.configured ? '1' : '0'}&openId=${encodeURIComponent(session.openId || '')}` })
    }).catch((error: any) => {
      this.globalData.ready = true
      const pages = getCurrentPages(); const current = pages[pages.length - 1]
      const reason = encodeURIComponent(error && error.message || error && error.code || '无法连接服务器')
      if (!current || current.route !== 'pages/share/share') wx.reLaunch({ url: `/pages/unauthorized/unauthorized?unavailable=1&reason=${reason}` })
    })
  },
  onShow() {
    const session = repository.currentSession()
    if (session && session.authorized) store.hydrate()
  },
  onShareAppMessage() { return { title: 'Parrot Pro 鹦鹉专业管理', path: '/pages/home/home' } }
})
  
