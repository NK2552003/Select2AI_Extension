// ============================================================
// Select2AI Module: Chat History (Multi-turn conversation)
// Manages per-tab conversation threads in memory
// ============================================================

export class ChatHistory {
  constructor() {
    // Map of tabId -> conversation array
    this._conversations = new Map();
    this._maxTurns = 20; // Keep last 20 message pairs per tab
  }

  /**
   * Add a user message + assistant response to the current tab's conversation
   */
  addTurn(tabKey, userMessage, assistantMessage) {
    if (!this._conversations.has(tabKey)) {
      this._conversations.set(tabKey, []);
    }
    const convo = this._conversations.get(tabKey);
    convo.push({ role: 'user', content: userMessage });
    convo.push({ role: 'assistant', content: assistantMessage });

    // Trim to max turns (pairs)
    const maxMessages = this._maxTurns * 2;
    if (convo.length > maxMessages) {
      convo.splice(0, convo.length - maxMessages);
    }
  }

  /**
   * Get the conversation history for a tab key (for sending to API)
   */
  getHistory(tabKey) {
    return this._conversations.get(tabKey) || [];
  }

  /**
   * Get formatted messages for display in the chat UI
   */
  getDisplayMessages(tabKey) {
    const history = this._conversations.get(tabKey) || [];
    const messages = [];
    for (let i = 0; i < history.length; i += 2) {
      messages.push({
        user: history[i]?.content || '',
        assistant: history[i + 1]?.content || ''
      });
    }
    return messages;
  }

  /**
   * Clear conversation for a specific tab
   */
  clearTab(tabKey) {
    this._conversations.delete(tabKey);
  }

  /**
   * Clear all conversations
   */
  clearAll() {
    this._conversations.clear();
  }

  /**
   * Check if a tab has an active conversation
   */
  hasConversation(tabKey) {
    const h = this._conversations.get(tabKey);
    return h && h.length > 0;
  }

  /**
   * Get turn count for a tab
   */
  getTurnCount(tabKey) {
    const h = this._conversations.get(tabKey) || [];
    return Math.floor(h.length / 2);
  }
}

// Singleton instance for the content script
export const chatHistory = new ChatHistory();
