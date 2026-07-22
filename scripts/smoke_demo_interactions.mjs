import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const frontendUrl = process.env.BRIAN_AI_FRONTEND_URL || 'http://127.0.0.1:5183'
const debugPort = Number(process.env.BRIAN_AI_CDP_PORT || 9232)
const screenshotDir = process.env.BRIAN_AI_SMOKE_SCREENSHOT_DIR || path.join(os.tmpdir(), 'brian-ai-demo-qa')

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function browserPath() {
  const candidates = [
    process.env.CHROME_BIN,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean)
  const browser = candidates.find((candidate) => fs.existsSync(candidate))
  if (!browser) throw new Error('Chrome or Edge is required for Demo interaction smoke tests.')
  return browser
}

async function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  const pending = new Map()
  const exceptions = []
  let sequence = 0
  socket.addEventListener('message', (message) => {
    const payload = JSON.parse(message.data)
    if (payload.id && pending.has(payload.id)) {
      const callback = pending.get(payload.id)
      pending.delete(payload.id)
      payload.error ? callback.reject(new Error(JSON.stringify(payload.error))) : callback.resolve(payload.result || {})
    } else if (payload.method === 'Runtime.exceptionThrown') {
      exceptions.push(payload.params?.exceptionDetails?.exception?.description || payload.params?.exceptionDetails?.text || 'Browser exception')
    }
  })
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence
    pending.set(id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params }))
  })
  await send('Page.enable')
  await send('Runtime.enable')
  return { socket, send, exceptions }
}

async function evaluate(send, expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return result.result.value
}

async function navigate(send, route) {
  await send('Page.navigate', { url: `${frontendUrl}${route}?demo-smoke=${Date.now()}` })
  await wait(1800)
  await evaluate(send, `localStorage.setItem('brian-ai-workspace', 'demo')`)
}

async function setFile(send, selector, filePath) {
  const document = await send('DOM.getDocument', { depth: -1, pierce: true })
  const input = await send('DOM.querySelector', { nodeId: document.root.nodeId, selector })
  if (!input.nodeId) throw new Error(`File input missing: ${selector}`)
  await send('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [filePath] })
}

async function captureInterview(send) {
  await navigate(send, '/capture')
  return evaluate(send, `(async () => {
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const click = (label) => [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === label)?.click()
    click('Begin Interview')
    for (let question = 1; question <= 5; question += 1) {
      for (let retry = 0; retry < 30 && !document.querySelector('textarea'); retry += 1) await pause(50)
      const textarea = document.querySelector('textarea')
      const currentLabel = textarea?.getAttribute('aria-label') || ''
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(textarea, 'Demo answer with evidence, warning signs, and the recommended next action.')
      textarea?.dispatchEvent(new Event('input', { bubbles: true }))
      click(question === 5 ? 'Review Answers' : 'Next Question')
      for (let retry = 0; retry < 30; retry += 1) {
        const nextLabel = document.querySelector('textarea')?.getAttribute('aria-label') || ''
        if (question === 5 ? document.body.textContent?.includes('Review captured expertise before ingest') : nextLabel !== currentLabel) break
        await pause(50)
      }
    }
    for (let retry = 0; retry < 30 && ![...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Submit & Ingest')); retry += 1) await pause(50)
    click('Submit & Ingest')
    for (let retry = 0; retry < 50 && !document.body.textContent?.includes('Expert knowledge ingested'); retry += 1) await pause(50)
    return { ok: document.body.textContent?.includes('Expert knowledge ingested'), text: document.body.textContent?.match(/Expert-Interview-[^\s]+/)?.[0] || '', preview: document.body.textContent?.trim().replace(/\s+/g, ' ').slice(-300) || '' }
  })()`)
}

async function benchmarkSpotCheck(send) {
  await navigate(send, '/app')
  return evaluate(send, `(async () => {
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const benchmark = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Benchmark Mode')
    benchmark?.click()
    for (let retry = 0; retry < 40 && !document.querySelector('[role="dialog"]'); retry += 1) await pause(50)
    const spotCheck = [...document.querySelectorAll('[role="dialog"] button')].find((button) => button.textContent?.trim() === 'Spot-check')
    spotCheck?.click()
    for (let retry = 0; retry < 40 && !document.body.textContent?.includes('Demo replay matched'); retry += 1) await pause(50)
    return { ok: document.body.textContent?.includes('Demo replay matched'), result: document.querySelector('.text-info')?.textContent || '' }
  })()`)
}

async function graphPath(send) {
  await navigate(send, '/knowledge-graph')
  return evaluate(send, `(async () => {
    const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const button = [...document.querySelectorAll('button')].find((item) => /Shortest path|Find evidence/.test(item.textContent || ''))
    button?.click()
    for (let retry = 0; retry < 40 && !document.body.textContent?.includes('path found'); retry += 1) await pause(50)
    return { ok: document.body.textContent?.includes('1 path found'), status: [...document.querySelectorAll('[data-slot="alert-description"]')].at(-1)?.textContent || '' }
  })()`)
}

async function demoUploads(send) {
  const fixture = path.join(os.tmpdir(), 'P-204B-demo-evidence.txt')
  fs.writeFileSync(fixture, 'P-204B demo evidence fixture')
  try {
    await navigate(send, '/documents')
    await setFile(send, '#document-ingest', fixture)
    await wait(600)
    const documentResult = await evaluate(send, `({ ok: document.body.textContent?.includes('Ingested P-204B-demo-evidence.txt: 12 chunks') && document.body.textContent?.includes('Simulated demo') && document.body.textContent?.includes('not extracted from the uploaded file'), text: [...document.querySelectorAll('[aria-live="polite"]')].map((item) => item.textContent).join(' ') })`)
    await navigate(send, '/field')
    await setFile(send, '#field-nameplate-upload', fixture)
    await wait(800)
    const fieldResult = await evaluate(send, `({ ok: document.body.textContent?.includes('Simulated demo tag P-204B'), text: document.body.textContent?.includes('Simulated demo tag P-204B') ? 'P-204B simulated tag' : '' })`)
    return { document: documentResult, field: fieldResult }
  } finally {
    fs.rmSync(fixture, { force: true })
  }
}

async function screenshot(send, filename) {
  fs.mkdirSync(screenshotDir, { recursive: true })
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.join(screenshotDir, filename), Buffer.from(result.data, 'base64'))
}

async function main() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'brian-ai-demo-interactions-'))
  const child = spawn(browserPath(), ['--headless=new', '--disable-gpu', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${userDataDir}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
  try {
    await wait(1600)
    const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(frontendUrl)}`, { method: 'PUT' }).then((response) => response.json())
    const { socket, send, exceptions } = await connect(target)
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
    const capture = await captureInterview(send)
    await screenshot(send, 'expert-capture-after.png')
    const benchmark = await benchmarkSpotCheck(send)
    const graph = await graphPath(send)
    const uploads = await demoUploads(send)
    await screenshot(send, 'demo-interactions-after.png')
    const results = { capture, benchmark, graph, uploads }
    if (exceptions.length || Object.values({ capture: capture.ok, benchmark: benchmark.ok, graph: graph.ok, document: uploads.document.ok, field: uploads.field.ok }).some((ok) => !ok)) {
      throw new Error(JSON.stringify({ results, exceptions }, null, 2))
    }
    console.log(JSON.stringify({ results, screenshot: path.join(screenshotDir, 'demo-interactions-after.png') }, null, 2))
    socket.close()
  } finally {
    child.kill()
    if (child.exitCode === null) await Promise.race([new Promise((resolve) => child.once('exit', resolve)), wait(2000)])
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
