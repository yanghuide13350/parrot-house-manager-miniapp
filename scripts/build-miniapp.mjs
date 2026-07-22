import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const buildRoot = path.join(root, '.miniprogram-build')
const sourceRoot = path.join(root, 'miniprogram')

fs.rmSync(buildRoot, { recursive: true, force: true })
const tsc = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc')
const result = spawnSync(tsc, ['-p', path.join(root, 'miniprogram', 'tsconfig.miniapp.json')], { cwd: root, encoding: 'utf8' })
if (result.status !== 0) {
  process.stdout.write(result.stdout || '')
  process.stderr.write(result.stderr || '')
  process.exit(result.status || 1)
}

let count = 0
function copyGenerated(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      copyGenerated(absolute)
      continue
    }
    if (!entry.name.endsWith('.js')) continue
    const relative = path.relative(buildRoot, absolute)
    const destination = path.join(sourceRoot, relative)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(absolute, destination)
    count += 1
  }
}

copyGenerated(buildRoot)
fs.rmSync(buildRoot, { recursive: true, force: true })
console.log(`Miniapp TypeScript compiled: ${count} JavaScript files`)
