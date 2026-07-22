import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const FRONTEND_URL = process.env.BRIAN_AI_FRONTEND_URL || 'http://127.0.0.1:5182'
const DEBUG_PORT = Number(process.env.BRIAN_AI_CDP_PORT || 9231)
const SCREENSHOT_DIR = process.env.BRIAN_AI_SMOKE_SCREENSHOT_DIR || path.join('docs', 'frontend-smoke')
const FIELD_CACHE_NAME = 'brian-ai-field-v5-public-site'
const WORKSPACE_STORAGE_KEY = 'brian-ai-workspace'

const ROUTES = [
  ['/', 'Know what happened'],
  ['/app', 'Brian AI Command Center'],
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

async function setWorkspace(send, workspace) {
  await evaluate(send, `localStorage.setItem(${JSON.stringify(WORKSPACE_STORAGE_KEY)}, ${JSON.stringify(workspace)})`)
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
        viewportWidth,
        textPreview: text.trim().replace(/\s+/g, ' ').slice(0, 240)
      }
    })()
  `)
  if (!result.hasExpectedText || result.errorBoundary || result.overflowX) {
    throw new Error(`Route smoke failed for ${route}: ${JSON.stringify(result)}`)
  }
  return result
}

async function clickComplianceHandoff(send) {
  await setWorkspace(send, 'demo')
  await send('Page.navigate', { url: `${FRONTEND_URL}/compliance?smoke=${Date.now()}` })
  await delay(1800)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Ask Copilot')
      if (!button) return { ok: false, reason: 'Ask Copilot button missing' }
      const clause = button.closest('[data-slot="card"]')?.querySelector('[data-slot="card-description"]')?.textContent?.trim() || ''
      if (!clause) return { ok: false, reason: 'selected clause context missing' }
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
  await setWorkspace(send, 'demo')
  await send('Page.navigate', { url: `${FRONTEND_URL}/knowledge-graph?smoke=${Date.now()}` })
  await delay(2200)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const button = [...document.querySelectorAll('button')].find((item) => /Shortest path to regulation|Find evidence documents/i.test(item.textContent || ''))
      if (!button) return { ok: false, reason: 'path button missing' }
      button.click()
      for (let i = 0; i < 80; i += 1) {
        if (document.querySelectorAll('[data-slot="alert"] [data-slot="alert-title"]').length > 0) break
        await wait(100)
      }
      const cards = document.querySelectorAll('[data-slot="alert"] [data-slot="alert-title"]').length
      const graph = document.querySelector('svg[aria-label="Equipment relationship graph"]')
      const nodeY = [...(graph?.querySelectorAll('circle') || [])].map((circle) => Number(circle.getAttribute('cy') || 0))
      const maxNodeY = nodeY.length ? Math.max(...nodeY) : 0
      const viewBoxHeight = graph?.viewBox?.baseVal?.height || 0
      const wrappedLabels = [...(graph?.querySelectorAll('text') || [])].filter((label) => label.querySelectorAll('tspan').length > 1).length
      const layoutOk = viewBoxHeight >= maxNodeY + 20 && wrappedLabels > 0
      return { ok: cards > 0 && layoutOk, cards, maxNodeY, viewBoxHeight, wrappedLabels, layoutOk }
    })()
  `)
  if (!result.ok) throw new Error(`Knowledge graph path smoke failed: ${JSON.stringify(result)}`)
  return result
}

async function verifyFieldPwa(send) {
  await setWorkspace(send, 'demo')
  await send('Page.navigate', { url: `${FRONTEND_URL}/field?smoke=${Date.now()}` })
  await delay(3200)
  const result = await evaluate(send, `
    (async () => {
      if ('serviceWorker' in navigator) await navigator.serviceWorker.ready
      const cacheNames = 'caches' in window ? await caches.keys() : []
      const cacheName = ${JSON.stringify(FIELD_CACHE_NAME)}
      const cache = cacheNames.includes(cacheName) ? await caches.open(cacheName) : null
      return {
        swSupported: 'serviceWorker' in navigator,
        controlled: Boolean(navigator.serviceWorker?.controller),
        hasCache: cacheNames.includes(cacheName),
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

async function verifyMobileShell(send) {
  await setWorkspace(send, 'demo')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 1,
    mobile: true,
  })

  const routes = []
  for (const [route, expectedText] of ROUTES) routes.push(await inspectRoute(send, route, expectedText))

  await send('Page.navigate', { url: `${FRONTEND_URL}/app?smoke=${Date.now()}` })
  await delay(1800)
  const navigation = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const toggle = document.querySelector('[data-slot="sidebar-trigger"]')
      if (!toggle) return { ok: false, reason: 'mobile sidebar trigger missing' }
      toggle.click()
      for (let i = 0; i < 20 && !document.querySelector('[role="dialog"]'); i += 1) await wait(50)
      const dialog = document.querySelector('[role="dialog"]')
      const link = dialog?.querySelector('a[href="/documents"]')
      if (!link) return { ok: false, reason: 'Documents link missing from mobile sidebar' }
      link.click()
      for (let i = 0; i < 40; i += 1) {
        if (location.pathname === '/documents' && !document.querySelector('[role="dialog"]')) break
        await wait(50)
      }
      return {
        ok: location.pathname === '/documents' && !document.querySelector('[role="dialog"]'),
        route: location.pathname,
        sidebarClosed: !document.querySelector('[role="dialog"]')
      }
    })()
  `)
  if (!navigation.ok) throw new Error(`Mobile sidebar smoke failed: ${JSON.stringify(navigation)}`)
  return { routes: routes.length, navigation }
}

