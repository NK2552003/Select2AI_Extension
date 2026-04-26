// ============================================================
// Select2AI Module: Knowledge Base
// Wrapper around background.js KB storage APIs
// ============================================================

/**
 * Save a snippet to the Knowledge Base
 * @param {object} params
 * @param {string} params.snippet  - The AI response text
 * @param {string} params.prompt   - The original prompt/query
 * @param {string} params.action   - The action used
 * @param {string[]} [params.tags] - Optional tags
 * @param {string} [params.url]    - Page URL
 * @param {string} [params.title]  - Page title
 */
export async function saveToKB(params) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'SAVE_KB',
      data: {
        snippet: params.snippet,
        prompt: params.prompt,
        action: params.action,
        tags: params.tags || [],
        url: params.url || location.href,
        title: params.title || document.title,
        savedAt: Date.now()
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Get all KB items, optionally filtered by search query
 */
export async function getKB(query = '') {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_KB', query }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response?.knowledgeBase || []);
      }
    });
  });
}

/**
 * Delete a KB item by id
 */
export async function deleteKBItem(id) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'DELETE_KB', id }, (response) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(response);
    });
  });
}

/**
 * Format a KB item for display
 */
export function formatKBItem(item) {
  const date = new Date(item.savedAt);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return {
    ...item,
    displayDate: `${dateStr} ${timeStr}`,
    snippetPreview: item.snippet?.slice(0, 200) + (item.snippet?.length > 200 ? '…' : ''),
    promptPreview: item.prompt?.slice(0, 100) + (item.prompt?.length > 100 ? '…' : '')
  };
}
