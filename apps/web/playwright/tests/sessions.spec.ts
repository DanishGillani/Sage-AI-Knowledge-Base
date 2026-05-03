import { test, expect } from '@playwright/test'

import { ChatPage } from '../page-objects/ChatPage'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSION_ID = 'cltest000000000000000000010'
const KB_ID = 'cltest000000000000000000001'

const SESSION_FIXTURE = {
  id: SESSION_ID,
  title: 'Q&A about Product Docs',
  mode: 'PROFESSIONAL',
  knowledgeBaseId: KB_ID,
  knowledgeBaseName: 'Product Docs',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const USER_MSG = {
  id: 'cltest000000000000000000020',
  sessionId: SESSION_ID,
  role: 'USER',
  content: 'What is Sage?',
  sources: [],
  createdAt: new Date().toISOString(),
}

const ASSISTANT_MSG = {
  id: 'cltest000000000000000000021',
  sessionId: SESSION_ID,
  role: 'ASSISTANT',
  content: 'Sage is an AI-powered knowledge base that lets you upload documents and ask questions.',
  sources: [
    {
      documentId: 'cldoc0000000000000000000001',
      filename: 'product-overview.pdf',
      pageNumber: 1,
      excerpt: 'Sage is an AI-powered knowledge base...',
      similarityScore: 0.92,
    },
  ],
  createdAt: new Date().toISOString(),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Chat session page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`/api/sessions/${SESSION_ID}`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: SESSION_FIXTURE }) }),
    )
  })

  test('renders empty state with correct prompt', async ({ page }) => {
    await page.route(`/api/sessions/${SESSION_ID}/messages`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    )

    const chatPage = new ChatPage(page)
    await chatPage.goto(SESSION_ID)

    await expect(page.getByText('Start the conversation')).toBeVisible()
    await expect(page.getByText(/ask anything about/i)).toBeVisible()
    await expect(page.locator('strong').getByText('Product Docs')).toBeVisible()
  })

  test('renders existing messages', async ({ page }) => {
    await page.route(`/api/sessions/${SESSION_ID}/messages`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [USER_MSG, ASSISTANT_MSG] }),
      }),
    )

    const chatPage = new ChatPage(page)
    await chatPage.goto(SESSION_ID)

    await expect(chatPage.getMessageByContent('What is Sage?')).toBeVisible()
    await expect(chatPage.getMessageByContent(/ai-powered knowledge base/i)).toBeVisible()
  })

  test('shows source attribution toggle on assistant messages', async ({ page }) => {
    await page.route(`/api/sessions/${SESSION_ID}/messages`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [USER_MSG, ASSISTANT_MSG] }),
      }),
    )

    const chatPage = new ChatPage(page)
    await chatPage.goto(SESSION_ID)

    // Sources toggle button should show
    const sourcesButton = page.getByText(/1 source/i)
    await expect(sourcesButton).toBeVisible()

    // Expand sources
    await sourcesButton.click()
    await expect(page.getByText('product-overview.pdf')).toBeVisible()
    await expect(page.getByText('92% match')).toBeVisible()
  })

  test('sends a message and shows the response', async ({ page }) => {
    let fetchCount = 0
    await page.route(`/api/sessions/${SESSION_ID}/messages`, async (route) => {
      fetchCount++
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: ASSISTANT_MSG }),
        })
      } else {
        // On re-fetch after POST, return the full conversation
        const messages = fetchCount > 1 ? [USER_MSG, ASSISTANT_MSG] : []
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: messages }),
        })
      }
    })

    const chatPage = new ChatPage(page)
    await chatPage.goto(SESSION_ID)

    await chatPage.sendMessage('What is Sage?')

    // After the POST resolves and messages are re-fetched, the assistant reply appears
    await expect(chatPage.getMessageByContent(/ai-powered knowledge base/i)).toBeVisible()
  })

  test('shows OLLAMA_UNAVAILABLE error banner', async ({ page }) => {
    await page.route(`/api/sessions/${SESSION_ID}/messages`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) })
      } else {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'OLLAMA_UNAVAILABLE', message: 'Ollama is not running' }),
        })
      }
    })

    const chatPage = new ChatPage(page)
    await chatPage.goto(SESSION_ID)
    await chatPage.sendMessage('What is Sage?')

    await expect(page.getByText(/AI model is unavailable/i)).toBeVisible()
  })

  test('header shows session title, mode badge, and KB name', async ({ page }) => {
    await page.route(`/api/sessions/${SESSION_ID}/messages`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    )

    const chatPage = new ChatPage(page)
    await chatPage.goto(SESSION_ID)

    await expect(page.getByText('Q&A about Product Docs')).toBeVisible()
    await expect(page.getByText('Professional')).toBeVisible()
    await expect(page.locator('header').getByText('Product Docs', { exact: true })).toBeVisible()
  })
})