async function verifyDashboardDialog(send) {
  await setWorkspace(send, 'demo')
  await send('Page.navigate', { url: `${FRONTEND_URL}/app?smoke=${Date.now()}` })
  await delay(1800)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Benchmark Mode')
      if (!button) return { ok: false, reason: 'Benchmark Mode button missing' }
      button.click()
      for (let i = 0; i < 20 && !document.querySelector('[role="dialog"]'); i += 1) await wait(50)
      const dialog = document.querySelector('[role="dialog"]')
      const rows = dialog?.querySelectorAll('tbody tr').length || 0
      const close = [...(dialog?.querySelectorAll('button') || [])].find((item) => item.textContent?.trim() === 'Close')
      close?.click()
      for (let i = 0; i < 20 && document.querySelector('[role="dialog"]'); i += 1) await wait(50)
      return { ok: rows >= 15 && !document.querySelector('[role="dialog"]'), rows, closed: !document.querySelector('[role="dialog"]') }
    })()
  `)
  if (!result.ok) throw new Error(`Dashboard benchmark smoke failed: ${JSON.stringify(result)}`)
  return result
}

async function verifyCaptureStart(send) {
  await setWorkspace(send, 'demo')
  await send('Page.navigate', { url: `${FRONTEND_URL}/capture?smoke=${Date.now()}` })
  await delay(2200)
  const demoProtected = await evaluate(send, `
    (() => {
      const text = document.body.textContent || ''
      return text.includes('Demo workspace is read-only')
    })()
  `)
  if (!demoProtected) throw new Error('Expert Capture demo write protection missing')

  await setWorkspace(send, 'live')
  await send('Page.navigate', { url: `${FRONTEND_URL}/capture?smoke=${Date.now()}` })
  await delay(2200)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Begin Interview')
      if (!button) return { ok: false, reason: 'Begin Interview button missing' }
      button.click()
      for (let i = 0; i < 20 && !document.querySelector('textarea[aria-label^="Answer for:"]'); i += 1) await wait(50)
      const answer = document.querySelector('textarea[aria-label^="Answer for:"]')
      return { ok: Boolean(answer), question: answer?.getAttribute('aria-label') || '' }
    })()
  `)
  await setWorkspace(send, 'demo')
  if (!result.ok) throw new Error(`Expert Capture start smoke failed: ${JSON.stringify(result)}`)
  return result
}

