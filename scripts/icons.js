// ============================================================
// Select2AI Global Icon Helpers (for popup & options pages)
// Wraps lucide library with semantic icon names
// ============================================================

(function() {
  'use strict';

  // Semantic key → lucide icon name mapping
  const ICON_MAP = {
    'tab-home': 'home',
    'tab-history': 'clock',
    'tab-kb': 'book-open',
    'action-settings': 'settings',
    'action-templates': 'zap',
    'status-warn': 'alert-triangle',
    'status-ok': 'check-circle',
    'empty-history': 'clock',
    'empty-kb': 'book-open',
    'empty-kb-hint': 'bookmark',
    'btn-copy': 'copy',
    'btn-copied': 'check-circle',
    'btn-save': 'bookmark',
    'btn-saved': 'check-circle',
    'btn-delete': 'x',
    'type-code': 'code',
    'type-question': 'help-circle',
    'type-url': 'link',
    'type-math': 'calculator',
    'type-table': 'table',
    'type-prose': 'file-text',
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
    'badge-suggested': 'sparkles',
    'indicator-page-context': 'file-text',
    'indicator-compare': 'git-compare',
    'indicator-powered': 'zap',
    'ctrl-context': 'info',
    'ctrl-clear': 'rotate-ccw',
    'ctrl-close': 'x',
    'ctrl-send': 'send',
    'toast-success': 'check-circle',
    'toast-info': 'refresh-cw',
    'toast-warn': 'alert-triangle',
    'toast-page-context-on': 'file-text',
    'toast-page-context-off': 'file-text',
    'toast-conversation-cleared': 'refresh-cw',
    'nav-api': 'key',
    'nav-behavior': 'settings',
    'nav-templates': 'zap',
    'nav-shortcuts': 'keyboard',
    'nav-compare': 'git-compare',
    'nav-data': 'database',
    'btn-test': 'plug',
    'btn-clear-history': 'trash-2',
    'btn-clear-kb': 'trash-2',
    'btn-reset-templates': 'refresh-cw',
    'btn-reset-all': 'alert-triangle',
    'stat-history': 'scroll-text',
    'stat-kb': 'book-open',
    'stat-templates': 'zap',
    'toast-settings-saved': 'check-circle',
    'toast-template-saved': 'check-circle',
    'toast-template-deleted': 'trash-2',
    'toast-history-cleared': 'trash-2',
    'toast-kb-cleared': 'trash-2',
    'toast-templates-reset': 'refresh-cw',
    'toast-all-reset': 'alert-triangle',
    'tpl-eli5': 'baby',
    'tpl-bullet': 'list',
    'tpl-critique': 'target',
    'tpl-context': 'globe',
    'tpl-counterarg': 'scale',
    'tpl-default': 'zap',
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
   * Get the lucide icon name for a semantic key
   * @param {string} key
   * @returns {string}
   */
  function getIconName(key) {
    return ICON_MAP[key] || key;
  }

  /**
   * Create an <i data-lucide="..."> element for a semantic key
   * @param {string} key
   * @param {number} [size=16]
   * @returns {string} HTML string
   */
  function icon(key, size) {
    const name = getIconName(key);
    const sizeAttr = size ? ` width="${size}" height="${size}"` : '';
    return `<i data-lucide="${name}"${sizeAttr}></i>`;
  }

  /**
   * Create an icon + text combo
   * @param {string} key
   * @param {string} text
   * @param {number} [size=16]
   * @returns {string} HTML string
   */
  function iconLabel(key, text, size) {
    return `${icon(key, size)}<span>${text}</span>`;
  }

  // Expose globally
  window.S2AI_ICONS = {
    ICON_MAP,
    getIconName,
    icon,
    iconLabel
  };
})();
