import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'miniprogram/app.json', 'miniprogram/app.ts', 'miniprogram/app.wxss',
  'miniprogram/custom-tab-bar/index.wxml', 'miniprogram/config.ts', 'miniprogram/utils/types.ts', 'miniprogram/utils/cloud.ts', 'miniprogram/utils/store.ts', 'miniprogram/utils/repository.ts',
  'miniprogram/pages/home/home.wxml', 'miniprogram/pages/parrots/parrots.wxml', 'miniprogram/pages/feeding-plans/feeding-plans.wxml', 'miniprogram/pages/feeding-plan-form/feeding-plan-form.wxml', 'miniprogram/pages/feeding-plan-view/feeding-plan-view.wxml',
  'miniprogram/pages/breeding/breeding.wxml', 'miniprogram/pages/hatching/hatching.wxml',
  'miniprogram/pages/parrot-detail/parrot-detail.wxml', 'miniprogram/pages/parrot-form/parrot-form.wxml',
  'miniprogram/pages/sales-records/sales-records.wxml', 'miniprogram/pages/access/access.wxml', 'miniprogram/pages/share/share.wxml',
  'miniprogram/pages/clutch-intake/clutch-intake.wxml',
  'miniprogram/pages/unauthorized/unauthorized.wxml'
]
const missing = required.filter(file => !fs.existsSync(path.join(root, file)))
if (missing.length) { console.error(`Missing miniapp files:\n${missing.join('\n')}`); process.exit(1) }
const voidTags = new Set(['page-meta', 'image', 'input'])
const validateWxml = file => {
  const content = fs.readFileSync(path.join(root, file), 'utf8')
  const stack = []
  for (let cursor = 0; cursor < content.length;) {
    const start = content.indexOf('<', cursor)
    if (start < 0) break
    let end = start + 1
    let quote = ''
    for (; end < content.length; end += 1) {
      const char = content[end]
      if (quote) {
        if (char === quote && content[end - 1] !== '\\') quote = ''
      } else if (char === '"' || char === "'") quote = char
      else if (char === '>') break
    }
    if (end === content.length) throw new Error(`${file}: unclosed tag`)
    const tag = content.slice(start, end + 1)
    cursor = end + 1
    if (/^<!--|^<!/.test(tag)) continue
    const match = tag.match(/^<\s*(\/?)\s*([\w-]+)/)
    if (!match) continue
    const [, closing, name] = match
    if (closing) {
      const expected = stack.pop()
      if (expected !== name) throw new Error(`${file}: expected </${expected || 'none'}>, found </${name}>`)
    } else if (!/\/\s*>$/.test(tag) && !voidTags.has(name)) stack.push(name)
  }
  if (stack.length) throw new Error(`${file}: unclosed tag <${stack.at(-1)}>`)
}
required.filter(file => file.endsWith('.wxml')).forEach(validateWxml)
const compiledPages = ['home', 'parrots', 'breeding', 'hatching', 'parrot-detail', 'parrot-form', 'clutch-intake', 'sales-records', 'access', 'feeding-plans', 'feeding-plan-form', 'feeding-plan-view', 'share', 'unauthorized']
for (const page of compiledPages) {
  const file = path.join(root, 'miniprogram', 'pages', page, `${page}.js`)
  if (!fs.existsSync(file) || !fs.readFileSync(file, 'utf8').includes('Page({')) throw new Error(`${page}.js is missing compiled page logic; run npm run build:miniapp`)
}
const config = JSON.parse(fs.readFileSync(path.join(root, 'miniprogram', 'project.config.json'), 'utf8'))
const app = JSON.parse(fs.readFileSync(path.join(root, 'miniprogram/app.json'), 'utf8'))
if (config.compileType !== 'miniprogram') throw new Error('miniprogram/project.config.json must target miniprogram')
if (app.pages.length !== 14 || !app.tabBar?.custom) throw new Error('app.json page or custom tab configuration is incomplete')
const source = required.filter(file => file.endsWith('.ts') || file.endsWith('.wxml') || file.endsWith('.wxss')).map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')
if (/https:\/\/esm\.sh|cdn\.tailwindcss\.com/.test(source)) throw new Error('Miniapp source must not depend on web CDN assets')
if (/wx\.cloud|callFunction/.test(source)) throw new Error('Miniapp source must not depend on CloudBase')
if (/wx:key="[^"]*\.[^"]*"/.test(source)) throw new Error('WXML wx:key must use a direct property such as wx:key="id"')
const tabPages = new Set(app.tabBar.list.map(item => `/${item.pagePath}`))
for (const file of fs.readdirSync(path.join(root, 'miniprogram', 'pages'), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => path.join(root, 'miniprogram', 'pages', entry.name, `${entry.name}.ts`)).filter(fs.existsSync)) {
  const pageSource = fs.readFileSync(file, 'utf8')
  for (const match of pageSource.matchAll(/wx\.navigateTo\(\{\s*url:\s*[`'"]([^`'"?]+)/g)) {
    if (tabPages.has(match[1])) throw new Error(`${path.relative(root, file)} must use wx.switchTab for ${match[1]}`)
  }
}
console.log(`Miniapp static check passed: ${required.length} required files, ${app.pages.length} pages`)