async function verifyGraphDocumentHandoff(send) {
  await setWorkspace(send, 'demo')
  await send('Page.navigate', { url: `${FRONTEND_URL}/knowledge-graph?smoke=${Date.now()}` })
  await delay(2200)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const node = document.querySelector('[role="button"][aria-label^="Select P-204B"]')
      if (!node) return {
        ok: false,
        reason: 'P-204B graph node missing',
        workspace: localStorage.getItem('brian-ai-workspace'),
        text: (document.body.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300),
        graphLabels: [...document.querySelectorAll('[role="button"][aria-label]')].map((item) => item.getAttribute('aria-label')).slice(0, 10)
      }
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await wait(100)
      const filename = 'Incident-2023-07-15-P204B-Seal-Failure.pdf'
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes(filename))
      if (!button) return { ok: false, reason: 'related document button missing' }
      button.click()
      for (let i = 0; i < 60; i += 1) {
        const selected = [...document.querySelectorAll('button[aria-pressed="true"]')].some((item) => item.textContent?.includes(filename))
        if (location.pathname === '/copilot' && selected) return { ok: true, route: location.pathname, filename }
        await wait(50)
      }
      return { ok: false, route: location.pathname, reason: 'active document context not preserved' }
    })()
  `)
  if (!result.ok) throw new Error(`Graph document handoff smoke failed: ${JSON.stringify(result)}`)
  return result
}

async function verifyFieldInteraction(send) {
  await setWorkspace(send, 'demo')
  await send('Page.navigate', { url: `${FRONTEND_URL}/field?smoke=${Date.now()}` })
  await delay(1800)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const input = document.querySelector('input[aria-label="Manual equipment tag"]')
      const lookup = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Lookup')
      const sunlight = document.querySelector('[role="switch"][aria-label="Toggle sunlight mode"]')
      if (!input || !lookup || !sunlight) return { ok: false, reason: 'field controls missing' }
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, 'V-301')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      lookup.click()
      for (let i = 0; i < 80 && !document.querySelector('h1')?.textContent?.includes('V-301'); i += 1) await wait(50)
      sunlight.click()
      await wait(100)
      const sunlightApplied = Boolean(document.querySelector('main.sunlight-mode')) && document.querySelector('meta[name="theme-color"]')?.getAttribute('content') === '#ffffff'
      sunlight.click()
      return {
        ok: document.querySelector('h1')?.textContent?.includes('V-301') && sunlightApplied,
        tag: document.querySelector('h1')?.textContent || '',
        sunlightApplied
      }
    })()
  `)
  if (!result.ok) throw new Error(`Field interaction smoke failed: ${JSON.stringify(result)}`)
  return result
}

async function verifyDesktopSidebar(send) {
  await setWorkspace(send, 'demo')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: `${FRONTEND_URL}/app?smoke=${Date.now()}` })
  await delay(1800)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const sidebar = document.querySelector('[data-slot="sidebar"]')
      const toggle = document.querySelector('[data-slot="sidebar-trigger"]')
      if (!sidebar || !toggle) return { ok: false, reason: 'desktop sidebar controls missing' }
      toggle.click()
      for (let i = 0; i < 20 && sidebar.getAttribute('data-state') !== 'collapsed'; i += 1) await wait(50)
      const collapsed = sidebar.getAttribute('data-state') === 'collapsed'
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }))
      for (let i = 0; i < 20 && sidebar.getAttribute('data-state') !== 'expanded'; i += 1) await wait(50)
      return { ok: collapsed && sidebar.getAttribute('data-state') === 'expanded', collapsed, shortcutExpanded: sidebar.getAttribute('data-state') === 'expanded' }
    })()
  `)
  if (!result.ok) throw new Error(`Desktop sidebar smoke failed: ${JSON.stringify(result)}`)
  return result
}

async function verifyLandingCta(send) {
  await setWorkspace(send, 'demo')
  await send('Page.navigate', { url: `${FRONTEND_URL}/?smoke=${Date.now()}` })
  await delay(1200)
  const result = await evaluate(send, `
    (async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
      const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.includes('Open demo'))
      if (!button) return { ok: false, reason: 'primary homepage CTA missing' }
      button.click()
      for (let i = 0; i < 40; i += 1) {
        if (location.pathname === '/app' && (document.body.textContent || '').includes('Brian AI Command Center')) break
        await wait(50)
      }
      return {
        ok: location.pathname === '/app' && (document.body.textContent || '').includes('Brian AI Command Center'),
        route: location.pathname,
      }
    })()
  `)
  if (!result.ok) throw new Error(`Landing CTA smoke failed: ${JSON.stringify(result)}`)
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
    const landingCta = await verifyLandingCta(send)
    const compliance = await clickComplianceHandoff(send)
    const graph = await clickGraphPath(send)
    const fieldPwa = await verifyFieldPwa(send)
    await screenshot(send, path.join(SCREENSHOT_DIR, 'field-pwa.png'))
    const dashboardDialog = await verifyDashboardDialog(send)
    const capture = await verifyCaptureStart(send)
    const graphDocument = await verifyGraphDocumentHandoff(send)
    const fieldInteraction = await verifyFieldInteraction(send)
    const desktopSidebar = await verifyDesktopSidebar(send)
    const mobile = await verifyMobileShell(send)
    await send('Target.closeTarget', { targetId: target.id }).catch(() => undefined)
    ws.close()

    if (exceptions.length) throw new Error(`Browser exceptions: ${exceptions.join('\\n')}`)
    console.log(JSON.stringify({ routes: routes.length, landingCta, compliance, graph, fieldPwa, dashboardDialog, capture, graphDocument, fieldInteraction, desktopSidebar, mobile, screenshotDir: SCREENSHOT_DIR }, null, 2))
  } finally {
    child.kill()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
