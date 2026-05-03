import { test, expect } from '@playwright/test'

import { DashboardPage } from '../page-objects/DashboardPage'

// Smoke tests — verify the dashboard shell renders correctly

test.describe('Dashboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Stub out API calls so the shell renders without a live backend
    await page.route('/api/knowledge-bases*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 6, hasNextPage: false } }),
      }),
    )
    await page.route('/api/sessions*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items: [], total: 0, page: 1, limit: 8, hasNextPage: false } }),
      }),
    )
  })

  test('redirects / to /dashboard/knowledge-bases', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/dashboard/knowledge-bases')
  })

  test('sidebar is visible on the dashboard', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await expect(dashboard.sidebarLogo).toBeVisible()
    await expect(dashboard.allKbsLink).toBeVisible()
  })

  test('sidebar shows "No chats yet" with empty sessions', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await expect(page.getByText('No chats yet')).toBeVisible()
  })
})
