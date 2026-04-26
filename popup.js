// ============================================================
// Select2AI Popup v2.0
// ============================================================

// ── Helpers ──────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '<')
    .replace(/>/g, '>').replace(/"/g, '"');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function msg(type, data = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...data }, resolve);
  });
}

function refreshIcons(root = document) {
  if (window.lucide) lucide.createIcons({ attrs: { 'stroke-width': 2 }, nodes: [root] });
}

// ── Status Banner ─────────────────────────────────────────────
async function checkStatus() {
  const banner = $('status-banner');
  const settings = await new Promise(r =>
    chrome.storage.sync.get({ githubToken: '' }, r)
  );

  if (!settings.githubToken) {
    banner.innerHTML = `${S2AI_ICONS.icon('alert-triangle', 12)} No API token set — click settings to configure`;
    banner.className = 'status-warn';
  } else {
    banner.innerHTML = `${S2AI_ICONS.icon('check-circle', 12)} Ready — select text on any page to use Select2AI`;
    banner.className = 'status-ok';
  }
}

// ── Tabs ──────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.popup-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      document.querySelectorAll('.popup-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      $(`tab-${id}`)?.classList.add('active');

      if (id === 'history') loadHistory();
      if (id === 'kb') loadKB();
    });
  });
}

// ── Theme ────────────────────────────────────────────────────
function applyTheme(theme) {
  if (theme === 'system' || !theme) {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

// ── Settings ──────────────────────────────────────────────────
async function loadSettings() {
  const s = await new Promise(r =>
    chrome.storage.sync.get({
      model: 'openai/gpt-4.1-mini',
      streamingEnabled: true,
      pageContextDefault: false,
      theme: 'system'
    }, r)
  );

  const modelSelect = $('model-select');
  if (modelSelect) modelSelect.value = s.model;

  const streamToggle = $('toggle-streaming');
  if (streamToggle) streamToggle.checked = s.streamingEnabled;

  const ctxToggle = $('toggle-pagecontext');
  if (ctxToggle) ctxToggle.checked = s.pageContextDefault;

  const themeSelect = $('theme-select');
  if (themeSelect) themeSelect.value = s.theme;
  applyTheme(s.theme);
}

function bindSettingsListeners() {
  $('model-select')?.addEventListener('change', (e) => {
    chrome.storage.sync.set({ model: e.target.value });
  });

  $('toggle-streaming')?.addEventListener('change', (e) => {
    chrome.storage.sync.set({ streamingEnabled: e.target.checked });
  });

  $('toggle-pagecontext')?.addEventListener('change', (e) => {
    chrome.storage.sync.set({ pageContextDefault: e.target.checked });
  });

  $('theme-select')?.addEventListener('change', (e) => {
    const val = e.target.value;
    chrome.storage.sync.set({ theme: val });
    applyTheme(val);
  });
}

// ── Stats ─────────────────────────────────────────────────────
async function loadStats() {
  const [histData, kbData] = await Promise.all([
    msg('GET_HISTORY', { filter: {} }),
    msg('GET_KB', { query: '' })
  ]);

  const histCount = histData?.history?.length ?? 0;
  const kbCount = kbData?.knowledgeBase?.length ?? 0;

  const templateCount = await new Promise(r =>
    chrome.storage.sync.get({ promptTemplates: [] }, d => r(d.promptTemplates.length))
  );

  const statH = $('stat-history');
  const statKB = $('stat-kb');
  const statT = $('stat-templates');
  if (statH) statH.textContent = histCount;
  if (statKB) statKB.textContent = kbCount;
  if (statT) statT.textContent = templateCount + 5; // +5 defaults
}

// ── History Tab ───────────────────────────────────────────────
let historyCache = [];
let historySearchDebounce;

async function loadHistory(query = '') {
  const container = $('history-list');
  if (!container) return;

  const data = await msg('GET_HISTORY', { filter: { query, limit: 100 } });
  historyCache = data?.history || [];
  renderHistory(historyCache);
}

function renderHistory(items) {
  const container = $('history-list');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${S2AI_ICONS.icon('clock', 36)}</div>
        <div class="empty-state-title">No history yet</div>
        <div class="empty-state-text">Your AI query history will appear here</div>`;
    refreshIcons(container);
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="list-item" data-id="${escapeHtml(item.id)}" data-type="history">
      <div class="list-item-header">
        <span class="list-item-action">${escapeHtml(item.action || 'query')}</span>
        <span class="list-item-date">${formatDate(item.timestamp)}</span>
      </div>
      <div class="list-item-prompt">${escapeHtml(item.prompt?.slice(0, 80) || 'Untitled')}</div>
      <div class="list-item-preview">${escapeHtml(item.response?.slice(0, 100) || '')}…</div>
      <div class="list-item-footer">
        <span class="list-item-url" title="${escapeHtml(item.url || '')}">
          ${escapeHtml(getHostname(item.url))}
        </span>
        <button class="list-item-delete" data-id="${escapeHtml(item.id)}" title="Delete">${S2AI_ICONS.icon('x', 12)}</button>
      </div>
    </div>
  `).join('');

  refreshIcons(container);

  // Click to view detail
  container.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('list-item-delete')) return;
      const item = historyCache.find(h => h.id === el.dataset.id);
      if (item) showDetail(item, 'history');
    });
  });

  // Delete buttons
  container.querySelectorAll('.list-item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await msg('DELETE_HISTORY', { id: btn.dataset.id });
      loadHistory($('history-search')?.value || '');
      loadStats();
    });
  });
}

