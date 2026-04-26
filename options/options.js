// ============================================================
// Select2AI Options Page v2.0
// ============================================================

const DEFAULT_TEMPLATES = [
  { id: 'tpl_eli5', name: "Explain Like I'm 5", icon: '👶', body: 'Explain the following in the simplest terms possible, as if explaining to a 5-year-old:\n\n{selection}', category: 'explain', isDefault: true },
  { id: 'tpl_bullet', name: 'Key Bullet Points', icon: '📌', body: 'Extract the key bullet points from the following text. Be concise:\n\n{selection}', category: 'summarize', isDefault: true },
  { id: 'tpl_critique', name: 'Critical Analysis', icon: '🎯', body: 'Provide a critical analysis of the following, highlighting strengths, weaknesses, and areas for improvement:\n\n{selection}', category: 'analyze', isDefault: true },
  { id: 'tpl_context', name: 'Add Context', icon: '🌍', body: 'Explain the broader context and background of the following from the page "{title}" ({url}):\n\n{selection}', category: 'explain', isDefault: true },
  { id: 'tpl_counterarg', name: 'Counter Arguments', icon: '⚖️', body: 'What are the main counter-arguments or opposing perspectives to the following statement or idea?\n\n{selection}', category: 'analyze', isDefault: true }
];

// ── Helpers ───────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg = '✅ Settings saved!') {
  const toast = $('save-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function msg(type, data = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...data }, resolve);
  });
}

// ── Sidebar Navigation ─────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll('.opts-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      document.querySelectorAll('.opts-nav-link').forEach(l => l.classList.remove('active'));
      document.querySelectorAll('.opts-section').forEach(s => s.classList.remove('active'));
      link.classList.add('active');
      $(`section-${section}`)?.classList.add('active');
    });
  });
}

// ── API Section ────────────────────────────────────────────────
function initApiSection() {
  // Token visibility toggle
  $('toggle-token-vis')?.addEventListener('click', () => {
    const input = $('github-token');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  // Test connection
  $('btn-test-token')?.addEventListener('click', async () => {
    const token = $('github-token')?.value?.trim();
    const endpoint = $('api-endpoint')?.value?.trim() || 'https://models.github.ai/inference';
    const model = $('default-model')?.value || 'openai/gpt-4o-mini';
    const statusEl = $('token-status');

    if (!token) {
      if (statusEl) { statusEl.textContent = '⚠️ Please enter a token first'; statusEl.className = 'opts-token-status err'; }
      return;
    }

    if (statusEl) { statusEl.textContent = '🔄 Testing connection…'; statusEl.className = 'opts-token-status loading'; }

    try {
      const res = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say "OK" only.' }],
          max_tokens: 10
        })
      });

      if (res.ok) {
        if (statusEl) { statusEl.textContent = '✅ Connection successful! API token is valid.'; statusEl.className = 'opts-token-status ok'; }
      } else {
        const err = await res.text();
        if (statusEl) { statusEl.textContent = `❌ Error ${res.status}: ${err.slice(0, 100)}`; statusEl.className = 'opts-token-status err'; }
      }
    } catch (e) {
      if (statusEl) { statusEl.textContent = `❌ Connection failed: ${e.message}`; statusEl.className = 'opts-token-status err'; }
    }
  });
}

// ── Load Settings into UI ──────────────────────────────────────
async function loadSettings() {
  const s = await new Promise(r => chrome.storage.sync.get({
    githubToken: '',
    endpoint: 'https://models.github.ai/inference',
    model: 'openai/gpt-4.1-mini',
    streamingEnabled: true,
    pageContextDefault: false,
    autoSaveHistory: true,
    showInsightsBar: true,
    historyLimit: 150,
    compareModelA: 'openai/gpt-4.1',
    compareModelB: 'meta/Llama-4-Scout-17B-16E-Instruct'
  }, r));

  setValue('github-token', s.githubToken);
  setValue('api-endpoint', s.endpoint);
  setValue('default-model', s.model);
  setChecked('opt-streaming', s.streamingEnabled);
  setChecked('opt-pagecontext', s.pageContextDefault);
  setChecked('opt-autosave', s.autoSaveHistory);
  setChecked('opt-insights', s.showInsightsBar);
  setValue('opt-history-limit', String(s.historyLimit));
  setValue('compare-model-a', s.compareModelA);
  setValue('compare-model-b', s.compareModelB);
}

function setValue(id, val) {
  const el = $(id);
  if (el) el.value = val;
}

