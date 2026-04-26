// ============================================================
// Select2AI Content Script v2.0 - Modular Refactor
// Uses modules: smartDetect, chatHistory, knowledgeBase,
// responseToolbar, compareMode, promptTemplates, contentUI,
// contentQuery, iconRegistry
// ============================================================

(async () => {
  // ── Imports ───────────────────────────────────────────────────
  const { detectContentType, buildPrompt, ContentType } =
    await import(chrome.runtime.getURL('modules/smartDetect.js'));
  const { chatHistory } = await import(chrome.runtime.getURL('modules/chatHistory.js'));
  const { saveToKB } = await import(chrome.runtime.getURL('modules/knowledgeBase.js'));
  const { createResponseToolbar } = await import(chrome.runtime.getURL('modules/responseToolbar.js'));
  const { loadTemplates, applyTemplate } = await import(chrome.runtime.getURL('modules/promptTemplates.js'));
  const { getIconSvg } = await import(chrome.runtime.getURL('modules/iconRegistry.js'));
  const {
    escapeHtml, renderMarkdown, renderKaTeX, getTypeIcon,
    showToast, showError, positionElement, positionPanel,
    makeDraggable, createActionMenu, createTriggerButton, createPanel, animatePanelClose,
    createLanguagePicker
  } = await import(chrome.runtime.getURL('modules/contentUI.js'));
  const { createQueryExecutor } = await import(chrome.runtime.getURL('modules/contentQuery.js'));

  // ── State ─────────────────────────────────────────────────────
  let panel = null;
  let actionMenu = null;
  let triggerButton = null;
  let currentSelection = '';
  let currentDetection = null;
  let settings = {};
  let templates = [];
  let pageContextEnabled = false;
  let currentTabKey = `${location.href}_${Date.now()}`;
  let lastResponseContent = '';
  let lastPrompt = '';
  let lastAction = '';
  let compareMode = false;
  let compareModeModels = { a: '', b: '' };
  let streamingChunks = {};
  let compareStreamContent = { a: '', b: '' };

  // Refs for query executor
  const lastActionRef = { value: '' };
  const lastPromptRef = { value: '' };
  const lastResponseRef = { value: '' };

  // ── Settings ──────────────────────────────────────────────────
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

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'sync') {
      await loadSettings();
      templates = await loadTemplates();
    }
  });

  // ── Query Executor ────────────────────────────────────────────
  const executor = createQueryExecutor({
    chatHistory, currentTabKey, settings,
    lastActionRef, lastPromptRef, lastResponseRef,
    streamingChunksRef: streamingChunks,
    compareStreamRef: compareStreamContent,
    compareModeModelsRef: compareModeModels
  });

  // ── Render Final Response ─────────────────────────────────────
  function renderFinalResponse(content, panelEl) {
    const answerArea = panelEl.querySelector('.s2ai-answer-area');
    if (!answerArea) return;
    answerArea.innerHTML = renderMarkdown(content);
    renderKaTeX(answerArea);

    const existingToolbar = panelEl.querySelector('.s2ai-response-toolbar');
    if (existingToolbar) existingToolbar.remove();

    const toolbar = createResponseToolbar({
      content, prompt: lastPromptRef.value, action: lastActionRef.value,
      onSaveKB: () => showToast(`${getIconSvg('check-circle', 14)} Saved to Knowledge Base`, panelEl)
    });

    const body = panelEl.querySelector('.s2ai-panel-body');
    if (body) body.appendChild(toolbar);

    const turnCount = chatHistory.getTurnCount(currentTabKey);
    const turnEl = panelEl.querySelector('.s2ai-turn-count');
    if (turnEl) turnEl.textContent = `${turnCount} turn${turnCount !== 1 ? 's' : ''}`;

    const followUp = panelEl.querySelector('.s2ai-followup-area');
    if (followUp) followUp.style.display = 'flex';
  }

  // ── Action Handlers ───────────────────────────────────────────
  function handleAction(action, selectedText, detection) {
    removeActionMenu();
    if (action === 'custom') {
      showPanel('custom', selectedText, detection);
      return;
    }
    if (action === 'convert-language' || action === 'translate') {
      showLanguagePicker(action, selectedText, detection);
      return;
    }
    showPanel(action, selectedText, detection);
    executor.executeQuery(action, selectedText, {}, detection, {
      buildPrompt, isPageContextEnabled: () => pageContextEnabled,
      getPageContext: () => ({ title: document.title, url: location.href, description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '' }),
      runCompareMode: (prompt, pageCtx) => executor.runCompareMode(prompt, pageCtx),
      renderFinalResponse
    });
  }

  function handleTemplateAction(template, selectedText) {
    removeActionMenu();
    const prompt = applyTemplate(template, {
      selection: selectedText, url: location.href, title: document.title
    });
    showPanel('custom', selectedText, null, template.name);

    // Hide the top custom input area since template prompt is sent automatically;
    // only the bottom follow-up input should remain visible after response.
    const customInputArea = panel?.querySelector('.s2ai-custom-input-area');
    if (customInputArea) customInputArea.style.display = 'none';

    executor.executeQuery('custom', selectedText, { customPrompt: prompt }, null, {
      buildPrompt, isPageContextEnabled: () => pageContextEnabled,
      getPageContext: () => ({ title: document.title, url: location.href, description: '' }),
      runCompareMode: (p, pc) => executor.runCompareMode(p, pc),
      renderFinalResponse
    });
  }

  // ── Language Picker ───────────────────────────────────────────
  function showLanguagePicker(action, selectedText, detection) {
    showPanel(action, selectedText, detection);
    const panelEl = document.getElementById('s2ai-panel');
    if (!panelEl) return;
    const body = createLanguagePicker(action, panelEl);

    body.querySelectorAll('.s2ai-lang-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lang = btn.dataset.lang;
        body.innerHTML = '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div>';
        executor.executeQuery(action, selectedText, { targetLanguage: lang }, detection, {
          buildPrompt, isPageContextEnabled: () => pageContextEnabled,
          getPageContext: () => ({ title: document.title, url: location.href, description: '' }),
          runCompareMode: (p, pc) => executor.runCompareMode(p, pc),
          renderFinalResponse
        });
      });
    });

    const langInput = body.querySelector('.s2ai-lang-input');
    body.querySelector('.s2ai-lang-confirm-btn').addEventListener('click', async () => {
      const lang = langInput.value.trim();
      if (!lang) return;
      body.innerHTML = '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div>';
      executor.executeQuery(action, selectedText, { targetLanguage: lang }, detection, {
        buildPrompt, isPageContextEnabled: () => pageContextEnabled,
        getPageContext: () => ({ title: document.title, url: location.href, description: '' }),
        runCompareMode: (p, pc) => executor.runCompareMode(p, pc),
        renderFinalResponse
      });
    });
  }

  // ── Panel ─────────────────────────────────────────────────────
  function showPanel(action, selectedText, detection, customTitle = null) {
    removePanel();
    lastActionRef.value = action;

    panel = createPanel({
      action, selectedText, detection, customTitle, settings, pageContextEnabled,
      getPageContext: () => ({ title: document.title, url: location.href, description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '' }),
      onClose: removePanel,
      onContextToggle: () => {
        pageContextEnabled = !pageContextEnabled;
        return pageContextEnabled;
      },
      onClearChat: () => {
        chatHistory.clearTab(currentTabKey);
      },
      onCustomSend: (q) => {
        executor.executeQuery('custom', selectedText, {
          customPrompt: `${q}\n\nContext:\n${selectedText}`
        }, detection, {
          buildPrompt, isPageContextEnabled: () => pageContextEnabled,
          getPageContext: () => ({ title: document.title, url: location.href, description: '' }),
          runCompareMode: (p, pc) => executor.runCompareMode(p, pc),
          renderFinalResponse
        });
      },
      onFollowupSend: (q) => {
        executor.executeQuery('custom', selectedText, { customPrompt: q }, detection, {
          buildPrompt, isPageContextEnabled: () => pageContextEnabled,
          getPageContext: () => ({ title: document.title, url: location.href, description: '' }),
          runCompareMode: (p, pc) => executor.runCompareMode(p, pc),
          renderFinalResponse
        });
      }
    });

    document.body.appendChild(panel);
    positionPanel(panel);
  }

  // ── Trigger Button ────────────────────────────────────────────
  function showTriggerButton(x, y, selectedText, detection) {
    removeTriggerButton();
    triggerButton = createTriggerButton({
      x, y,
      onClick: () => {
        removeTriggerButton();
        showActionMenu(x, y, selectedText, detection);
      }
    });
    document.body.appendChild(triggerButton);

    setTimeout(() => {
      document.addEventListener('click', function onDocClick(e) {
        if (triggerButton && !triggerButton.contains(e.target)) {
          removeTriggerButton();
          document.removeEventListener('click', onDocClick, true);
        }
      }, { once: true, capture: true });
    }, 10);
  }

  function removeTriggerButton() {
    if (triggerButton) {
      triggerButton.remove();
      triggerButton = null;
    }
  }

  // ── Action Menu ───────────────────────────────────────────────
  function showActionMenu(x, y, selectedText, detection) {
    removeActionMenu();
    currentSelection = selectedText;
    currentDetection = detection;

    actionMenu = createActionMenu({
      detection, templates, compareMode, pageContextEnabled,
      x, y,
      onAction: (action) => handleAction(action, selectedText, detection),
      onTemplate: (tpl) => handleTemplateAction(tpl, selectedText),
      onCompareToggle: () => {
        compareMode = !compareMode;
        executor.setCompareMode(compareMode);
      },
      onContextToggle: () => {
        pageContextEnabled = !pageContextEnabled;
      },
      onOutsideClick: (e, menu) => {
        if (menu && !menu.contains(e.target)) removeActionMenu();
      }
    });

    document.body.appendChild(actionMenu);
    positionElement(actionMenu, x, y);
  }

  // ── Remove helpers ────────────────────────────────────────────
  function removeActionMenu() {
    if (actionMenu) { actionMenu.remove(); actionMenu = null; }
  }

  function removePanel() {
    if (!panel) return;
    animatePanelClose(panel, () => { panel?.remove(); panel = null; });
  }

  // ── Text Selection Handler ─────────────────────────────────────
  let selectionTimeout = null;
  document.addEventListener('mouseup', (e) => {
    if (panel?.contains(e.target) || actionMenu?.contains(e.target) || triggerButton?.contains(e.target)) return;
    clearTimeout(selectionTimeout);
    selectionTimeout = setTimeout(async () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      if (!selectedText || selectedText.length < 3) { removeTriggerButton(); removeActionMenu(); return; }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      showTriggerButton(rect.right, rect.bottom, selectedText, detectContentType(selectedText));
    }, 200);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { removeTriggerButton(); removeActionMenu(); removePanel(); }
  });

  // ── Context menu & commands ───────────────────────────────────
  window.addEventListener('select2ai-context-action', async (e) => {
    const { action, selectionText } = e.detail;
    if (action === 'summarize-page') {
      const pageText = document.body.innerText?.slice(0, 8000) || '';
      showPanel('summarize', pageText, null, 'Summarize Page');
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'SUMMARIZE_PAGE', pageText, action: 'summarize-page' }, (response) => {
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
      executor.executeQuery(action, selectionText, {}, detection, {
        buildPrompt, isPageContextEnabled: () => pageContextEnabled,
        getPageContext: () => ({ title: document.title, url: location.href, description: '' }),
        runCompareMode: (p, pc) => executor.runCompareMode(p, pc),
        renderFinalResponse
      });
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
        saveToKB({ snippet: lastResponseContent, prompt: lastPromptRef.value, action: lastActionRef.value })
          .then(() => showToast(`${getIconSvg('check-circle', 14)} Saved to Knowledge Base`));
      }
    }
  });

})();
