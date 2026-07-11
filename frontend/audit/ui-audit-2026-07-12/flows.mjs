import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'

const { chromium } = await import(pathToFileURL('C:/tmp/brian-ai-browser-audit/node_modules/playwright/index.mjs').href)
const ROOT = fileURLToPath(new URL('.', import.meta.url))
const SCREENSHOTS = `${ROOT}screenshots\\`
await mkdir(SCREENSHOTS, { recursive: true })

const browser = await chromium.launch({ headless: true })
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const page = await desktop.newPage()
const mobilePage = await mobile.newPage()
const consoleMessages = []
const responses = []
page.on('console', (message) => consoleMessages.push({ type: message.type(), text: message.text() }))
page.on('response', (response) => { if (response.status() >= 400) responses.push({ url: response.url(), status: response.status() }) })

const results = {}
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await page.getByRole('link', { name: 'AI Copilot' }).click()
results.clientNavigation = page.url().endsWith('/copilot')

const query = page.getByRole('textbox', { name: 'Ask Brian AI' })
await query.fill('What caused the P-204B seal failure?')
await page.getByRole('button', { name: 'Send query' }).click()
await page.getByText(/P-204B seal failure/i).last().waitFor({ timeout: 5000 })
results.copilotSubmit = true
await page.screenshot({ path: `${SCREENSHOTS}final-flow-copilot-answer.png`, fullPage: true })

await page.goto('http://127.0.0.1:5173/documents', { waitUntil: 'networkidle' })
await page.locator('#document-ingest').setInputFiles({ name: 'audit-sample.txt', mimeType: 'text/plain', buffer: Buffer.from('P-204B vibration sample') })
await page.getByText('Document ingest').waitFor({ timeout: 5000 })
results.documentErrorState = await page.getByText(/Backend|unavailable|failed|error/i).count() > 0
await page.screenshot({ path: `${SCREENSHOTS}final-flow-documents-error.png`, fullPage: true })

await page.goto('http://127.0.0.1:5173/compliance', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Run Compliance Check' }).click()
await page.getByRole('heading', { name: /Clause register/i }).waitFor({ timeout: 5000 })
results.complianceRun = await page.getByText(/Compliant|Non-compliant|Partial/i).count() > 0
await page.screenshot({ path: `${SCREENSHOTS}final-flow-compliance-result.png`, fullPage: true })

await page.goto('http://127.0.0.1:5173/capture', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Begin Interview' }).click()
results.captureFormAdvance = await page.getByRole('heading', { name: /Describe a critical failure/i }).count() > 0
await page.screenshot({ path: `${SCREENSHOTS}final-flow-capture-question.png`, fullPage: true })

await mobilePage.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
await mobilePage.getByRole('button', { name: 'Toggle Sidebar' }).click()
results.mobileNavigationOpens = await mobilePage.getByRole('link', { name: 'AI Copilot' }).isVisible()
await mobilePage.screenshot({ path: `${SCREENSHOTS}final-flow-mobile-nav.png`, fullPage: true })

const active = await page.evaluate(() => ({ tag: document.activeElement?.tagName, name: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 40) }))
results.focusedElementAfterFlow = active
await writeFile(`${ROOT}flows.json`, JSON.stringify({ results, consoleMessages, responses }, null, 2))
await desktop.close()
await mobile.close()
await browser.close()
console.log(JSON.stringify({ results, consoleMessages, responses }, null, 2))