function setChecked(id, val) {
  const el = $(id);
  if (el) el.checked = val;
}

function getChecked(id) {
  return $(id)?.checked ?? false;
}

// ── Save All Settings ──────────────────────────────────────────
async function saveAllSettings() {
  const settings = {
    githubToken: $('github-token')?.value?.trim() || '',
    endpoint: $('api-endpoint')?.value?.trim() || 'https://models.github.ai/inference',
    model: $('default-model')?.value || 'openai/gpt-4.1-mini',
    streamingEnabled: getChecked('opt-streaming'),
    pageContextDefault: getChecked('opt-pagecontext'),
    autoSaveHistory: getChecked('opt-autosave'),
    showInsightsBar: getChecked('opt-insights'),
    historyLimit: parseInt($('opt-history-limit')?.value || '150'),
    compareModelA: $('compare-model-a')?.value || 'openai/gpt-4.1',
    compareModelB: $('compare-model-b')?.value || 'meta/Llama-4-Scout-17B-16E-Instruct'
  };

  await new Promise(r => chrome.storage.sync.set(settings, r));
  showToast('✅ Settings saved!');
}

// ── Templates Section ──────────────────────────────────────────
let templates = [];
let editingId = null;

async function loadTemplates() {
  const data = await new Promise(r => chrome.storage.sync.get({ promptTemplates: [] }, r));
  const userTemplates = data.promptTemplates;
  const userIds = new Set(userTemplates.map(t => t.id));
  const defaults = DEFAULT_TEMPLATES.filter(t => !userIds.has(t.id));
  templates = [...userTemplates, ...defaults];
  renderTemplates();
}

