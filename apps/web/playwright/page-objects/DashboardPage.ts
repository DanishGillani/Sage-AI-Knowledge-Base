import type { Page, Locator } from '@playwright/test'

export class DashboardPage {
  readonly page: Page
  readonly createKnowledgeBaseButton: Locator
  readonly useExistingButton: Locator
  readonly knowledgeBaseList: Locator

  constructor(page: Page) {
    this.page = page
    this.createKnowledgeBaseButton = page.getByRole('button', { name: /create new knowledge base/i })
    this.useExistingButton = page.getByRole('button', { name: /use existing/i })
    this.knowledgeBaseList = page.getByTestId('knowledge-base-list')
  }

  async goto() {
    await this.page.goto('/dashboard')
  }

  async createNewKnowledgeBase(name: string, description?: string) {
    await this.createKnowledgeBaseButton.click()
    await this.page.getByLabel(/knowledge base name/i).fill(name)
    if (description) {
      await this.page.getByLabel(/description/i).fill(description)
    }
  }

  async selectKnowledgeBase(name: string) {
    await this.knowledgeBaseList.getByText(name).click()
  }
}
