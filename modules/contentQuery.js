// ============================================================
// Select2AI Content Script Module: Query Execution
// Streaming and non-streaming AI query handling
// ============================================================

import { renderMarkdown, renderKaTeX, showError } from './contentUI.js';
import { getIconSvg } from './iconRegistry.js';

export function createQueryExecutor(options) {
  const { chatHistory, currentTabKey, settings, lastActionRef, lastPromptRef, lastResponseRef, streamingChunksRef, compareStreamRef, compareModeModelsRef } = options;
  let isProcessing = false;
  let compareMode = false;

  function setProcessing(v) { isProcessing = v; }
  function setCompareMode(v) { compareMode = v; }
  function getProcessing() { return isProcessing; }

  async function executeQuery(action, selectedText, opts = {}, detection = null, callbacks = {}) {
    if (isProcessing) return;
    isProcessing = true;

    lastActionRef.value = action;
    lastPromptRef.value = opts.customPrompt || callbacks.buildPrompt?.(action, selectedText, opts);

    const pageCtx = callbacks.isPageContextEnabled?.() ? callbacks.getPageContext?.() : null;
    const convHistory = chatHistory.getHistory(currentTabKey);

    if (compareMode && action !== 'custom') {
      await callbacks.runCompareMode?.(lastPromptRef.value, pageCtx);
      isProcessing = false;
      return;
    }

    const panel = document.getElementById('s2ai-panel');
    if (!panel) { isProcessing = false; return; }

    const answerArea = panel.querySelector('.s2ai-answer-area');
    if (answerArea) {
      answerArea.innerHTML = '<div class="s2ai-loading"><div class="s2ai-typing-dots"><span></span><span></span><span></span></div>';
    }

    const useStreaming = settings.streamingEnabled !== false;

    try {
    if (useStreaming) {
        await executeStreaming(lastPromptRef.value, pageCtx, convHistory, panel, callbacks);
      } else {
        await executeNonStreaming(lastPromptRef.value, pageCtx, convHistory, panel, callbacks);
      }
    } catch (e) {
      showError(e.message, panel);
    }

    isProcessing = false;
  }

  function executeStreaming(prompt, pageCtx, convHistory, panelEl, callbacks) {
    const streamId = `stream_${Date.now()}`;
    streamingChunksRef[streamId] = '';

    const answerArea = panelEl.querySelector('.s2ai-answer-area');

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'QUERY_AI_STREAM',
        prompt,
        model: settings.model,
        pageContext: pageCtx,
        conversationHistory: convHistory,
        streamId,
        action: lastActionRef.value
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
      });

      const onDone = (event) => {
        if (event.detail?.streamId !== streamId) return;
        document.removeEventListener('s2ai-stream-done', onDone);
        document.removeEventListener('s2ai-stream-chunk', onChunk);

        lastResponseRef.value = event.detail.fullContent || streamingChunksRef[streamId];
        delete streamingChunksRef[streamId];

        chatHistory.addTurn(currentTabKey, prompt, lastResponseRef.value);
        callbacks.renderFinalResponse?.(lastResponseRef.value, panelEl);
        resolve();
      };

      const onChunk = (event) => {
        if (event.detail?.streamId !== streamId) return;
        streamingChunksRef[event.detail.streamId] += event.detail.chunk;
        if (answerArea) {
          answerArea.innerHTML = renderMarkdown(streamingChunksRef[event.detail.streamId]);
          answerArea.scrollTop = answerArea.scrollHeight;
        }
      };

      document.addEventListener('s2ai-stream-done', onDone);
      document.addEventListener('s2ai-stream-chunk', onChunk);

      setTimeout(() => {
        document.removeEventListener('s2ai-stream-done', onDone);
        document.removeEventListener('s2ai-stream-chunk', onChunk);
        reject(new Error('Response timeout. Please try again.'));
      }, 60000);
    });
  }

  function executeNonStreaming(prompt, pageCtx, convHistory, panelEl, callbacks) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'QUERY_AI',
        prompt,
        model: settings.model,
        pageContext: pageCtx,
        conversationHistory: convHistory,
        action: lastActionRef.value
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        lastResponseRef.value = response.content || '';
        chatHistory.addTurn(currentTabKey, prompt, lastResponseRef.value);
        callbacks.renderFinalResponse?.(lastResponseRef.value, panelEl);
        resolve();
      });
    });
  }

  async function runCompareMode(prompt, pageCtx) {
    const panelEl = document.getElementById('s2ai-panel');
    if (!panelEl) return;

    const { buildComparePanelHTML } = await import(chrome.runtime.getURL('modules/compareMode.js'));

    const body = panelEl.querySelector('.s2ai-panel-body');
    body.innerHTML = buildComparePanelHTML(compareModeModelsRef.a, compareModeModelsRef.b);
    panelEl.classList.add('s2ai-panel--compare');

    compareStreamRef.a = '';
    compareStreamRef.b = '';

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

    sendQuery(compareModeModelsRef.a, streamIdA);
    sendQuery(compareModeModelsRef.b, streamIdB);

    const onChunk = (e) => {
      const { streamId, chunk } = e.detail || {};
      if (streamId === streamIdA) {
        compareStreamRef.a += chunk;
        if (paneA) paneA.innerHTML = renderMarkdown(compareStreamRef.a);
      } else if (streamId === streamIdB) {
        compareStreamRef.b += chunk;
        if (paneB) paneB.innerHTML = renderMarkdown(compareStreamRef.b);
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

  // Streaming message listener
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

  return { executeQuery, runCompareMode, setProcessing, setCompareMode, getProcessing };
}