function renderTemplates() {
  const list = $('templates-list');
  if (!list) return;

  if (!templates.length) {
    list.innerHTML = '<div class="opts-empty-templates">No templates yet. Click "+ New Template" to create one.</div>';
    return;
  }

  list.innerHTML = templates.map(t => `
    <div class="opts-template-item" data-id="${escapeHtml(t.id)}">
      <div class="opts-template-icon">${t.icon || '⚡'}</div>
      <div class="opts-template-info">
        <div class="opts-template-name">${escapeHtml(t.name)}</div>
        <div class="opts-template-preview">${escapeHtml(t.body?.slice(0, 80) || '')}</div>
        <div style="margin-top:4px">
          <span class="opts-template-badge">${escapeHtml(t.category || 'custom')}</span>
          ${t.isDefault ? '<span class="opts-template-default-badge">  (built-in)</span>' : ''}
        </div>
      </div>
      <div class="opts-template-actions">
        <button class="opts-tpl-btn btn-edit-tpl" data-id="${escapeHtml(t.id)}">Edit</button>
        ${!t.isDefault ? `<button class="opts-tpl-btn opts-tpl-btn--delete btn-delete-tpl" data-id="${escapeHtml(t.id)}">✕</button>` : ''}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.btn-edit-tpl').forEach(btn => {
    btn.addEventListener('click', () => openTemplateEditor(btn.dataset.id));
  });

  list.querySelectorAll('.btn-delete-tpl').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this template?')) return;
      await deleteUserTemplate(btn.dataset.id);
    });
  });
}

function openTemplateEditor(id = null) {
  const editor = $('template-editor');
  const editorTitle = $('editor-title');
  if (!editor) return;

  editingId = id;

  if (id) {
    const tpl = templates.find(t => t.id === id);
    if (!tpl) return;
    if (editorTitle) editorTitle.textContent = `Edit: ${tpl.name}`;
    setValue('tpl-name', tpl.name);
    setValue('tpl-icon', tpl.icon || '⚡');
    setValue('tpl-body', tpl.body || '');
    setValue('tpl-category', tpl.category || 'custom');
    setValue('tpl-editing-id', tpl.id);
  } else {
    if (editorTitle) editorTitle.textContent = 'New Template';
    setValue('tpl-name', '');
    setValue('tpl-icon', '⚡');
    setValue('tpl-body', '{selection}');
    setValue('tpl-category', 'custom');
    setValue('tpl-editing-id', '');
  }

  editor.style.display = 'block';
  editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('tpl-name')?.focus();
}

function closeTemplateEditor() {
  const editor = $('template-editor');
  if (editor) editor.style.display = 'none';
  editingId = null;
}

async function saveTemplate() {
  const name = $('tpl-name')?.value?.trim();
  const icon = $('tpl-icon')?.value?.trim() || '⚡';
  const body = $('tpl-body')?.value?.trim();
  const category = $('tpl-category')?.value || 'custom';
  const editId = $('tpl-editing-id')?.value;

  if (!name) { alert('Please enter a template name.'); return; }
  if (!body) { alert('Please enter a template body.'); return; }

  const data = await new Promise(r => chrome.storage.sync.get({ promptTemplates: [] }, r));
  let userTemplates = data.promptTemplates;

  if (editId) {
    const idx = userTemplates.findIndex(t => t.id === editId);
    const updatedTpl = { id: editId, name, icon, body, category, isDefault: false };
    if (idx >= 0) {
      userTemplates[idx] = updatedTpl;
    } else {
      // Was a default template being "edited" → create user override
      userTemplates.unshift(updatedTpl);
    }
  } else {
    userTemplates.unshift({
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name, icon, body, category, isDefault: false
    });
  }

  await new Promise(r => chrome.storage.sync.set({ promptTemplates: userTemplates }, r));
  closeTemplateEditor();
  await loadTemplates();
  showToast('✅ Template saved!');
}

async function deleteUserTemplate(id) {
  const data = await new Promise(r => chrome.storage.sync.get({ promptTemplates: [] }, r));
  const userTemplates = data.promptTemplates.filter(t => t.id !== id);
  await new Promise(r => chrome.storage.sync.set({ promptTemplates: userTemplates }, r));
  await loadTemplates();
  showToast('🗑️ Template deleted');
}

function initTemplatesSection() {
  $('btn-new-template')?.addEventListener('click', () => openTemplateEditor(null));
  $('btn-save-template')?.addEventListener('click', saveTemplate);
  $('btn-cancel-template')?.addEventListener('click', closeTemplateEditor);
}

// ── Data Section ───────────────────────────────────────────────
async function loadDataStats() {
  const statsEl = $('data-stats');
  if (!statsEl) return;

  const [histData, kbData, tplData] = await Promise.all([
    new Promise(r => chrome.runtime.sendMessage({ type: 'GET_HISTORY', filter: {} }, r)),
    new Promise(r => chrome.runtime.sendMessage({ type: 'GET_KB', query: '' }, r)),
    new Promise(r => chrome.storage.sync.get({ promptTemplates: [] }, r))
  ]);

  const histCount = histData?.history?.length ?? 0;
  const kbCount = kbData?.knowledgeBase?.length ?? 0;
  const tplCount = tplData.promptTemplates?.length ?? 0;

  statsEl.innerHTML = `
    <strong>Storage Usage:</strong><br>
    📜 History: ${histCount} entries<br>
    📚 Knowledge Base: ${kbCount} snippets<br>
    ⚡ Custom Templates: ${tplCount} user-created
  `;
}

function initDataSection() {
  $('btn-clear-history-opts')?.addEventListener('click', async () => {
    if (!confirm('Clear all query history? This cannot be undone.')) return;
    await new Promise(r => chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, r));
    await loadDataStats();
    showToast('🗑️ History cleared');
  });

  $('btn-clear-kb')?.addEventListener('click', async () => {
    if (!confirm('Clear entire Knowledge Base? This cannot be undone.')) return;
    await new Promise(r => chrome.storage.local.set({ knowledgeBase: [] }, r));
    await loadDataStats();
    showToast('🗑️ Knowledge Base cleared');
  });

  $('btn-clear-templates')?.addEventListener('click', async () => {
    if (!confirm('Reset all custom templates back to defaults? Your user-created templates will be deleted.')) return;
    await new Promise(r => chrome.storage.sync.set({ promptTemplates: [] }, r));
    await loadTemplates();
    await loadDataStats();
    showToast('🔄 Templates reset to defaults');
  });

  $('btn-reset-all')?.addEventListener('click', async () => {
    if (!confirm('⚠️ Reset ALL settings to default? This includes your API token, model selection, and all preferences.')) return;
    await new Promise(r => chrome.storage.sync.clear(r));
    await loadSettings();
    showToast('⚠️ All settings reset');
  });
}

// ── Save Bar ──────────────────────────────────────────────────
function initSaveBar() {
  $('btn-save-all')?.addEventListener('click', saveAllSettings);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  initApiSection();
  initTemplatesSection();
  initDataSection();
  initSaveBar();

  await Promise.all([
    loadSettings(),
    loadTemplates(),
    loadDataStats()
  ]);
});
