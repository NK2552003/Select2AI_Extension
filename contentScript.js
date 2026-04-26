// ============================================================
// Select2AI Content Script v2.0
// All features: smart detection, actions, chat mode, toolbar,
// streaming, compare mode, page context, KB, templates, TTS
// ============================================================

(async () => {
  // ── Imports via dynamic import (MV3 web_accessible_resources) ──
  const extRoot = chrome.runtime.getURL('');
  const { detectContentType, getSuggestedActions, getActionMeta, buildPrompt, ContentType } =
    await import(chrome.runtime.getURL('modules/smartDetect.js'));
  const { chatHistory } = await import(chrome.runtime.getURL('modules/chatHistory.js'));
  const { saveToKB } = await import(chrome.runtime.getURL('modules/knowledgeBase.js'));
  const { createResponseToolbar } = await import(chrome.runtime.getURL('modules/responseToolbar.js'));
  const { buildComparePanelHTML, buildModelSelectorHTML, getComparableModels } =
    await import(chrome.runtime.getURL('modules/compareMode.js'));
  const { loadTemplates, applyTemplate } = await import(chrome.runtime.getURL('modules/promptTemplates.js'));

  // ── State ─────────────────────────────────────────────────────
  let panel = null;
  let actionMenu = null;
  let currentSelection = '';
  let currentDetection = null;
  let isProcessing = false;
  let streamingChunks = {};
  let compareStreamContent = { a: '', b: '' };
  let settings = {};
  let templates = [];
  let pageContextEnabled = false;
  let currentTabKey = `${location.href}_${Date.now()}`;
  let lastResponseContent = '';
  let lastPrompt = '';
  let lastAction = '';
  let compareMode = false;
  let compareModeModels = { a: '', b: '' };
  let pendingAction = null;

  // ── Load settings & templates ─────────────────────────────────
  async function loadSettings() {
    settings = await new Promise(r =>
      chrome.storage.sync.get({
        githubToken: '',
        model: 'openai/gpt-4.1-mini',
        streamingEnabled: true,
        pageContextDefault: false,
        compareModelA: 'openai/gpt-4.1',
        compareModelB: 'meta/Llama-4-Scout-17B-16E-Instruct'
      }, r)
    );
    pageContextEnabled = settings.pageContextDefault;
    compareModeModels.a = settings.compareModelA;
    compareModeModels.b = settings.compareModelB;
  }

  await loadSettings();
  templates = await loadTemplates();

  // ── Listen for settings changes ───────────────────────────────
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'sync') {
      await loadSettings();
      templates = await loadTemplates();
    }
  });

  // ── KaTeX render helper ───────────────────────────────────────
  function renderKaTeX(element) {
    if (!window.katex) return;
    const text = element.innerHTML;
    element.innerHTML = text
      .replace(/\$\$([^$]+)\$\$/g, (_, math) => {
        try { return katex.renderToString(math, { displayMode: true }); } catch { return `$$${math}$$`; }
      })
      .replace(/\$([^$\n]+)\$/g, (_, math) => {
        try { return katex.renderToString(math, { displayMode: false }); } catch { return `$${math}$`; }
      });
  }

  // ── Simple Markdown renderer ──────────────────────────────────
  function renderMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre class="s2ai-code-block${lang ? ` language-${lang}` : ''}"><code>${code.trim()}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code class="s2ai-inline-code">$1</code>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[-*+] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\n\n+/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^(?!<[huplba])(.+)/, '<p>$1')
      .replace(/(?<=[^>])$/, '</p>');
  }

  // ── Action Menu ───────────────────────────────────────────────
  function showActionMenu(x, y, selectedText, detection) {
    removeActionMenu();

    const menu = document.createElement('div');
    menu.id = 's2ai-action-menu';
    menu.className = 's2ai-action-menu';
    menu.setAttribute('role', 'menu');

    // Header: insights bar
    const insights = document.createElement('div');
    insights.className = 's2ai-insights-bar';
    insights.innerHTML = `
      <span class="s2ai-insight">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        ${detection.wordCount} words
      </span>
      <span class="s2ai-insight">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ~${detection.readTime}m read
      </span>
      <span class="s2ai-insight s2ai-insight--type">
        ${getTypeIcon(detection.type)} ${capitalize(detection.type)}
        ${detection.language ? `<span class="s2ai-lang-badge">${detection.language}</span>` : ''}
      </span>
      <span class="s2ai-insight s2ai-insight--complexity s2ai-complexity--${detection.complexity.toLowerCase()}">
        ${detection.complexity}
      </span>
    `;
    menu.appendChild(insights);

    // Actions section
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 's2ai-menu-actions';

    const suggested = getSuggestedActions(detection.type);

    // Build action buttons
    const allActions = buildActionList(suggested, detection);

    for (const actionGroup of allActions) {
      if (actionGroup.divider) {
        const div = document.createElement('div');
        div.className = 's2ai-menu-divider';
        if (actionGroup.label) {
          div.innerHTML = `<span>${actionGroup.label}</span>`;
          div.className = 's2ai-menu-section-label';
        }
        actionsDiv.appendChild(div);
        continue;
      }

      const meta = getActionMeta(actionGroup.id);
      const btn = document.createElement('button');
      btn.className = `s2ai-menu-btn${actionGroup.suggested ? ' s2ai-menu-btn--suggested' : ''}`;
      btn.setAttribute('role', 'menuitem');
      btn.dataset.action = actionGroup.id;
      btn.innerHTML = `
        <span class="s2ai-menu-btn-icon">${meta.icon}</span>
        <span class="s2ai-menu-btn-label">${meta.label}</span>
        ${actionGroup.suggested ? '<span class="s2ai-suggested-badge">✦</span>' : ''}
      `;
      btn.addEventListener('click', () => handleAction(actionGroup.id, selectedText, detection));
      actionsDiv.appendChild(btn);
    }

    menu.appendChild(actionsDiv);

    // Templates section
    if (templates.length > 0) {
      const tplSection = document.createElement('div');
      tplSection.className = 's2ai-menu-section-label';
      tplSection.innerHTML = '<span>Templates</span>';
      menu.appendChild(tplSection);

      for (const tpl of templates.slice(0, 5)) {
        const btn = document.createElement('button');
        btn.className = 's2ai-menu-btn s2ai-menu-btn--template';
        btn.setAttribute('role', 'menuitem');
        btn.innerHTML = `<span class="s2ai-menu-btn-icon">${tpl.icon}</span><span class="s2ai-menu-btn-label">${escapeHtml(tpl.name)}</span>`;
        btn.addEventListener('click', () => handleTemplateAction(tpl, selectedText));
        menu.appendChild(btn);
      }
    }

    // Footer: compare mode toggle
    const footer = document.createElement('div');
    footer.className = 's2ai-menu-footer';
    footer.innerHTML = `
      <button class="s2ai-compare-toggle${compareMode ? ' active' : ''}" title="Compare two models side-by-side" id="s2ai-compare-toggle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
        ${compareMode ? 'Compare ON' : 'Compare'}
      </button>
      <button class="s2ai-context-toggle${pageContextEnabled ? ' active' : ''}" title="Include page context" id="s2ai-context-toggle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        ${pageContextEnabled ? 'Context ON' : 'Context'}
      </button>
    `;
    menu.appendChild(footer);

    footer.querySelector('#s2ai-compare-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      compareMode = !compareMode;
      e.currentTarget.classList.toggle('active', compareMode);
      e.currentTarget.textContent = compareMode ? '⚡ Compare ON' : '⚡ Compare';
    });

    footer.querySelector('#s2ai-context-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      pageContextEnabled = !pageContextEnabled;
      e.currentTarget.classList.toggle('active', pageContextEnabled);
    });

    document.body.appendChild(menu);
    actionMenu = menu;

    // Position
    positionElement(menu, x, y);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick, { once: true, capture: true });
    }, 10);
  }

  function buildActionList(suggested, detection) {
    const suggestedSet = new Set(suggested);
    const allGeneral = ['summarize', 'explain', 'answer', 'what-is', 'custom'];
    const allCode = ['explain-code', 'find-bugs', 'refactor', 'add-comments', 'convert-language'];
    const allRewrite = ['translate', 'rewrite-pro', 'rewrite-casual', 'rewrite-concise'];

    const result = [];

    // Suggested actions first (highlighted)
    const topSuggested = suggested.slice(0, 3);
    for (const a of topSuggested) {
      result.push({ id: a, suggested: true });
    }

    // Divider
    result.push({ divider: true, label: 'All Actions' });

    // Remaining general actions
    for (const a of allGeneral) {
      if (!topSuggested.includes(a)) result.push({ id: a });
    }

    // Code actions if code detected
    if (detection.type === ContentType.CODE || detection.confidence > 0.5) {
      result.push({ divider: true, label: 'Code' });
      for (const a of allCode) {
        if (!topSuggested.includes(a)) result.push({ id: a });
      }
    }

    // Rewrite section
    result.push({ divider: true, label: 'Rewrite' });
    for (const a of allRewrite) {
      result.push({ id: a });
    }

    return result;
  }

  // ── Handle Action ─────────────────────────────────────────────
  async function handleAction(action, selectedText, detection) {
    removeActionMenu();

    // Special: custom question → show input first
    if (action === 'custom') {
      showPanel('custom', selectedText, detection);
      return;
    }

    // Special: convert-language → ask for target language
    if (action === 'convert-language') {
      showLanguagePicker(action, selectedText, detection);
      return;
    }

    // Special: translate → ask for target language
    if (action === 'translate') {
      showLanguagePicker(action, selectedText, detection);
      return;
    }

    showPanel(action, selectedText, detection);
    await executeQuery(action, selectedText, {}, detection);
  }

  async function handleTemplateAction(template, selectedText) {
    removeActionMenu();
    const prompt = applyTemplate(template, {
      selection: selectedText,
      url: location.href,
      title: document.title
    });

    showPanel('custom', selectedText, null, template.name);
    await executeQuery('custom', selectedText, { customPrompt: prompt }, null);
  }

  function showLanguagePicker(action, selectedText, detection) {
    const langs = action === 'convert-language'
      ? ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin']
      : ['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Hindi', 'Portuguese', 'Italian', 'Russian', 'Korean'];

    showPanel(action, selectedText, detection);

    const panel = document.getElementById('s2ai-panel');
    if (!panel) return;

    const body = panel.querySelector('.s2ai-panel-body');
    body.innerHTML = `
      <div class="s2ai-lang-picker">
        <p class="s2ai-lang-picker-label">${action === 'convert-language' ? 'Convert to:' : 'Translate to:'}</p>
        <div class="s2ai-lang-grid">
          ${langs.map(l => `<button class="s2ai-lang-btn" data-lang="${l}">${l}</button>`).join('')}
        </div>
        <div class="s2ai-custom-lang">
          <input type="text" class="s2ai-lang-input" placeholder="Other language…" />
          <button class="s2ai-lang-confirm-btn">→</button>
        </div>
      </div>
    `;

    body.querySelectorAll('.s2ai-lang-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lang = btn.dataset.lang;
        body.innerHTML = '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div></div>';
        await executeQuery(action, selectedText, { targetLanguage: lang }, detection);
      });
    });

    const langInput = body.querySelector('.s2ai-lang-input');
    body.querySelector('.s2ai-lang-confirm-btn').addEventListener('click', async () => {
      const lang = langInput.value.trim();
      if (!lang) return;
      body.innerHTML = '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div></div>';
      await executeQuery(action, selectedText, { targetLanguage: lang }, detection);
    });
  }

  // ── Execute AI Query ──────────────────────────────────────────
  async function executeQuery(action, selectedText, options = {}, detection = null) {
    if (isProcessing) return;
    isProcessing = true;

    lastAction = action;
    lastPrompt = options.customPrompt || buildPrompt(action, selectedText, options);

    const pageCtx = pageContextEnabled ? getPageContext() : null;
    const convHistory = chatHistory.getHistory(currentTabKey);

    // Compare mode
    if (compareMode && action !== 'custom') {
      await runCompareMode(lastPrompt, pageCtx);
      isProcessing = false;
      return;
    }

    const panel = document.getElementById('s2ai-panel');
    if (!panel) { isProcessing = false; return; }

    const answerArea = panel.querySelector('.s2ai-answer-area');
    if (answerArea) {
      answerArea.innerHTML = '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div></div>';
    }

    const useStreaming = settings.streamingEnabled !== false;

    try {
      if (useStreaming) {
        await executeStreamingQuery(lastPrompt, pageCtx, convHistory, panel);
      } else {
        await executeNonStreamingQuery(lastPrompt, pageCtx, convHistory, panel);
      }
    } catch (e) {
      showError(e.message, panel);
    }

    isProcessing = false;
  }

  async function executeStreamingQuery(prompt, pageCtx, convHistory, panelEl) {
    const streamId = `stream_${Date.now()}`;
    streamingChunks[streamId] = '';

    const answerArea = panelEl.querySelector('.s2ai-answer-area');

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'QUERY_AI_STREAM',
        prompt,
        model: settings.model,
        pageContext: pageCtx,
        conversationHistory: convHistory,
        streamId,
        action: lastAction
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        // Streaming started - wait for STREAM_DONE
      });

      const onDone = (event) => {
        if (event.detail?.streamId !== streamId) return;
        document.removeEventListener('s2ai-stream-done', onDone);
        document.removeEventListener('s2ai-stream-chunk', onChunk);

        lastResponseContent = event.detail.fullContent || streamingChunks[streamId];
        delete streamingChunks[streamId];

        chatHistory.addTurn(currentTabKey, prompt, lastResponseContent);
        renderFinalResponse(lastResponseContent, panelEl);
        resolve();
      };

      const onChunk = (event) => {
        if (event.detail?.streamId !== streamId) return;
        streamingChunks[streamId] += event.detail.chunk;
        if (answerArea) {
          answerArea.innerHTML = renderMarkdown(streamingChunks[streamId]);
          answerArea.scrollTop = answerArea.scrollHeight;
        }
      };

      document.addEventListener('s2ai-stream-done', onDone);
      document.addEventListener('s2ai-stream-chunk', onChunk);

      // Timeout fallback
      setTimeout(() => {
        document.removeEventListener('s2ai-stream-done', onDone);
        document.removeEventListener('s2ai-stream-chunk', onChunk);
        reject(new Error('Response timeout. Please try again.'));
      }, 60000);
    });
  }

  async function executeNonStreamingQuery(prompt, pageCtx, convHistory, panelEl) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'QUERY_AI',
        prompt,
        model: settings.model,
        pageContext: pageCtx,
        conversationHistory: convHistory,
        action: lastAction
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        lastResponseContent = response.content || '';
        chatHistory.addTurn(currentTabKey, prompt, lastResponseContent);
        renderFinalResponse(lastResponseContent, panelEl);
        resolve();
      });
    });
  }

  function renderFinalResponse(content, panelEl) {
    const answerArea = panelEl.querySelector('.s2ai-answer-area');
    if (!answerArea) return;

    answerArea.innerHTML = renderMarkdown(content);
    renderKaTeX(answerArea);

    // Add response toolbar
    const existingToolbar = panelEl.querySelector('.s2ai-response-toolbar');
    if (existingToolbar) existingToolbar.remove();

    const toolbar = createResponseToolbar({
      content,
      prompt: lastPrompt,
      action: lastAction,
      onSaveKB: () => showToast('✅ Saved to Knowledge Base', panelEl)
    });

    const body = panelEl.querySelector('.s2ai-panel-body');
    if (body) body.appendChild(toolbar);

    // Update chat turn indicator
    const turnCount = chatHistory.getTurnCount(currentTabKey);
    const turnEl = panelEl.querySelector('.s2ai-turn-count');
    if (turnEl) turnEl.textContent = `${turnCount} turn${turnCount !== 1 ? 's' : ''}`;

    // Show follow-up input
    const followUp = panelEl.querySelector('.s2ai-followup-area');
    if (followUp) followUp.style.display = 'flex';
  }

  // ── Compare Mode ──────────────────────────────────────────────
  async function runCompareMode(prompt, pageCtx) {
    const panelEl = document.getElementById('s2ai-panel');
    if (!panelEl) return;

    const body = panelEl.querySelector('.s2ai-panel-body');

    // Show compare UI
    body.innerHTML = buildComparePanelHTML(compareModeModels.a, compareModeModels.b);
    panelEl.classList.add('s2ai-panel--compare');

    compareStreamContent = { a: '', b: '' };

    const streamIdA = `compare_a_${Date.now()}`;
    const streamIdB = `compare_b_${Date.now()}`;
    const paneA = body.querySelector('#s2ai-compare-pane-a');
    const paneB = body.querySelector('#s2ai-compare-pane-b');

    const sendQuery = (model, streamId) => {
      chrome.runtime.sendMessage({
        type: 'QUERY_AI_STREAM',
        prompt,
        model,
        pageContext: pageCtx,
        streamId,
        autoSave: false
      }, () => {});
    };

    sendQuery(compareModeModels.a, streamIdA);
    sendQuery(compareModeModels.b, streamIdB);

    const onChunk = (e) => {
      const { streamId, chunk } = e.detail || {};
      if (streamId === streamIdA) {
        compareStreamContent.a += chunk;
        if (paneA) paneA.innerHTML = renderMarkdown(compareStreamContent.a);
      } else if (streamId === streamIdB) {
        compareStreamContent.b += chunk;
        if (paneB) paneB.innerHTML = renderMarkdown(compareStreamContent.b);
      }
    };

    const onDone = (e) => {
      const { streamId } = e.detail || {};
      if (streamId === streamIdA) paneA?.classList.add('s2ai-compare-pane--done');
      else if (streamId === streamIdB) paneB?.classList.add('s2ai-compare-pane--done');

      if (paneA?.classList.contains('s2ai-compare-pane--done') &&
          paneB?.classList.contains('s2ai-compare-pane--done')) {
        document.removeEventListener('s2ai-stream-chunk', onChunk);
        document.removeEventListener('s2ai-stream-done', onDone);
      }
    };

    document.addEventListener('s2ai-stream-chunk', onChunk);
    document.addEventListener('s2ai-stream-done', onDone);
  }

  // ── Panel ─────────────────────────────────────────────────────
  function showPanel(action, selectedText, detection, customTitle = null) {
    removePanel();

    const panelEl = document.createElement('div');
    panelEl.id = 's2ai-panel';
    panelEl.className = 's2ai-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'Select2AI Response');

    const actionMeta = getActionMeta(action);
    const title = customTitle || actionMeta.label;

    panelEl.innerHTML = `
      <div class="s2ai-panel-header">
        <div class="s2ai-panel-title">
          <span class="s2ai-panel-icon">${actionMeta.icon}</span>
          <span class="s2ai-panel-title-text">${escapeHtml(title)}</span>
          ${detection ? `<span class="s2ai-type-chip s2ai-type-chip--${detection.type}">${getTypeIcon(detection.type)} ${detection.wordCount}w</span>` : ''}
        </div>
        <div class="s2ai-panel-controls">
          <button class="s2ai-ctrl-btn" id="s2ai-context-btn" title="${pageContextEnabled ? 'Page context ON' : 'Page context OFF'}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </button>
          <button class="s2ai-ctrl-btn" id="s2ai-chat-clear-btn" title="Clear conversation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
            </svg>
          </button>
          <button class="s2ai-ctrl-btn s2ai-close-btn" id="s2ai-panel-close" title="Close (Esc)" aria-label="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="s2ai-selected-preview">
        <div class="s2ai-selected-text">${escapeHtml(selectedText.slice(0, 200))}${selectedText.length > 200 ? '…' : ''}</div>
        <div class="s2ai-turn-count" title="Conversation turns">0 turns</div>
      </div>

      <div class="s2ai-panel-body">
        ${action === 'custom' ? `
          <div class="s2ai-custom-input-area">
            <textarea class="s2ai-custom-textarea" placeholder="Ask anything about the selected text…" rows="3"></textarea>
            <button class="s2ai-send-btn" id="s2ai-custom-send">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Ask
            </button>
          </div>
          <div class="s2ai-answer-area"></div>
        ` : `
          <div class="s2ai-answer-area">
            <div class="s2ai-loading">
              <div class="s2ai-typing-dots"><span></span><span></span><span></span></div>
            </div>
          </div>
        `}

        <div class="s2ai-followup-area" style="display:none">
          <input type="text" class="s2ai-followup-input" placeholder="Follow-up question…" />
          <button class="s2ai-followup-send" title="Send follow-up">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="s2ai-panel-footer">
        <span class="s2ai-model-indicator">${escapeHtml(settings.model || 'gpt-4.1-mini')}</span>
        ${pageContextEnabled ? '<span class="s2ai-context-indicator">📄 Page context</span>' : ''}
        <span class="s2ai-powered">⚡ GitHub Models</span>
      </div>
    `;

    document.body.appendChild(panelEl);
    panel = panelEl;

    // Position panel (center + offset from viewport edge)
    positionPanel(panelEl);

    // Wire up events
    panelEl.querySelector('#s2ai-panel-close').addEventListener('click', removePanel);

    const ctxBtn = panelEl.querySelector('#s2ai-context-btn');
    ctxBtn.classList.toggle('s2ai-ctrl-btn--active', pageContextEnabled);
    ctxBtn.addEventListener('click', () => {
      pageContextEnabled = !pageContextEnabled;
      ctxBtn.classList.toggle('s2ai-ctrl-btn--active', pageContextEnabled);
      ctxBtn.title = pageContextEnabled ? 'Page context ON' : 'Page context OFF';
      showToast(pageContextEnabled ? '📄 Page context ON' : 'Page context OFF', panelEl);
    });

    panelEl.querySelector('#s2ai-chat-clear-btn').addEventListener('click', () => {
      chatHistory.clearTab(currentTabKey);
      const turnEl = panelEl.querySelector('.s2ai-turn-count');
      if (turnEl) turnEl.textContent = '0 turns';
      const followUp = panelEl.querySelector('.s2ai-followup-area');
      if (followUp) followUp.style.display = 'none';
      showToast('🔄 Conversation cleared', panelEl);
    });

    // Custom question send
    if (action === 'custom') {
      const textarea = panelEl.querySelector('.s2ai-custom-textarea');
      const sendBtn = panelEl.querySelector('#s2ai-custom-send');

      const doSend = async () => {
        const q = textarea.value.trim();
        if (!q) return;
        textarea.value = '';
        panelEl.querySelector('.s2ai-answer-area').innerHTML =
          '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div></div>';
        await executeQuery('custom', selectedText, { customPrompt: `${q}\n\nContext:\n${selectedText}` }, detection);
      };

      sendBtn.addEventListener('click', doSend);
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doSend();
      });
      textarea.focus();
    }

    // Follow-up input
    const followupInput = panelEl.querySelector('.s2ai-followup-input');
    const followupSend = panelEl.querySelector('.s2ai-followup-send');

    const sendFollowup = async () => {
      const q = followupInput.value.trim();
      if (!q || isProcessing) return;
      followupInput.value = '';
      panelEl.querySelector('.s2ai-answer-area').innerHTML =
        '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div></div>';
      const existingToolbar = panelEl.querySelector('.s2ai-response-toolbar');
      if (existingToolbar) existingToolbar.remove();
      await executeQuery('custom', selectedText, { customPrompt: q }, detection);
    };

    followupSend.addEventListener('click', sendFollowup);
    followupInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendFollowup();
    });

    // Make draggable
    makeDraggable(panelEl, panelEl.querySelector('.s2ai-panel-header'));

    // GSAP animation
    if (window.gsap) {
      gsap.fromTo(panelEl,
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'power2.out' }
      );
    } else {
      panelEl.style.opacity = '1';
    }
  }

  // ── Page context ──────────────────────────────────────────────
  function getPageContext() {
    const metaDesc = document.querySelector('meta[name="description"]');
    return {
      title: document.title,
      url: location.href,
      description: metaDesc?.getAttribute('content') || ''
    };
  }

  // ── Positioning ───────────────────────────────────────────────
  function positionElement(el, x, y) {
    el.style.position = 'fixed';
    el.style.zIndex = '2147483647';
    el.style.visibility = 'hidden';
    el.style.display = 'block';

    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x + 10;
    let top = y + 10;

    if (left + rect.width > vw - 10) left = vw - rect.width - 10;
    if (top + rect.height > vh - 10) top = y - rect.height - 10;
    if (left < 10) left = 10;
    if (top < 10) top = 10;

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = '';
  }

  function positionPanel(panelEl) {
    panelEl.style.position = 'fixed';
    panelEl.style.zIndex = '2147483646';
    panelEl.style.right = '20px';
    panelEl.style.top = '80px';
  }

  // ── Draggable ─────────────────────────────────────────────────
  function makeDraggable(el, handle) {
    let startX, startY, origLeft, origTop;
    let isDragging = false;

    handle.style.cursor = 'grab';

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = el.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      el.style.right = 'auto';
      el.style.left = `${origLeft}px`;
      el.style.top = `${origTop}px`;
      handle.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = `${Math.max(0, origLeft + dx)}px`;
      el.style.top = `${Math.max(0, origTop + dy)}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        handle.style.cursor = 'grab';
      }
    });
  }

  // ── Remove helpers ────────────────────────────────────────────
  function removeActionMenu() {
    if (actionMenu) {
      actionMenu.remove();
      actionMenu = null;
    }
  }

  function removePanel() {
    if (panel) {
      if (window.gsap) {
        gsap.to(panel, {
          opacity: 0, y: 10, scale: 0.97, duration: 0.18,
          ease: 'power2.in',
          onComplete: () => { panel?.remove(); panel = null; }
        });
      } else {
        panel.remove();
        panel = null;
      }
    }
  }

  function handleOutsideClick(e) {
    if (actionMenu && !actionMenu.contains(e.target)) {
      removeActionMenu();
    }
  }

  // ── Toast notification ────────────────────────────────────────
  function showToast(message, container) {
    const existing = document.getElementById('s2ai-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 's2ai-toast';
    toast.className = 's2ai-toast';
    toast.textContent = message;
    (container || document.body).appendChild(toast);

    setTimeout(() => {
      toast.classList.add('s2ai-toast--visible');
      setTimeout(() => {
        toast.classList.remove('s2ai-toast--visible');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }, 10);
  }

  function showError(message, panelEl) {
    const answerArea = panelEl?.querySelector('.s2ai-answer-area');
    if (answerArea) {
      answerArea.innerHTML = `<div class="s2ai-error"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><span>${escapeHtml(message)}</span></div>`;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────
  function getTypeIcon(type) {
    const icons = {
      code: '💻', question: '❓', url: '🔗', math: '🧮', table: '📊', prose: '📄'
    };
    return icons[type] || '📄';
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Text Selection Handler ─────────────────────────────────────
  let selectionTimeout = null;

  document.addEventListener('mouseup', (e) => {
    if (panel?.contains(e.target) || actionMenu?.contains(e.target)) return;

    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(async () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (!selectedText || selectedText.length < 3) {
        removeActionMenu();
        return;
      }

      currentSelection = selectedText;
      currentDetection = detectContentType(selectedText);

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      showActionMenu(rect.right, rect.bottom, selectedText, currentDetection);
    }, 200);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removeActionMenu();
      removePanel();
    }
  });

  // ── Streaming message listener ────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'STREAM_CHUNK') {
      document.dispatchEvent(new CustomEvent('s2ai-stream-chunk', {
        detail: { streamId: message.streamId, chunk: message.chunk }
      }));
    } else if (message.type === 'STREAM_DONE') {
      document.dispatchEvent(new CustomEvent('s2ai-stream-done', {
        detail: { streamId: message.streamId, fullContent: message.fullContent, model: message.model }
      }));
    }
  });

  // ── Context menu & command event listeners ────────────────────
  window.addEventListener('select2ai-context-action', async (e) => {
    const { action, selectionText } = e.detail;
    if (action === 'summarize-page') {
      const pageText = document.body.innerText?.slice(0, 8000) || '';
      showPanel('summarize', pageText, null, 'Summarize Page');
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'SUMMARIZE_PAGE',
          pageText,
          action: 'summarize-page'
        }, (response) => {
          if (response?.error) { showError(response.error, panel); reject(); }
          else {
            lastResponseContent = response.content || '';
            renderFinalResponse(lastResponseContent, panel);
            resolve();
          }
        });
      });
    } else if (selectionText) {
      const detection = detectContentType(selectionText);
      showPanel(action, selectionText, detection);
      await executeQuery(action, selectionText, {}, detection);
    }
  });

  window.addEventListener('select2ai-command', (e) => {
    const { command } = e.detail;
    if (command === 'open-action-menu') {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length >= 3) {
        const detection = detectContentType(text);
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showActionMenu(rect.right, rect.bottom, text, detection);
      }
    } else if (command === 'save-to-kb') {
      if (lastResponseContent) {
        saveToKB({ snippet: lastResponseContent, prompt: lastPrompt, action: lastAction })
          .then(() => showToast('✅ Saved to Knowledge Base'));
      }
    }
  });

  // ── Page Summarize from context menu (no selection) ───────────
  window.addEventListener('select2ai-context-action', (e) => {}, { once: false });

})();
