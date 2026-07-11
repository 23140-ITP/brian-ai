import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL('C:/tmp/brian-ai-browser-audit/node_modules/playwright/index.mjs').href)

const BASE = 'http://127.0.0.1:5173'
const phase = process.argv[2] || 'baseline'
const ROOT = fileURLToPath(new URL('.', import.meta.url))
const SCREENSHOTS = `${ROOT}screenshots\\`
const ROUTES = [
  ['dashboard', '/'],
  ['copilot', '/copilot'],
  ['knowledge-graph', '/knowledge-graph'],
  ['compliance', '/compliance'],
  ['documents', '/documents'],
  ['capture', '/capture'],
  ['settings', '/settings'],
  ['field', '/field'],
]

await mkdir(SCREENSHOTS, { recursive: true })

async function inspectPage(page, name, route, viewportName, width, height) {
  await page.setViewportSize({ width, height })
  const consoleMessages = []
  const failedRequests = []
  const onConsole = (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() })
  const onRequestFailed = (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText })
  page.on('console', onConsole)
  page.on('requestfailed', onRequestFailed)
  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(500)
  } catch (error) {
    page.off('console', onConsole)
    page.off('requestfailed', onRequestFailed)
    return { route, viewport: viewportName, navigationError: String(error) }
  }
  const screenshotPath = `${SCREENSHOTS}${phase}-${name}-${viewportName}.png`
  await page.screenshot({ path: screenshotPath, fullPage: true })
  const inspection = await page.evaluate(() => {
    const interactive = [...document.querySelectorAll('a,button,input,select,textarea,[role="button"]')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        name: (el.getAttribute('aria-label') || (el.labels?.[0]?.innerText) || el.innerText || el.getAttribute('placeholder') || '').trim().slice(0, 80),
        width: Math.round(el.getBoundingClientRect().width),
        height: Math.round(el.getBoundingClientRect().height),
        disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
      }))
    return {
      title: document.title,
      url: location.pathname,
      h1Count: document.querySelectorAll('h1').length,
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((el) => ({ tag: el.tagName, text: el.innerText.trim().slice(0, 100) })),
      bodyWidth: Math.round(document.body.scrollWidth),
      viewportWidth: Math.round(window.innerWidth),
      horizontalOverflow: document.body.scrollWidth > window.innerWidth + 1,
      interactiveCount: interactive.length,
      unlabeledInteractive: interactive.filter((item) => !item.name),
      undersizedTouchTargets: interactive.filter((item) => item.width < 44 || item.height < 44).slice(0, 30),
      nativeSelectCount: document.querySelectorAll('select').length,
      dialogCount: document.querySelectorAll('[role="dialog"]').length,
    }
  })
  page.off('console', onConsole)
  page.off('requestfailed', onRequestFailed)
  return { route, viewport: viewportName, screenshot: screenshotPath, inspection, console: consoleMessages, failedRequests }
}

const browser = await chromium.launch({ headless: true })
const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const desktopPage = await desktopContext.newPage()
const mobilePage = await mobileContext.newPage()
const results = []
for (const [name, route] of ROUTES) {
  results.push(await inspectPage(desktopPage, name, route, 'desktop', 1440, 1000))
  results.push(await inspectPage(mobilePage, name, route, 'mobile', 390, 844))
}

await desktopPage.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await desktopPage.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
const interactions = {}
const desktopSearch = desktopPage.getByRole('button', { name: /Search workflows|Search/ }).first()
if (await desktopSearch.count()) {
  await desktopSearch.click()
  interactions.searchDialogOpened = (await desktopPage.getByRole('dialog').count()) > 0
  await desktopPage.keyboard.press('Escape')
}
const theme = desktopPage.getByRole('button', { name: 'Change color theme' }).first()
if (await theme.count()) {
  await theme.click()
  interactions.themeMenuOpened = (await desktopPage.getByRole('menu').count()) > 0
  await desktopPage.keyboard.press('Escape')
}
const benchmark = desktopPage.getByRole('button', { name: /Benchmark mode/i }).first()
if (await benchmark.count()) {
  await benchmark.click()
  interactions.benchmarkDialogOpened = (await desktopPage.getByRole('dialog').count()) > 0
  await desktopPage.keyboard.press('Escape')
}
const interactionScreenshot = `${SCREENSHOTS}${phase}-dashboard-interactions.png`
await desktopPage.screenshot({ path: interactionScreenshot, fullPage: true })
await writeFile(`${ROOT}${phase}.json`, JSON.stringify({ base: BASE, results, interactions }, null, 2))
await desktopContext.close()
await mobileContext.close()
await browser.close()
console.log(JSON.stringify({ routes: results.length, interactions, screenshotRoot: SCREENSHOTS }, null, 2))
