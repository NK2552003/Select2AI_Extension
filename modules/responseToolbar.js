// ============================================================
// Select2AI Module: Response Toolbar
// Provides toolbar actions for every AI response
// ============================================================

import { saveToKB } from './knowledgeBase.js';

/**
 * Create a response toolbar DOM element
 * @param {object} options
 * @param {string} options.content      - Markdown content of the response
 * @param {string} options.prompt       - The user's prompt
 * @param {string} options.action       - The action used
 * @param {function} options.onSaveKB   - Callback after saving to KB
 */
export function createResponseToolbar(options) {
  const { content, prompt, action, onSaveKB } = options;

  const toolbar = document.createElement('div');
  toolbar.className = 's2ai-response-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Response actions');

  const buttons = [
    {
      id: 'copy-md',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
      title: 'Copy as Markdown',
      action: () => copyToClipboard(content, toolbar.querySelector('#s2ai-btn-copy-md'), 'Copied!')
    },
    {
      id: 'copy-html',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
      title: 'Copy as HTML',
      action: () => {
        const html = markdownToBasicHtml(content);
        copyToClipboard(html, toolbar.querySelector('#s2ai-btn-copy-html'), 'Copied HTML!');
      }
    },
    {
      id: 'tts',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
      title: 'Text to Speech',
      action: (btn) => toggleTTS(content, btn)
    },
    {
      id: 'export-md',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
      title: 'Export as .md file',
      action: () => exportMarkdown(content, prompt)
    },
    {
      id: 'save-kb',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
      title: 'Save to Knowledge Base',
      action: async (btn) => {
        btn.disabled = true;
        btn.classList.add('s2ai-toolbar-btn--loading');
        try {
          await saveToKB({ snippet: content, prompt, action });
          btn.classList.remove('s2ai-toolbar-btn--loading');
          btn.classList.add('s2ai-toolbar-btn--saved');
          btn.title = 'Saved to Knowledge Base!';
          if (onSaveKB) onSaveKB();
        } catch (e) {
          btn.disabled = false;
          btn.classList.remove('s2ai-toolbar-btn--loading');
        }
      }
    }
  ];

  for (const btnDef of buttons) {
    const btn = document.createElement('button');
    btn.id = `s2ai-btn-${btnDef.id}`;
    btn.className = 's2ai-toolbar-btn';
    btn.title = btnDef.title;
    btn.setAttribute('aria-label', btnDef.title);
    btn.innerHTML = btnDef.icon;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btnDef.action(btn);
    });
    toolbar.appendChild(btn);
  }

  return toolbar;
}

// ── Clipboard ─────────────────────────────────────────────────
function copyToClipboard(text, btn, successMsg = 'Copied!') {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.title;
      btn.title = successMsg;
      btn.classList.add('s2ai-toolbar-btn--success');
      setTimeout(() => {
        btn.title = orig;
        btn.classList.remove('s2ai-toolbar-btn--success');
      }, 1500);
    }
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ── Text-to-Speech ─────────────────────────────────────────────
let ttsUtterance = null;

function toggleTTS(text, btn) {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    btn?.classList.remove('s2ai-toolbar-btn--active');
    ttsUtterance = null;
    return;
  }
  // Strip markdown for TTS
  const plainText = text
    .replace(/```[\s\S]*?```/g, 'code block')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '');

  ttsUtterance = new SpeechSynthesisUtterance(plainText);
  ttsUtterance.rate = 0.95;
  ttsUtterance.onend = () => {
    btn?.classList.remove('s2ai-toolbar-btn--active');
    ttsUtterance = null;
  };
  ttsUtterance.onerror = () => {
    btn?.classList.remove('s2ai-toolbar-btn--active');
    ttsUtterance = null;
  };
  speechSynthesis.speak(ttsUtterance);
  btn?.classList.add('s2ai-toolbar-btn--active');
}

// ── Export Markdown ────────────────────────────────────────────
function exportMarkdown(content, prompt) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `select2ai-${date}.md`;
  const fullContent = `# Select2AI Response\n\n**Date:** ${new Date().toLocaleString()}\n**Page:** ${location.href}\n\n## Prompt\n\n${prompt}\n\n## Response\n\n${content}`;

  const blob = new Blob([fullContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Basic Markdown → HTML ──────────────────────────────────────
function markdownToBasicHtml(md) {
  return md
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