function initHistoryTab() {
  $('history-search')?.addEventListener('input', (e) => {
    clearTimeout(historySearchDebounce);
    historySearchDebounce = setTimeout(() => loadHistory(e.target.value), 300);
  });

  $('btn-clear-history')?.addEventListener('click', async () => {
    if (!confirm('Clear all history? This cannot be undone.')) return;
    await msg('CLEAR_HISTORY');
    loadHistory();
    loadStats();
  });
}

// ── Knowledge Base Tab ─────────────────────────────────────────
let kbCache = [];
let kbSearchDebounce;

async function loadKB(query = '') {
  const container = $('kb-list');
  if (!container) return;

  const data = await msg('GET_KB', { query });
  kbCache = data?.knowledgeBase || [];
  renderKB(kbCache);
}

function renderKB(items) {
  const container = $('kb-list');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${S2AI_ICONS.icon('book-open', 36)}</div>
        <div class="empty-state-title">Knowledge Base is empty</div>
        <div class="empty-state-text">Use the ${S2AI_ICONS.icon('bookmark', 12)} bookmark button on any AI response to save it here</div>`;
    refreshIcons(container);
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="list-item" data-id="${escapeHtml(item.id)}" data-type="kb">
      <div class="list-item-header">
        <span class="list-item-action">${escapeHtml(item.action || 'saved')}</span>
        <span class="list-item-date">${formatDate(item.savedAt)}</span>
      </div>
      <div class="list-item-prompt">${escapeHtml(item.prompt?.slice(0, 80) || 'Saved snippet')}</div>
      <div class="list-item-preview">${escapeHtml(item.snippet?.slice(0, 100) || '')}…</div>
      <div class="list-item-footer">
        <span class="list-item-url" title="${escapeHtml(item.url || '')}">
          ${escapeHtml(getHostname(item.url))}
        </span>
        <button class="list-item-delete" data-id="${escapeHtml(item.id)}" title="Remove from KB">${S2AI_ICONS.icon('x', 12)}</button>
      </div>
    </div>
  `).join('');

  refreshIcons(container);

  container.querySelectorAll('.list-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('list-item-delete')) return;
      const item = kbCache.find(k => k.id === el.dataset.id);
      if (item) showDetail(item, 'kb');
    });
  });

  container.querySelectorAll('.list-item-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await msg('DELETE_KB', { id: btn.dataset.id });
      loadKB($('kb-search')?.value || '');
      loadStats();
    });
  });
}

