// ============================================================
// Select2AI Background Service Worker v2.0
// Handles: API calls (streaming), context menus, storage APIs,
//          keyboard command routing, history & knowledge base
// ============================================================

// ── Context Menu Setup ──────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'select2ai-summarize-page',
      title: 'Select2AI: Summarize This Page',
      contexts: ['page', 'selection']
    });
    chrome.contextMenus.create({
      id: 'select2ai-explain-selection',
      title: 'Select2AI: Explain Selection',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'select2ai-separator',
      type: 'separator',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'select2ai-translate',
      title: 'Select2AI: Translate Selection',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'select2ai-find-bugs',
      title: 'Select2AI: Find Bugs in Code',
      contexts: ['selection']
    });
  });
});

// ── Context Menu Click Handler ───────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const actions = {
    'select2ai-summarize-page': 'summarize-page',
    'select2ai-explain-selection': 'explain',
    'select2ai-translate': 'translate',
    'select2ai-find-bugs': 'find-bugs'
  };

  const action = actions[info.menuItemId];
  if (!action) return;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (action, selectionText) => {
        window.dispatchEvent(new CustomEvent('select2ai-context-action', {
          detail: { action, selectionText }
        }));
      },
      args: [action, info.selectionText || '']
    });
  } catch (e) {
    console.error('Select2AI context action error:', e);
  }
});

// ── Keyboard Command Handler ─────────────────────────────────
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (cmd) => {
        window.dispatchEvent(new CustomEvent('select2ai-command', {
          detail: { command: cmd }
        }));
      },
      args: [command]
    });
  } catch (e) {
    console.error('Select2AI command error:', e);
  }
});

// ── Message Router ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'QUERY_AI':
      handleAIQuery(message, sender, sendResponse);
      return true; // async

    case 'QUERY_AI_STREAM':
      handleStreamingQuery(message, sender, sendResponse);
      return true;

    case 'SAVE_HISTORY':
      saveHistory(message.data).then(sendResponse);
      return true;

    case 'GET_HISTORY':
      getHistory(message.filter).then(sendResponse);
      return true;

    case 'DELETE_HISTORY':
      deleteHistory(message.id).then(sendResponse);
      return true;

    case 'CLEAR_HISTORY':
      clearHistory().then(sendResponse);
      return true;

    case 'SAVE_KB':
      saveKnowledgeBase(message.data).then(sendResponse);
      return true;

    case 'GET_KB':
      getKnowledgeBase(message.query).then(sendResponse);
      return true;

    case 'DELETE_KB':
      deleteKnowledgeBase(message.id).then(sendResponse);
      return true;

    case 'GET_PAGE_CONTEXT':
      getPageContext(sender.tab).then(sendResponse);
      return true;

    case 'SUMMARIZE_PAGE':
      handlePageSummarize(message, sender, sendResponse);
      return true;
  }
});

// ── AI Query (non-streaming) ─────────────────────────────────
async function handleAIQuery(message, sender, sendResponse) {
  try {
    const { prompt, model, systemPrompt, pageContext } = message;
    const settings = await getSettings();
    const token = settings.githubToken;
    const selectedModel = model || settings.model || 'openai/gpt-4o-mini';
    const endpoint = settings.endpoint || 'https://models.github.ai/inference';

    if (!token) {
      sendResponse({ error: 'No GitHub token configured. Please check extension options.' });
      return;
    }

    const messages = [];
    let sysContent = systemPrompt || 'You are a helpful AI assistant. Format responses in Markdown when appropriate.';
    if (pageContext) {
      sysContent += `\n\nPage Context:\nTitle: ${pageContext.title}\nURL: ${pageContext.url}\nDescription: ${pageContext.description || 'N/A'}`;
    }
    messages.push({ role: 'system', content: sysContent });

    if (message.conversationHistory?.length) {
      messages.push(...message.conversationHistory);
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: 2048,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.text();
      sendResponse({ error: `API Error ${response.status}: ${err}` });
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    sendResponse({ content, model: selectedModel });

    // Auto-save to history
    if (message.autoSave !== false && sender.tab) {
      await autoSaveToHistory({
        prompt,
        response: content,
        model: selectedModel,
        action: message.action,
        url: sender.tab.url,
        title: sender.tab.title,
        timestamp: Date.now()
      });
    }
  } catch (e) {
    sendResponse({ error: e.message });
  }
}

// ── AI Query (streaming via SSE) ────────────────────────────
async function handleStreamingQuery(message, sender, sendResponse) {
  try {
    const { prompt, model, systemPrompt, pageContext, tabId } = message;
    const settings = await getSettings();
    const token = settings.githubToken;
    const selectedModel = model || settings.model || 'openai/gpt-4o-mini';
    const endpoint = settings.endpoint || 'https://models.github.ai/inference';

    if (!token) {
      sendResponse({ error: 'No GitHub token configured.' });
      return;
    }

    const messages = [];
    let sysContent = systemPrompt || 'You are a helpful AI assistant. Format responses in Markdown when appropriate.';
    if (pageContext) {
      sysContent += `\n\nPage Context:\nTitle: ${pageContext.title}\nURL: ${pageContext.url}`;
    }
    messages.push({ role: 'system', content: sysContent });
    if (message.conversationHistory?.length) {
      messages.push(...message.conversationHistory);
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: 2048,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      const err = await response.text();
      sendResponse({ error: `API Error ${response.status}: ${err}` });
      return;
    }

    sendResponse({ started: true, model: selectedModel });

    const targetTab = tabId || sender.tab?.id;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            if (targetTab) {
              chrome.tabs.sendMessage(targetTab, {
                type: 'STREAM_CHUNK',
                chunk: delta,
                streamId: message.streamId
              }).catch(() => {});
            }
          }
        } catch {}
      }
    }

    if (targetTab) {
      chrome.tabs.sendMessage(targetTab, {
        type: 'STREAM_DONE',
        fullContent,
        streamId: message.streamId,
        model: selectedModel
      }).catch(() => {});
    }

    if (message.autoSave !== false && sender.tab) {
      await autoSaveToHistory({
        prompt,
        response: fullContent,
        model: selectedModel,
        action: message.action,
        url: sender.tab.url,
        title: sender.tab.title,
        timestamp: Date.now()
      });
    }
  } catch (e) {
    sendResponse({ error: e.message });
  }
}

