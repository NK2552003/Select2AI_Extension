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
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'openai/gpt-4o', label: 'GPT-4o' },
    { id: 'meta/Meta-Llama-3.1-70B-Instruct', label: 'Llama 3.1 70B' },
    { id: 'meta/Meta-Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B' },
    { id: 'mistral-ai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B' },
    { id: 'microsoft/Phi-3.5-mini-instruct', label: 'Phi-3.5 Mini' },
    { id: 'cohere/Cohere-command-r-plus-08-2024', label: 'Command R+' }
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
