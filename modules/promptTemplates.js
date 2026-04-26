// ============================================================
// Select2AI Module: Custom Prompt Templates
// Manage user-defined reusable prompt templates
// ============================================================

const STORAGE_KEY = 'promptTemplates';

/** Default factory templates - using Lucide icon names */
export const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_eli5',
    name: 'Explain Like I\'m 5',
    icon: 'baby',
    body: 'Explain the following in the simplest terms possible, as if explaining to a 5-year-old:\n\n{selection}',
    category: 'explain',
    isDefault: true
  },
  {
    id: 'tpl_bullet',
    name: 'Key Bullet Points',
    icon: 'list',
    body: 'Extract the key bullet points from the following text. Be concise:\n\n{selection}',
    category: 'summarize',
    isDefault: true
  },
  {
    id: 'tpl_critique',
    name: 'Critical Analysis',
    icon: 'target',
    body: 'Provide a critical analysis of the following, highlighting strengths, weaknesses, and areas for improvement:\n\n{selection}',
    category: 'analyze',
    isDefault: true
  },
  {
    id: 'tpl_context',
    name: 'Add Context',
    icon: 'globe',
    body: 'Explain the broader context and background of the following from the page "{title}" ({url}):\n\n{selection}',
    category: 'explain',
    isDefault: true
  },
  {
    id: 'tpl_counterarg',
    name: 'Counter Arguments',
    icon: 'scale',
    body: 'What are the main counter-arguments or opposing perspectives to the following statement or idea?\n\n{selection}',
    category: 'analyze',
    isDefault: true
  }
];

/**
 * Load all templates (defaults + user-created)
 */
export async function loadTemplates() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (data) => {
      const userTemplates = data[STORAGE_KEY];
      // Merge: user templates first, then defaults not overridden
      const userIds = new Set(userTemplates.map(t => t.id));
      const defaults = DEFAULT_TEMPLATES.filter(t => !userIds.has(t.id));
      resolve([...userTemplates, ...defaults]);
    });
  });
}

/**
 * Save a template (create or update)
 */
export async function saveTemplate(template) {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (data) => {
      let templates = data[STORAGE_KEY];
      const idx = templates.findIndex(t => t.id === template.id);
      if (idx >= 0) {
        templates[idx] = template;
      } else {
        templates.unshift({ ...template, id: template.id || `tpl_${Date.now()}` });
      }
      chrome.storage.sync.set({ [STORAGE_KEY]: templates }, () => resolve({ success: true }));
    });
  });
}

/**
 * Delete a user-created template by id
 */
export async function deleteTemplate(id) {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: [] }, (data) => {
      const templates = data[STORAGE_KEY].filter(t => t.id !== id);
      chrome.storage.sync.set({ [STORAGE_KEY]: templates }, () => resolve({ success: true }));
    });
  });
}

/**
 * Apply template variables to a template body
 */
export function applyTemplate(template, variables = {}) {
  let body = template.body;
  const safeVars = {
    selection: variables.selection || '',
    url: variables.url || location.href,
    title: variables.title || document.title,
    language: variables.language || ''
  };

  // HTML-escape all variable values before inserting
  for (const [key, value] of Object.entries(safeVars)) {
    body = body.replace(new RegExp(`\\{${key}\\}`, 'g'), escapeHtml(value));
  }

  // Unescape {selection} - we want raw text for AI, not HTML
  body = body.replace(new RegExp(`\\{selection\\}`, 'g'), safeVars.selection);

  return body;
}

/**
 * Create a new blank template object
 */
export function createBlankTemplate(name) {
  return {
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: name || 'New Template',
    icon: 'zap',
    body: 'Your prompt here:\n\n{selection}',
    category: 'custom',
    isDefault: false
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}
