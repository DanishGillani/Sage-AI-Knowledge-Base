import { test, expect } from '@playwright/test'

import { KnowledgeBasesPage } from '../page-objects/KnowledgeBasesPage'
import { KbDetailPage } from '../page-objects/KbDetailPage'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const EMPTY_LIST = { data: { items: [], total: 0, page: 1, limit: 20, hasNextPage: false } }

const KB_FIXTURE = {
  id: 'cltest000000000000000000001',
  name: 'Product Docs',
  description: 'Internal product documentation',
  documentCount: 2,
  readyDocumentCount: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const LIST_WITH_ONE = {
  data: { items: [KB_FIXTURE], total: 1, page: 1, limit: 20, hasNextPage: false },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockKbList(page: ReturnType<typeof test['info']>['fn'] extends never ? never : Parameters<Parameters<typeof test>[1]>[0]['page'], payload: object) {
  return page.route('/api/knowledge-bases*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) }),
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Knowledge Bases list', () => {
  test('redirects / to /dashboard/knowledge-bases', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/dashboard/knowledge-bases')
  })

  test('shows empty state when no knowledge bases exist', async ({ page }) => {
    await page.route('/api/knowledge-bases*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_LIST) }),
    )

    const kbPage = new KnowledgeBasesPage(page)
    await kbPage.goto()

    await expect(kbPage.emptyStateHeading).toBeVisible()
    await expect(page.getByText('Create one to start uploading documents.')).toBeVisible()
    await expect(page.getByRole('button', { name: /create knowledge base/i })).toBeVisible()
  })

  test('renders KB cards when knowledge bases exist', async ({ page }) => {
    await page.route('/api/knowledge-bases*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LIST_WITH_ONE) }),
    )
    await page.route('/api/sessions*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 8, hasNextPage: false } }) }),
    )

    const kbPage = new KnowledgeBasesPage(page)
    await kbPage.goto()

    await expect(kbPage.getKbCard('Product Docs')).toBeVisible()
    await expect(page.getByText('2 docs')).toBeVisible()
    await expect(page.getByText('Ready')).toBeVisible()
  })
})

test.describe('Create Knowledge Base dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/knowledge-bases*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_LIST) }),
    )
  })

  test('opens and closes with Escape', async ({ page }) => {
    const kbPage = new KnowledgeBasesPage(page)
    await kbPage.goto()
    await kbPage.openCreateDialog()

    await expect(kbPage.createDialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(kbPage.createDialog).not.toBeVisible()
  })

  test('shows validation error when name is empty', async ({ page }) => {
    const kbPage = new KnowledgeBasesPage(page)
    await kbPage.goto()
    await kbPage.openCreateDialog()

    // Submit button should be disabled with empty name
    await expect(kbPage.createSubmitButton).toBeDisabled()
  })

  test('creates a KB and redirects to detail page', async ({ page }) => {
    const kbPage = new KnowledgeBasesPage(page)
    await kbPage.goto()

    // Mock POST + subsequent GET
    await page.route('/api/knowledge-bases', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: KB_FIXTURE }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(EMPTY_LIST),
        })
      }
    })
    await page.route(`/api/knowledge-bases/${KB_FIXTURE.id}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: KB_FIXTURE }),
      }),
    )
    await page.route(`/api/knowledge-bases/${KB_FIXTURE.id}/documents*`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    )

    await kbPage.openCreateDialog()
    await kbPage.fillCreateForm('Product Docs', 'Internal product docs')
    await kbPage.submitCreate()

    await expect(page).toHaveURL(`/dashboard/knowledge-bases/${KB_FIXTURE.id}`)
  })
})

test.describe('Knowledge Base detail page', () => {
  test('renders the document uploader and document list', async ({ page }) => {
    await page.route(`/api/knowledge-bases/${KB_FIXTURE.id}`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: KB_FIXTURE }) }),
    )
    await page.route(`/api/knowledge-bases/${KB_FIXTURE.id}/documents*`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    )

    const detailPage = new KbDetailPage(page)
    await detailPage.goto(KB_FIXTURE.id)

    await expect(detailPage.uploadZone).toBeVisible()
    await expect(page.getByText('Upload documents')).toBeVisible()
    await expect(page.getByText('No documents yet')).toBeVisible()
  })

  test('"Ask questions" button is disabled with no ready documents', async ({ page }) => {
    const kbNoReady = { ...KB_FIXTURE, documentCount: 0, readyDocumentCount: 0 }

    await page.route(`/api/knowledge-bases/${kbNoReady.id}`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: kbNoReady }) }),
    )
    await page.route(`/api/knowledge-bases/${kbNoReady.id}/documents*`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) }),
    )

    const detailPage = new KbDetailPage(page)
    await detailPage.goto(kbNoReady.id)

    await expect(detailPage.askQuestionsButton).toBeDisabled()
  })
})
