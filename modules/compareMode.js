// ============================================================
// Select2AI Module: Compare Models Mode
// Run the same query on two models side-by-side
// ============================================================

/**
 * Build the compare panel HTML structure
 */
export function buildComparePanelHTML(modelA, modelB) {
  return `
    <div class="s2ai-compare-header">
      <div class="s2ai-compare-model-label">
        <span class="s2ai-model-badge">${escapeHtml(modelA)}</span>
      </div>
      <div class="s2ai-compare-divider"></div>
      <div class="s2ai-compare-model-label">
        <span class="s2ai-model-badge">${escapeHtml(modelB)}</span>
      </div>
    </div>
    <div class="s2ai-compare-body">
      <div class="s2ai-compare-pane" id="s2ai-compare-pane-a">
        <div class="s2ai-compare-loading">
          <div class="s2ai-typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
      <div class="s2ai-compare-pane" id="s2ai-compare-pane-b">
        <div class="s2ai-compare-loading">
          <div class="s2ai-typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Run two parallel AI queries and stream results into the compare panes
 */
export async function runCompareQueries(params) {
  const { prompt, modelA, modelB, conversationHistory, pageContext, renderFn } = params;

  const streamIdA = `compare_a_${Date.now()}`;
  const streamIdB = `compare_b_${Date.now()}`;

  const queryA = sendStreamQuery({ prompt, model: modelA, conversationHistory, pageContext, streamId: streamIdA });
  const queryB = sendStreamQuery({ prompt, model: modelB, conversationHistory, pageContext, streamId: streamIdB });

  return { streamIdA, streamIdB, queryA, queryB };
}

function sendStreamQuery(params) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'QUERY_AI_STREAM',
      ...params,
      autoSave: false
    }, (response) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else if (response?.error) reject(new Error(response.error));
      else resolve(response);
    });
  });
}

/**
 * Get available models for comparison selector
 */
export function getComparableModels() {
  return [
    { id: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'openai/gpt-4.1', label: 'GPT-4.1' },
    { id: 'openai/gpt-5', label: 'GPT-5' },
    { id: 'openai/gpt-5-chat', label: 'GPT-5 Chat' },
    { id: 'deepseek/DeepSeek-V3-0324', label: 'DeepSeek V3' },
    { id: 'meta/Llama-4-Scout-17B-16E-Instruct', label: 'Llama 4 Scout' },
    { id: 'xai/grok-3', label: 'Grok 3' },
    { id: 'xai/grok-3-mini', label: 'Grok 3 Mini' },
    { id: 'mistral-ai/mistral-medium-2505', label: 'Mistral Medium' },
    { id: 'mistral-ai/mistral-small-2503', label: 'Mistral Small' }
  ];
}

/**
 * Build the model selector HTML for compare mode setup
 */
export function buildModelSelectorHTML(selectedModel) {
  const models = getComparableModels();
  return models.map(m =>
    `<option value="${escapeHtml(m.id)}" ${m.id === selectedModel ? 'selected' : ''}>${escapeHtml(m.label)}</option>`
  ).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