// ── Page Summarize ───────────────────────────────────────────
async function handlePageSummarize(message, sender, sendResponse) {
  const pageText = message.pageText?.slice(0, 8000) || '';
  await handleAIQuery({
    ...message,
    prompt: `Please provide a comprehensive summary of this webpage content:\n\n${pageText}`,
    action: 'summarize-page',
    autoSave: true
  }, sender, sendResponse);
}

// ── Settings Helper ──────────────────────────────────────────
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({
      githubToken: '',
      model: 'openai/gpt-4o-mini',
      endpoint: 'https://models.github.ai/inference',
      streamingEnabled: true,
      pageContextDefault: false
    }, resolve);
  });
}

// ── History Storage ──────────────────────────────────────────
async function autoSaveToHistory(entry) {
  return saveHistory(entry);
}

async function saveHistory(entry) {
  const data = await new Promise(r => chrome.storage.local.get({ history: [] }, r));
  let history = data.history;

  const newEntry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...entry,
    timestamp: entry.timestamp || Date.now()
  };

  history.unshift(newEntry);

  // Auto-cleanup: keep only latest 150 items
  if (history.length > 150) history = history.slice(0, 150);

  await new Promise(r => chrome.storage.local.set({ history }, r));
  return { success: true, id: newEntry.id };
}

async function getHistory(filter = {}) {
  const data = await new Promise(r => chrome.storage.local.get({ history: [] }, r));
  let history = data.history;

  if (filter.query) {
    const q = filter.query.toLowerCase();
    history = history.filter(h =>
      h.prompt?.toLowerCase().includes(q) ||
      h.response?.toLowerCase().includes(q) ||
      h.title?.toLowerCase().includes(q)
    );
  }
  if (filter.url) {
    history = history.filter(h => h.url === filter.url);
  }
  if (filter.limit) {
    history = history.slice(0, filter.limit);
  }

  return { history };
}

async function deleteHistory(id) {
  const data = await new Promise(r => chrome.storage.local.get({ history: [] }, r));
  const history = data.history.filter(h => h.id !== id);
  await new Promise(r => chrome.storage.local.set({ history }, r));
  return { success: true };
}

async function clearHistory() {
  await new Promise(r => chrome.storage.local.set({ history: [] }, r));
  return { success: true };
}

// ── Knowledge Base Storage ───────────────────────────────────
async function saveKnowledgeBase(entry) {
  const data = await new Promise(r => chrome.storage.local.get({ knowledgeBase: [] }, r));
  let kb = data.knowledgeBase;

  const newEntry = {
    id: `kb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...entry,
    savedAt: Date.now()
  };

  kb.unshift(newEntry);
  if (kb.length > 500) kb = kb.slice(0, 500);

  await new Promise(r => chrome.storage.local.set({ knowledgeBase: kb }, r));
  return { success: true, id: newEntry.id };
}

async function getKnowledgeBase(query = '') {
  const data = await new Promise(r => chrome.storage.local.get({ knowledgeBase: [] }, r));
  let kb = data.knowledgeBase;

  if (query) {
    const q = query.toLowerCase();
    kb = kb.filter(item =>
      item.snippet?.toLowerCase().includes(q) ||
      item.prompt?.toLowerCase().includes(q) ||
      item.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  return { knowledgeBase: kb };
}

async function deleteKnowledgeBase(id) {
  const data = await new Promise(r => chrome.storage.local.get({ knowledgeBase: [] }, r));
  const knowledgeBase = data.knowledgeBase.filter(k => k.id !== id);
  await new Promise(r => chrome.storage.local.set({ knowledgeBase }, r));
  return { success: true };
}

async function getPageContext(tab) {
  if (!tab) return { title: '', url: '', description: '' };
  return {
    title: tab.title || '',
    url: tab.url || '',
    description: ''
  };
}
