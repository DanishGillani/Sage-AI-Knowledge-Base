import type { Page, Locator } from '@playwright/test'

// Sidebar navigation helper — shared across all dashboard pages
export class DashboardPage {
  readonly page: Page
  readonly sidebarLogo: Locator
  readonly allKbsLink: Locator

  constructor(page: Page) {
    this.page = page
    this.sidebarLogo = page.getByRole('link', { name: /sage/i }).first()
    this.allKbsLink = page.getByRole('link', { name: /all knowledge bases/i })
  }

  async goto() {
    await this.page.goto('/dashboard')
  }
}
