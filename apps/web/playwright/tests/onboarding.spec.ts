import { test, expect } from '@playwright/test'

import { DashboardPage } from '../page-objects/DashboardPage'

test.describe('Onboarding — first session flow', () => {
  test('shows KB selection on first load', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await expect(page.getByText(/choose a knowledge base/i)).toBeVisible()
    await expect(dashboard.createKnowledgeBaseButton).toBeVisible()
    await expect(dashboard.useExistingButton).toBeVisible()
  })

  test('shows empty state when no knowledge bases exist', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    await dashboard.goto()

    await dashboard.useExistingButton.click()
    await expect(page.getByText(/no knowledge bases yet/i)).toBeVisible()
  })
})
