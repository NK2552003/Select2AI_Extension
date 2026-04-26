// ============================================================
// Select2AI Icon Registry
// Inline SVG paths for Lucide icons used across the extension
// Replaces emoji usage in content scripts and modules
// ============================================================

/** @type {Record<string, string>} */
const PATHS = {
  'home': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  'copy': '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  'bookmark': '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  'sparkles': '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 5H5"/><path d="M19 18v4"/><path d="M19 14h-4"/>',
  'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
  'refresh-cw': '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  'code': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  'help-circle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'calculator': '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/>',
  'table': '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/>',
  'align-left': '<line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/>',
  'lightbulb': '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  'edit-3': '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  'microscope': '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1 2-2h1a1 1 0 0 0 1-1V7a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2Z"/>',
  'bug': '<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
  'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  'globe': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  'briefcase': '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  'smile': '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  'scissors': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
  'baby': '<path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3 1 4 1.5a5 5 0 0 0 3 1.8z"/>',
  'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'scale': '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  'key': '<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  'keyboard': '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/><path d="M7 16h10"/>',
  'git-compare': '<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  'plug': '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-8 0V8Z"/>',
  'trash-2': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  'scroll-text': '<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 0 0-2-2H4"/><path d="M19 17V5a2 2 0 0 0-2-2H6"/><path d="M15 8h-5"/><path d="M15 12h-5"/><path d="M10 16H8"/>',
  'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  'send': '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
  'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  'corner-down-right': '<polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
  'layout': '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  'volume-2': '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  'loader': '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>',
  'file-code': '<path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 12 12 15 15"/><polyline points="12 12 12 18"/>',
  'rotate-ccw': '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>',
  'check': '<polyline points="20 6 9 17 4 12"/>'
};

/** Map of semantic keys to icon names */
export const ICON_MAP = {
  // Popup tabs
  'tab-home': 'home',
  'tab-history': 'clock',
  'tab-kb': 'book-open',

  // Popup quick actions
  'action-settings': 'settings',
  'action-templates': 'zap',

  // Status
  'status-warn': 'alert-triangle',
  'status-ok': 'check-circle',

  // Empty states
  'empty-history': 'clock',
  'empty-kb': 'book-open',
  'empty-kb-hint': 'bookmark',

  // Detail buttons
  'btn-copy': 'copy',
  'btn-copied': 'check-circle',
  'btn-save': 'bookmark',
  'btn-saved': 'check-circle',
  'btn-delete': 'x',

  // Content type icons
  'type-code': 'code',
  'type-question': 'help-circle',
  'type-url': 'link',
  'type-math': 'calculator',
  'type-table': 'table',
  'type-prose': 'file-text',

  // Action menu
  'action-summarize': 'align-left',
  'action-explain': 'lightbulb',
  'action-answer': 'help-circle',
  'action-what-is': 'search',
  'action-custom': 'edit-3',
  'action-explain-code': 'microscope',
  'action-find-bugs': 'bug',
  'action-refactor': 'refresh-cw',
  'action-add-comments': 'message-square',
  'action-convert-language': 'refresh-cw',
  'action-translate': 'globe',
  'action-rewrite-pro': 'briefcase',
  'action-rewrite-casual': 'smile',
  'action-rewrite-concise': 'scissors',
  'action-solve': 'calculator',

  // Badges
  'badge-suggested': 'sparkles',

  // Panel indicators
  'indicator-page-context': 'file-text',
  'indicator-compare': 'git-compare',
  'indicator-powered': 'zap',

  // Panel controls
  'ctrl-context': 'info',
  'ctrl-clear': 'rotate-ccw',
  'ctrl-close': 'x',
  'ctrl-send': 'send',

  // Toasts
  'toast-success': 'check-circle',
  'toast-info': 'refresh-cw',
  'toast-warn': 'alert-triangle',
  'toast-page-context-on': 'file-text',
  'toast-page-context-off': 'file-text',
  'toast-conversation-cleared': 'refresh-cw',

  // Options sidebar
  'nav-api': 'key',
  'nav-behavior': 'settings',
  'nav-templates': 'zap',
  'nav-shortcuts': 'keyboard',
  'nav-compare': 'git-compare',
  'nav-data': 'database',

  // Options buttons
  'btn-test': 'plug',
  'btn-clear-history': 'trash-2',
  'btn-clear-kb': 'trash-2',
  'btn-reset-templates': 'refresh-cw',
  'btn-reset-all': 'alert-triangle',

  // Options stats
  'stat-history': 'scroll-text',
  'stat-kb': 'book-open',
  'stat-templates': 'zap',

  // Options toast
  'toast-settings-saved': 'check-circle',
  'toast-template-saved': 'check-circle',
  'toast-template-deleted': 'trash-2',
  'toast-history-cleared': 'trash-2',
  'toast-kb-cleared': 'trash-2',
  'toast-templates-reset': 'refresh-cw',
  'toast-all-reset': 'alert-triangle',

  // Templates
  'tpl-eli5': 'baby',
  'tpl-bullet': 'list',
  'tpl-critique': 'target',
  'tpl-context': 'globe',
  'tpl-counterarg': 'scale',
  'tpl-default': 'zap',

  // Misc
  'arrow-back': 'arrow-left',
  'chevron-right': 'chevron-right',
  'eye': 'eye',
  'eye-off': 'eye-off',
  'volume': 'volume-2',
  'download': 'download',
  'loader': 'loader',
  'file-code': 'file-code',
  'check': 'check'
};

/**
 * Get raw SVG string for a Lucide icon
 * @param {string} name - Icon name
 * @param {number} [size=16] - Icon size in pixels
 * @returns {string} SVG HTML string
 */
export function getIconSvg(name, size = 16) {
  const path = PATHS[name];
  if (!path) {
    console.warn(`[S2AI] Unknown icon: ${name}`);
    return '';
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="s2ai-icon" aria-hidden="true">${path}</svg>`;
}

/**
 * Get an SVG element for a Lucide icon
 * @param {string} name - Icon name
 * @param {number} [size=16] - Icon size in pixels
 * @returns {SVGSVGElement|null}
 */
export function getIconElement(name, size = 16) {
  const path = PATHS[name];
  if (!path) {
    console.warn(`[S2AI] Unknown icon: ${name}`);
    return null;
  }
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="s2ai-icon" aria-hidden="true">${path}</svg>`;
  return wrapper.firstElementChild;
}

/**
 * Create an icon + text span combo
 * @param {string} name - Icon name
 * @param {string} text - Text label
 * @param {number} [size=16] - Icon size
 * @returns {string} HTML string
 */
export function getIconLabel(name, text, size = 16) {
  return `${getIconSvg(name, size)}<span>${text}</span>`;
}
