import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const FRONTEND_URL = process.env.BRIAN_AI_FRONTEND_URL || 'http://127.0.0.1:5182'
const DEBUG_PORT = Number(process.env.BRIAN_AI_CDP_PORT || 9231)
const SCREENSHOT_DIR = process.env.BRIAN_AI_SMOKE_SCREENSHOT_DIR || path.join('docs', 'frontend-smoke')

const ROUTES = [
  ['/', 'Brian AI Command Center'],
  ['/copilot', 'Ask refinery questions with citations'],
  ['/knowledge-graph', 'Knowledge Graph'],
  ['/compliance', 'OISD/PESO Compliance Matrix'],
  ['/documents', 'Document Intelligence'],
  ['/capture', 'Expert Knowledge Capture'],
  ['/settings', ['Production readiness', 'Hackathon submission readiness']],
  ['/field', 'Brian AI Field'],
]

function candidateBrowsers() {
  return [
    process.env.CHROME_BIN,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean)
}

function findBrowser() {
  const browser = candidateBrowsers().find((item) => fs.existsSync(item))
  if (!browser) throw new Error('No Chrome or Edge executable found. Set CHROME_BIN to run frontend smoke checks.')
  return browser
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function createTarget(url) {
  const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
  if (!response.ok) throw new Error(`Unable to create browser target: ${response.status} ${await response.text()}`)
  return response.json()
}

async function connectToTarget(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const exceptions = []

  ws.addEventListener('message', (message) => {
    const payload = JSON.parse(message.data)
    if (payload.id && pending.has(payload.id)) {
      const { resolve, reject } = pending.get(payload.id)
      pending.delete(payload.id)
      if (payload.error) reject(new Error(JSON.stringify(payload.error)))
      else resolve(payload.result || {})
      return
    }
    if (payload.method === 'Runtime.exceptionThrown') {
      exceptions.push(payload.params?.exceptionDetails?.exception?.description || payload.params?.exceptionDetails?.text || 'exception')
    }
  })

  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  function send(method, params = {}) {
    const callId = ++id
    ws.send(JSON.stringify({ id: callId, method, params }))
    return new Promise((resolve, reject) => pending.set(callId, { resolve, reject }))
  }

  await send('Page.enable')
  await send('Runtime.enable')
  return { ws, send, exceptions }
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression })
  return result.result.value
}

async function inspectRoute(send, route, expectedText) {
  await send('Page.navigate', { url: `${FRONTEND_URL}${route}?smoke=${Date.now()}` })
  await delay(1800)
  const result = await evaluate(send, `
    (() => {
      const text = document.body.textContent || ''
      const bodyWidth = document.body.scrollWidth
      const viewportWidth = window.innerWidth
      return {
        route: location.pathname,
        hasExpectedText: ${Array.isArray(expectedText)
          ? JSON.stringify(expectedText) + '.every((item) => text.includes(item))'
          : 'text.includes(' + JSON.stringify(expectedText) + ')'},
        errorBoundary: text.includes('needs a refresh'),
        overflowX: bodyWidth > viewportWidth + 1,
        bodyWidth,
        viewportWidth
      }
    })()
  `)
  if (!result.hasExpectedText || result.errorBoundary || result.overflowX) {
    throw new Error(`Route smoke failed for ${route}: ${JSON.stringify(result)}`)
  }
  return result
}

async function clickComplianceHandoff(send) {
  await send('Page.navigate', { url: `${FRONTEND_URL}/compliance?smoke=${Date.now()}` })
  await delay(1800)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Ask Copilot')
      if (!button) return { ok: false, reason: 'Ask Copilot button missing' }
      const clause = document.querySelector('.clause-drawer > p')?.textContent || ''
      button.click()
      for (let i = 0; i < 80; i += 1) {
        const textarea = document.querySelector('textarea[aria-label="Ask Brian AI"]')
        if (location.pathname === '/copilot' && textarea?.value?.includes(clause)) break
        await wait(100)
      }
      const value = document.querySelector('textarea[aria-label="Ask Brian AI"]')?.value || ''
      return { ok: location.pathname === '/copilot' && value.includes(clause), clause, value }
    })()
  `)
  if (!result.ok) throw new Error(`Compliance handoff failed: ${JSON.stringify(result)}`)
  return result
}

async function clickGraphPath(send) {
  await send('Page.navigate', { url: `${FRONTEND_URL}/knowledge-graph?smoke=${Date.now()}` })
  await delay(2200)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const button = [...document.querySelectorAll('button')].find((item) => /Shortest path to regulation|Find evidence documents/i.test(item.textContent || ''))
      if (!button) return { ok: false, reason: 'path button missing' }
      button.click()
      for (let i = 0; i < 80; i += 1) {
        if (document.querySelectorAll('.graph-path-results article').length > 0) break
        await wait(100)
      }
      const cards = document.querySelectorAll('.graph-path-results article').length
      return { ok: cards > 0, cards }
    })()
  `)
  if (!result.ok) throw new Error(`Knowledge graph path smoke failed: ${JSON.stringify(result)}`)
  return result
}

async function verifyFieldPwa(send) {
  await send('Page.navigate', { url: `${FRONTEND_URL}/field?smoke=${Date.now()}` })
  await delay(3200)
  const result = await evaluate(send, `
    (async () => {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.ready
      const cacheNames = 'caches' in window ? await caches.keys() : []
      const cache = cacheNames.includes('brian-ai-field-v3') ? await caches.open('brian-ai-field-v3') : null
      return {
        swSupported: 'serviceWorker' in navigator,
        controlled: Boolean(navigator.serviceWorker?.controller),
        hasCache: cacheNames.includes('brian-ai-field-v3'),
        cachedField: cache ? Boolean(await cache.match('/field')) : false,
        textOk: (document.body.textContent || '').includes('Brian AI Field')
      }
    })()
  `)
  if (!result.swSupported || !result.hasCache || !result.cachedField || !result.textOk) {
    throw new Error(`Field PWA smoke failed: ${JSON.stringify(result)}`)
  }
  return result
}

async function screenshot(send, filePath) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'))
}

async function main() {
  const browser = findBrowser()
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brian-ai-smoke-'))
  const child = spawn(browser, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true })

  try {
    await delay(1800)
    const target = await createTarget(`${FRONTEND_URL}/`)
    const { ws, send, exceptions } = await connectToTarget(target)
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })

    const routes = []
    for (const [route, expectedText] of ROUTES) routes.push(await inspectRoute(send, route, expectedText))
    const compliance = await clickComplianceHandoff(send)
    const graph = await clickGraphPath(send)
    const fieldPwa = await verifyFieldPwa(send)
    await screenshot(send, path.join(SCREENSHOT_DIR, 'field-pwa.png'))
    await send('Target.closeTarget', { targetId: target.id }).catch(() => undefined)
    ws.close()

    if (exceptions.length) throw new Error(`Browser exceptions: ${exceptions.join('\\n')}`)
    console.log(JSON.stringify({ routes: routes.length, compliance, graph, fieldPwa, screenshotDir: SCREENSHOT_DIR }, null, 2))
  } finally {
    child.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
