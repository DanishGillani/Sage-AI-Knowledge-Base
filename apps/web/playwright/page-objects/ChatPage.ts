import type { Page, Locator } from '@playwright/test'

export class ChatPage {
  readonly page: Page
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly messageList: Locator
  readonly modeSelector: Locator
  readonly knowledgeBaseBadge: Locator

  constructor(page: Page) {
    this.page = page
    this.messageInput = page.getByRole('textbox', { name: /ask a question/i })
    this.sendButton = page.getByRole('button', { name: /send/i })
    this.messageList = page.getByTestId('message-list')
    this.modeSelector = page.getByTestId('mode-selector')
    this.knowledgeBaseBadge = page.getByTestId('knowledge-base-badge')
  }

  async sendMessage(content: string) {
    await this.messageInput.fill(content)
    await this.sendButton.click()
  }

  async sendMessageWithKeyboard(content: string) {
    await this.messageInput.fill(content)
    await this.messageInput.press('Meta+Enter')
  }

  async waitForResponse() {
    // Wait for the streaming indicator to appear then disappear
    await this.page.getByTestId('streaming-indicator').waitFor({ state: 'visible' })
    await this.page.getByTestId('streaming-indicator').waitFor({ state: 'hidden', timeout: 60_000 })
  }

  async getLastAssistantMessage(): Promise<string> {
    const messages = this.messageList.getByTestId('message-assistant')
    const last = messages.last()
    return last.getByTestId('message-content').innerText()
  }

  async switchMode(mode: string) {
    await this.modeSelector.click()
    await this.page.getByRole('option', { name: mode }).click()
  }
}