function initKBTab() {
  $('kb-search')?.addEventListener('input', (e) => {
    clearTimeout(kbSearchDebounce);
    kbSearchDebounce = setTimeout(() => loadKB(e.target.value), 300);
  });
}

// ── Detail Overlay ────────────────────────────────────────────
function showDetail(item, type) {
  const overlay = $('detail-overlay');
  const titleEl = $('detail-title');
  const bodyEl = $('detail-body');

  const isHistory = type === 'history';
  const content = isHistory ? item.response : item.snippet;
  const label = isHistory ? 'Response' : 'Saved Snippet';

  titleEl.textContent = (item.prompt || 'Detail').slice(0, 50);

  bodyEl.innerHTML = `
    <div>
      <div class="detail-section-label">Prompt / Query</div>
      <div class="detail-text">${escapeHtml(item.prompt || '')}</div>
    </div>
    <div>
      <div class="detail-section-label">${label}</div>
      <div class="detail-text">${escapeHtml(content || '')}</div>
    </div>
    <div>
      <div class="detail-section-label">Details</div>
      <div style="font-size:11px;color:var(--text3);display:flex;flex-direction:column;gap:3px">
        ${isHistory ? `<span>Action: <strong>${escapeHtml(item.action || 'query')}</strong></span>` : ''}
        ${isHistory ? `<span>Model: <strong>${escapeHtml(item.model || 'N/A')}</strong></span>` : ''}
        <span>Date: <strong>${new Date(item.timestamp || item.savedAt).toLocaleString()}</strong></span>
        ${item.url ? `<span>URL: <a href="${escapeHtml(item.url)}" target="_blank" style="color:var(--accent)">${escapeHtml(item.url.slice(0, 60))}</a></span>` : ''}
      </div>
    </div>
    <div class="detail-actions">
      <button class="detail-action-btn" id="detail-copy">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy Response
      </button>
      ${isHistory ? `
        <button class="detail-action-btn" id="detail-save-kb">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          Save to KB
        </button>` : ''}
      <button class="detail-action-btn" id="detail-delete" style="color:var(--error);border-color:var(--error)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        Delete
      </button>
    </div>
  `;

  overlay.classList.add('open');

  $('detail-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(content || '');
    const btn = $('detail-copy');
    if (btn) { btn.innerHTML = `${S2AI_ICONS.icon('check-circle', 12)} Copied!`; setTimeout(() => { btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Response`; }, 1500); }
  });

  $('detail-save-kb')?.addEventListener('click', async () => {
    await msg('SAVE_KB', {
      data: { snippet: item.response, prompt: item.prompt, action: item.action, url: item.url, title: item.title }
    });
    const btn = $('detail-save-kb');
    if (btn) { btn.innerHTML = `${S2AI_ICONS.icon('check-circle', 12)} Saved!`; btn.disabled = true; }
    loadStats();
  });

  $('detail-delete')?.addEventListener('click', async () => {
    if (!confirm('Delete this item?')) return;
    if (type === 'history') {
      await msg('DELETE_HISTORY', { id: item.id });
      loadHistory();
    } else {
      await msg('DELETE_KB', { id: item.id });
      loadKB();
    }
    loadStats();
    closeDetail();
  });
}

function closeDetail() {
  $('detail-overlay')?.classList.remove('open');
}

// ── Navigation ────────────────────────────────────────────────
function initNavigation() {
  $('btn-open-options')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  $('btn-goto-options')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  $('btn-goto-templates')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  $('detail-back')?.addEventListener('click', closeDetail);
}

// ── Utils ─────────────────────────────────────────────────────
function getHostname(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url || ''; }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initNavigation();
  bindSettingsListeners();
  initHistoryTab();
  initKBTab();

  await Promise.all([
    checkStatus(),
    loadSettings(),
    loadStats()
  ]);

  refreshIcons();
});
