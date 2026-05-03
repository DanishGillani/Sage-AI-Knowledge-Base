import type { Page, Locator } from '@playwright/test'

export class KnowledgeBasesPage {
  readonly page: Page
  readonly newButton: Locator
  readonly emptyStateHeading: Locator
  readonly createDialog: Locator
  readonly nameInput: Locator
  readonly descriptionInput: Locator
  readonly createSubmitButton: Locator
  readonly cancelButton: Locator

  constructor(page: Page) {
    this.page = page
    this.newButton = page.getByRole('button', { name: /^new$/i })
    this.emptyStateHeading = page.getByText('No knowledge bases yet')
    this.createDialog = page.getByRole('dialog', { name: /new knowledge base/i })
    this.nameInput = page.getByLabel(/name/i)
    this.descriptionInput = page.getByLabel(/description/i)
    this.createSubmitButton = this.createDialog.getByRole('button', { name: /^create$/i })
    this.cancelButton = this.createDialog.getByRole('button', { name: /cancel/i })
  }

  async goto() {
    await this.page.goto('/dashboard/knowledge-bases')
  }

  async openCreateDialog() {
    await this.newButton.click()
    await this.createDialog.waitFor({ state: 'visible' })
  }

  async fillCreateForm(name: string, description?: string) {
    await this.nameInput.fill(name)
    if (description) await this.descriptionInput.fill(description)
  }

  async submitCreate() {
    await this.createSubmitButton.click()
  }

  async createKb(name: string, description?: string) {
    await this.openCreateDialog()
    await this.fillCreateForm(name, description)
    await this.submitCreate()
  }

  getKbCard(name: string): Locator {
    // Scope to main to avoid matching the sidebar's KB navigation links
    return this.page.locator('main').getByRole('link', { name })
  }
}
