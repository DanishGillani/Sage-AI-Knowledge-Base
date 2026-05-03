import type { Page, Locator } from '@playwright/test'

export class ChatPage {
  readonly page: Page
  readonly chatInput: Locator
  readonly sendButton: Locator
  readonly thinkingIndicator: Locator
  readonly errorBanner: Locator

  constructor(page: Page) {
    this.page = page
    this.chatInput = page.getByRole('textbox')
    this.sendButton = page.getByRole('button', { name: /send message/i })
    this.thinkingIndicator = page.getByText(/thinking/i)
    this.errorBanner = page.locator('.bg-destructive\\/10')
  }

  async goto(sessionId: string) {
    await this.page.goto(`/dashboard/sessions/${sessionId}`)
  }

  async sendMessage(content: string) {
    await this.chatInput.fill(content)
    await this.chatInput.press('Enter')
  }

  getMessageByContent(text: string): Locator {
    return this.page.getByText(text)
  }

  getUserMessages(): Locator {
    return this.page.locator('.rounded-br-sm')
  }

  getAssistantMessages(): Locator {
    return this.page.locator('.rounded-bl-sm')
  }
}
