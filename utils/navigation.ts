export function backOrSwitchTab(fallback = '/pages/parrots/parrots') {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    wx.navigateBack()
    return
  }
  wx.switchTab({ url: fallback })
}
