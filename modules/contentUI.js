// ============================================================
// Select2AI Content Script Module: UI Creation
// Action menu, panel, toasts, and UI helpers
// ============================================================

import { getIconSvg } from './iconRegistry.js';
import { getSuggestedActions, getActionMeta, ContentType } from './smartDetect.js';

// ── Pure UI Utilities ─────────────────────────────────────────
export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '<')
    .replace(/>/g, '>').replace(/"/g, '"');
}

export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

export function renderMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '<').replace(/>/g, '>')
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

export function renderKaTeX(element) {
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

export function getTypeIcon(type) {
  const map = {
    code: getIconSvg('code', 12),
    question: getIconSvg('help-circle', 12),
    url: getIconSvg('link', 12),
    math: getIconSvg('calculator', 12),
    table: getIconSvg('table', 12),
    prose: getIconSvg('file-text', 12)
  };
  return map[type] || getIconSvg('file-text', 12);
}

export function showToast(message, container) {
  const existing = document.getElementById('s2ai-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 's2ai-toast';
  toast.className = 's2ai-toast';
  toast.innerHTML = message;
  (container || document.body).appendChild(toast);

  setTimeout(() => {
    toast.classList.add('s2ai-toast--visible');
    setTimeout(() => {
      toast.classList.remove('s2ai-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }, 10);
}

export function showError(message, panelEl) {
  const answerArea = panelEl?.querySelector('.s2ai-answer-area');
  if (answerArea) {
    answerArea.innerHTML = `<div class="s2ai-error">${getIconSvg('alert-triangle', 16)}<span>${escapeHtml(message)}</span></div>`;
  }
}

// ── Positioning & Drag ────────────────────────────────────────
export function positionElement(el, x, y) {
  el.style.position = 'fixed';
  el.style.zIndex = '2147483647';
  el.style.visibility = 'hidden';
  el.style.display = 'block';

  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = x + 10;
  let top = y + 10;

  // If menu would overflow bottom, flip it above the cursor
  if (top + rect.height > vh - 10) {
    top = y - rect.height - 10;
  }
  // If still overflow top or if y itself is too low, clamp to viewport
  if (top < 10) top = 10;

  if (left + rect.width > vw - 10) left = vw - rect.width - 10;
  if (left < 10) left = 10;

  // If element is taller than viewport, cap its height and enable scrolling
  if (rect.height > vh - 20) {
    el.style.maxHeight = `${vh - 20}px`;
    el.style.overflowY = 'auto';
    top = 10;
  }

  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.visibility = '';
}

export function positionPanel(panelEl) {
  panelEl.style.position = 'fixed';
  panelEl.style.zIndex = '2147483646';

  const rect = panelEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let right = 20;
  let top = 80;

  // Ensure panel stays within viewport horizontally
  if (rect.width + right > vw - 10) {
    right = 10;
  }
  // Ensure panel stays within viewport vertically
  if (rect.height + top > vh - 10) {
    top = Math.max(10, vh - rect.height - 10);
  }

  panelEl.style.right = `${right}px`;
  panelEl.style.top = `${top}px`;

  // If panel is taller than viewport, cap it and make body scrollable
  if (rect.height > vh - 20) {
    panelEl.style.maxHeight = `${vh - 20}px`;
    const body = panelEl.querySelector('.s2ai-panel-body');
    if (body) body.style.overflowY = 'auto';
  }
}

export function makeDraggable(el, handle) {
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

// ── Action Menu ───────────────────────────────────────────────
export function buildActionList(suggested, detection) {
  const allGeneral = ['summarize', 'explain', 'answer', 'what-is', 'custom'];
  const allCode = ['explain-code', 'find-bugs', 'refactor', 'add-comments', 'convert-language'];
  const allRewrite = ['translate', 'rewrite-pro', 'rewrite-casual', 'rewrite-concise'];

  const result = [];
  const topSuggested = suggested.slice(0, 3);

  for (const a of topSuggested) result.push({ id: a, suggested: true });
  result.push({ divider: true, label: 'All Actions' });

  for (const a of allGeneral) {
    if (!topSuggested.includes(a)) result.push({ id: a });
  }

  if (detection.type === ContentType.CODE || detection.confidence > 0.5) {
    result.push({ divider: true, label: 'Code' });
    for (const a of allCode) {
      if (!topSuggested.includes(a)) result.push({ id: a });
    }
  }

  result.push({ divider: true, label: 'Rewrite' });
  for (const a of allRewrite) result.push({ id: a });

  return result;
}

export function createActionMenu(options) {
  const { detection, templates, compareMode, pageContextEnabled, onAction, onTemplate, onCompareToggle, onContextToggle, onOutsideClick } = options;

  const menu = document.createElement('div');
  menu.id = 's2ai-action-menu';
  menu.className = 's2ai-action-menu';
  menu.setAttribute('role', 'menu');

  // Insights bar
  const insights = document.createElement('div');
  insights.className = 's2ai-insights-bar';
  insights.innerHTML = `
    <span class="s2ai-insight">
      ${getIconSvg('file-text', 10)} ${detection.wordCount} words
    </span>
    <span class="s2ai-insight">
      ${getIconSvg('clock', 10)} ~${detection.readTime}m read
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

  // Actions
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 's2ai-menu-actions';

  const allActions = buildActionList(getSuggestedActions(detection.type), detection);

  for (const actionGroup of allActions) {
    if (actionGroup.divider) {
      const div = document.createElement('div');
      div.className = actionGroup.label ? 's2ai-menu-section-label' : 's2ai-menu-divider';
      if (actionGroup.label) div.innerHTML = `<span>${actionGroup.label}</span>`;
      actionsDiv.appendChild(div);
      continue;
    }

    const meta = getActionMeta(actionGroup.id);
    const btn = document.createElement('button');
    btn.className = `s2ai-menu-btn${actionGroup.suggested ? ' s2ai-menu-btn--suggested' : ''}`;
    btn.setAttribute('role', 'menuitem');
    btn.dataset.action = actionGroup.id;
    btn.innerHTML = `
      <span class="s2ai-menu-btn-icon">${getIconSvg(meta.icon, 14)}</span>
      <span class="s2ai-menu-btn-label">${meta.label}</span>
      ${actionGroup.suggested ? `<span class="s2ai-suggested-badge">${getIconSvg('sparkles', 10)}</span>` : ''}
    `;
    btn.addEventListener('click', () => onAction(actionGroup.id));
    actionsDiv.appendChild(btn);
  }

  menu.appendChild(actionsDiv);

  // Templates
  if (templates.length > 0) {
    const tplSection = document.createElement('div');
    tplSection.className = 's2ai-menu-section-label';
    tplSection.innerHTML = '<span>Templates</span>';
    menu.appendChild(tplSection);

    for (const tpl of templates.slice(0, 5)) {
      const btn = document.createElement('button');
      btn.className = 's2ai-menu-btn s2ai-menu-btn--template';
      btn.setAttribute('role', 'menuitem');
      const tplIcon = tpl.icon && !isEmoji(tpl.icon) ? getIconSvg(tpl.icon, 14) : getIconSvg('zap', 14);
      btn.innerHTML = `<span class="s2ai-menu-btn-icon">${tplIcon}</span><span class="s2ai-menu-btn-label">${escapeHtml(tpl.name)}</span>`;
      btn.addEventListener('click', () => onTemplate(tpl));
      menu.appendChild(btn);
    }
  }

  // Footer
  const footer = document.createElement('div');
  footer.className = 's2ai-menu-footer';
  footer.innerHTML = `
    <button class="s2ai-compare-toggle${compareMode ? ' active' : ''}" title="Compare two models side-by-side" id="s2ai-compare-toggle">
      ${getIconSvg('layout', 12)} ${compareMode ? 'Compare ON' : 'Compare'}
    </button>
    <button class="s2ai-context-toggle${pageContextEnabled ? ' active' : ''}" title="Include page context" id="s2ai-context-toggle">
      ${getIconSvg('info', 12)} ${pageContextEnabled ? 'Context ON' : 'Context'}
    </button>
  `;
  menu.appendChild(footer);

  footer.querySelector('#s2ai-compare-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    onCompareToggle();
    const newState = !compareMode;
    e.currentTarget.classList.toggle('active', newState);
    e.currentTarget.innerHTML = `${getIconSvg('layout', 10)} ${newState ? 'Compare ON' : 'Compare'}`;
  });

  footer.querySelector('#s2ai-context-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    onContextToggle();
    e.currentTarget.classList.toggle('active', !pageContextEnabled);
  });

  // Position
  // NOTE: positionElement is called by the caller AFTER appending to DOM
  // so getBoundingClientRect() returns real dimensions.

  // GSAP entrance animation
  if (window.gsap) {
    gsap.fromTo(menu,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.2 }
    );
  }

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', (e) => onOutsideClick(e, menu), { once: true, capture: true });
  }, 10);

  return menu;
}

export function createTriggerButton(options) {
  const { x, y, onClick } = options;
  const btn = document.createElement('button');
  btn.id = 's2ai-trigger-btn';
  btn.className = 's2ai-trigger-btn';
  btn.innerHTML = getIconSvg('zap', 18);
  btn.title = 'Open Select2AI actions';
  btn.setAttribute('aria-label', 'Open actions');

  btn.style.position = 'fixed';
  btn.style.zIndex = '2147483647';
  btn.style.left = `${x + 8}px`;
  btn.style.top = `${y + 8}px`;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });

  if (window.gsap) {
    gsap.fromTo(btn,
      { opacity: 0, y: 5 },
      { opacity: 1, y: 0, duration: 0.2 }
    );
  }

  return btn;
}

function isEmoji(str) {
  return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(str || '');
}

// ── Panel ─────────────────────────────────────────────────────
export function createPanel(options) {
  const { action, selectedText, detection, customTitle, settings, pageContextEnabled, getPageContext, onClose, onContextToggle, onClearChat, onCustomSend, onFollowupSend } = options;
  const actionMeta = getActionMeta(action);
  const title = customTitle || actionMeta.label;

  const panelEl = document.createElement('div');
  panelEl.id = 's2ai-panel';
  panelEl.className = 's2ai-panel';
  panelEl.setAttribute('role', 'dialog');
  panelEl.setAttribute('aria-label', 'Select2AI Response');

  panelEl.innerHTML = `
    <div class="s2ai-panel-header">
      <div class="s2ai-panel-title">
        <span class="s2ai-panel-icon">${getIconSvg(actionMeta.icon, 15)}</span>
        <span class="s2ai-panel-title-text">${escapeHtml(title)}</span>
        ${detection ? `<span class="s2ai-type-chip s2ai-type-chip--${detection.type}">${getTypeIcon(detection.type)} ${detection.wordCount}w</span>` : ''}
      </div>
      <div class="s2ai-panel-controls">
        <button class="s2ai-ctrl-btn" id="s2ai-context-btn" title="${pageContextEnabled ? 'Page context ON' : 'Page context OFF'}">
          ${getIconSvg('ctrl-context', 13)}
        </button>
        <button class="s2ai-ctrl-btn" id="s2ai-chat-clear-btn" title="Clear conversation">
          ${getIconSvg('ctrl-clear', 13)}
        </button>
        <button class="s2ai-ctrl-btn s2ai-close-btn" id="s2ai-panel-close" title="Close (Esc)" aria-label="Close">
          ${getIconSvg('ctrl-close', 13)}
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
            ${getIconSvg('ctrl-send', 14)}
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
          ${getIconSvg('ctrl-send', 13)}
        </button>
      </div>
    </div>

    <div class="s2ai-panel-footer">
      <span class="s2ai-model-indicator">${escapeHtml(settings.model || 'gpt-4.1-mini')}</span>
      ${pageContextEnabled ? `<span class="s2ai-context-indicator">${getIconSvg('indicator-page-context', 10)} Page context</span>` : ''}
      <span class="s2ai-powered">${getIconSvg('indicator-powered', 10)} GitHub Models</span>
    </div>
  `;

  // Wire events
  panelEl.querySelector('#s2ai-panel-close').addEventListener('click', onClose);

  const ctxBtn = panelEl.querySelector('#s2ai-context-btn');
  ctxBtn.classList.toggle('s2ai-ctrl-btn--active', pageContextEnabled);
  ctxBtn.addEventListener('click', () => {
    const newState = onContextToggle();
    ctxBtn.classList.toggle('s2ai-ctrl-btn--active', newState);
    ctxBtn.title = newState ? 'Page context ON' : 'Page context OFF';
    showToast(`${getIconSvg('indicator-page-context', 12)} ${newState ? 'Page context ON' : 'Page context OFF'}`, panelEl);
  });

  panelEl.querySelector('#s2ai-chat-clear-btn').addEventListener('click', () => {
    onClearChat();
    const turnEl = panelEl.querySelector('.s2ai-turn-count');
    if (turnEl) turnEl.textContent = '0 turns';
    const followUp = panelEl.querySelector('.s2ai-followup-area');
    if (followUp) followUp.style.display = 'none';
    showToast(`${getIconSvg('refresh-cw', 12)} Conversation cleared`, panelEl);
  });

  // Custom send
  if (action === 'custom') {
    const textarea = panelEl.querySelector('.s2ai-custom-textarea');
    const sendBtn = panelEl.querySelector('#s2ai-custom-send');
    const doSend = () => {
      const q = textarea.value.trim();
      if (!q) return;
      textarea.value = '';
      panelEl.querySelector('.s2ai-answer-area').innerHTML =
        '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div>';
      onCustomSend(q);
    };
    sendBtn.addEventListener('click', doSend);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doSend();
    });
    textarea.focus();
  }

  // Follow-up
  const followupInput = panelEl.querySelector('.s2ai-followup-input');
  const followupSend = panelEl.querySelector('.s2ai-followup-send');
  const sendFollowup = () => {
    const q = followupInput.value.trim();
    if (!q) return;
    followupInput.value = '';
    panelEl.querySelector('.s2ai-answer-area').innerHTML =
      '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div>';
    const existingToolbar = panelEl.querySelector('.s2ai-response-toolbar');
    if (existingToolbar) existingToolbar.remove();
    onFollowupSend(q);
  };
  followupSend.addEventListener('click', sendFollowup);
  followupInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendFollowup();
  });

  // Draggable
  makeDraggable(panelEl, panelEl.querySelector('.s2ai-panel-header'));

  // Animation
  if (window.gsap) {
    gsap.fromTo(panelEl,
      { opacity: 0, y: 20, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'power2.out' }
    );
  } else {
    panelEl.style.opacity = '1';
  }

  // NOTE: positionPanel is called by the caller AFTER appending to DOM
  // so getBoundingClientRect() returns real dimensions.
  return panelEl;
}

export function animatePanelClose(panel, onComplete) {
  if (window.gsap) {
    gsap.to(panel, {
      opacity: 0, y: 10, scale: 0.97, duration: 0.18,
      ease: 'power2.in',
      onComplete
    });
  } else {
    onComplete();
  }
}

// ── Language Picker ───────────────────────────────────────────
export function createLanguagePicker(action, panelEl) {
  const langs = action === 'convert-language'
    ? ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin']
    : ['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Hindi', 'Portuguese', 'Italian', 'Russian', 'Korean'];

  const body = panelEl.querySelector('.s2ai-panel-body');
  body.innerHTML = `
    <div class="s2ai-lang-picker">
      <p class="s2ai-lang-picker-label">${action === 'convert-language' ? 'Convert to:' : 'Translate to:'}</p>
      <div class="s2ai-lang-grid">
        ${langs.map(l => `<button class="s2ai-lang-btn" data-lang="${l}">${l}</button>`).join('')}
      </div>
      <div class="s2ai-custom-lang">
        <input type="text" class="s2ai-lang-input" placeholder="Other language…" />
        <button class="s2ai-lang-confirm-btn">${getIconSvg('corner-down-right', 14)}</button>
      </div>
  `;
  return body;
}
