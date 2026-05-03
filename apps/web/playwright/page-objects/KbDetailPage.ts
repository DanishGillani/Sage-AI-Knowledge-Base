import type { Page, Locator } from '@playwright/test'

export class KbDetailPage {
  readonly page: Page
  readonly uploadZone: Locator
  readonly fileInput: Locator
  readonly documentList: Locator
  readonly askQuestionsButton: Locator
  readonly backButton: Locator
  readonly deleteButton: Locator

  constructor(page: Page) {
    this.page = page
    this.uploadZone = page.getByText(/drop files here/i)
    this.fileInput = page.locator('input[type="file"]')
    this.documentList = page.locator('.divide-y')
    this.askQuestionsButton = page.getByRole('button', { name: /ask questions/i })
    this.backButton = page.getByRole('button', { name: /back/i })
    this.deleteButton = page.getByRole('button', { name: /delete knowledge base/i })
  }

  async goto(id: string) {
    await this.page.goto(`/dashboard/knowledge-bases/${id}`)
  }

  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath)
  }
}
