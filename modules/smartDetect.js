// ============================================================
// Select2AI Module: Smart Content Detection
// Detects: code, question, prose, URL, math, table
// ============================================================

export const ContentType = {
  CODE: 'code',
  QUESTION: 'question',
  URL: 'url',
  MATH: 'math',
  TABLE: 'table',
  PROSE: 'prose'
};

/**
 * Analyze selected text and return detected type + confidence
 * @param {string} text
 * @returns {{ type: string, confidence: number, language?: string, wordCount: number, readTime: number, complexity: string }}
 */
export function detectContentType(text) {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200)); // ~200 wpm

  const result = {
    type: ContentType.PROSE,
    confidence: 0.5,
    wordCount,
    readTime,
    complexity: getComplexity(trimmed, wordCount),
    language: null
  };

  // URL detection
  if (/^https?:\/\/\S+$/.test(trimmed)) {
    return { ...result, type: ContentType.URL, confidence: 0.99 };
  }

  // Math detection
  const mathScore = scoreMath(trimmed);
  if (mathScore > 0.7) {
    return { ...result, type: ContentType.MATH, confidence: mathScore };
  }

  // Code detection
  const codeResult = detectCode(trimmed);
  if (codeResult.confidence > 0.6) {
    return { ...result, type: ContentType.CODE, confidence: codeResult.confidence, language: codeResult.language };
  }

  // Question detection
  const questionScore = scoreQuestion(trimmed);
  if (questionScore > 0.7) {
    return { ...result, type: ContentType.QUESTION, confidence: questionScore };
  }

  // Table detection
  if (scoreTable(trimmed) > 0.7) {
    return { ...result, type: ContentType.TABLE, confidence: 0.85 };
  }

  return result;
}

function scoreMath(text) {
  const mathPatterns = [
    /[\∫∑∏√∂∇∀∃∈∉⊆⊇∪∩⊕⊗±×÷]/,
    /\\\[.*?\\\]|\$\$.*?\$\$|\$[^$]+\$/s,
    /\b(sin|cos|tan|log|ln|lim|sum|int|det|max|min)\s*[\(\[]/i,
    /[a-z]\s*[=<>≤≥≠]\s*[0-9a-z\+\-\*\/\^\(\)]+/i,
    /\d+\s*[\+\-\*\/\^]\s*\d+/,
    /\bmatrix\b|\bvector\b|\beigenvalue\b/i
  ];
  const matches = mathPatterns.filter(p => p.test(text)).length;
  return matches / mathPatterns.length;
}

function detectCode(text) {
  const lines = text.split('\n');
  let score = 0;
  let language = null;

  // Strong code indicators
  const strongPatterns = [
    { pattern: /^(function|const|let|var|class|import|export|return|if|for|while|async|await)\b/m, lang: 'javascript', weight: 0.4 },
    { pattern: /^(def |class |import |from |@|if __name__|print\()/m, lang: 'python', weight: 0.4 },
    { pattern: /^(public|private|protected|class|interface|import|package|void|int|String)\b/m, lang: 'java', weight: 0.4 },
    { pattern: /^(#include|int main|std::|cout|cin|namespace|template)/m, lang: 'cpp', weight: 0.4 },
    { pattern: /^(<\?php|\$[a-z_]\w*\s*=|echo\s|namespace\s)/m, lang: 'php', weight: 0.4 },
    { pattern: /^(SELECT|INSERT|UPDATE|DELETE|CREATE|FROM|WHERE)\s/im, lang: 'sql', weight: 0.35 },
    { pattern: /(<\w+[\s>].*>.*<\/\w+>|<\w+\s[^>]*\/>)/s, lang: 'html', weight: 0.35 },
    { pattern: /^\s*[\{\}]\s*$|^\s*"[^"]+"\s*:\s*[{\["\d]/m, lang: 'json', weight: 0.3 },
    { pattern: /^(fn |use |let mut |struct |impl |pub |mod )\b/m, lang: 'rust', weight: 0.4 },
    { pattern: /^(func |package |import |var |type )\b/m, lang: 'go', weight: 0.4 }
  ];

  for (const { pattern, lang, weight } of strongPatterns) {
    if (pattern.test(text)) {
      score += weight;
      if (!language) language = lang;
    }
  }

  // Density-based indicators
  const braceCount = (text.match(/[{}\[\]()]/g) || []).length;
  const braceDensity = braceCount / Math.max(text.length, 1);
  if (braceDensity > 0.05) score += 0.2;

  const semicolons = (text.match(/;/g) || []).length;
  if (semicolons > 2) score += 0.15;

  // Indentation pattern
  const indentedLines = lines.filter(l => /^\s{2,}/.test(l)).length;
  if (indentedLines / Math.max(lines.length, 1) > 0.3) score += 0.1;

  // Operators
  if (/[=!<>]=|&&|\|\||=>|->|::/.test(text)) score += 0.1;

  // Check for inline code markers
  if (/`[^`]+`/.test(text) || /```[\s\S]*```/.test(text)) score += 0.3;

  return { confidence: Math.min(score, 1), language };
}

function scoreQuestion(text) {
  let score = 0;

  // Ends with question mark
  if (text.endsWith('?')) score += 0.5;

  // Multiple sentences with a question
  if (/\?/.test(text)) score += 0.2;

  // Starts with question word
  if (/^(what|why|how|when|where|who|which|can|could|should|would|is|are|do|does|did|has|have)\b/i.test(text.trim())) {
    score += 0.3;
  }

  return Math.min(score, 1);
}

function scoreTable(text) {
  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 2) return 0;
  const pipeLines = lines.filter(l => l.includes('|')).length;
  return pipeLines / lines.length;
}

function getComplexity(text, wordCount) {
  if (wordCount < 30) return 'Simple';

  // Average word length as a proxy for vocabulary complexity
  const words = text.split(/\s+/).filter(Boolean);
  const avgLen = words.reduce((s, w) => s + w.replace(/[^a-z]/gi, '').length, 0) / Math.max(words.length, 1);
  const longWords = words.filter(w => w.length > 7).length / Math.max(words.length, 1);
  const sentences = text.split(/[.!?]+/).filter(Boolean).length;
  const avgSentLen = wordCount / Math.max(sentences, 1);

  const score = (avgLen / 10) + longWords + (avgSentLen / 30);

  if (score < 0.4) return 'Simple';
  if (score < 0.7) return 'Moderate';
  return 'Complex';
}

/**
 * Get suggested actions for a content type
 */
export function getSuggestedActions(type) {
  const baseActions = ['summarize', 'explain', 'answer', 'custom'];

  const typeActions = {
    [ContentType.CODE]: ['explain-code', 'find-bugs', 'refactor', 'add-comments', 'convert-language', 'custom'],
    [ContentType.QUESTION]: ['answer', 'explain', 'custom'],
    [ContentType.MATH]: ['explain', 'solve', 'summarize', 'custom'],
    [ContentType.URL]: ['summarize', 'explain', 'custom'],
    [ContentType.TABLE]: ['summarize', 'explain', 'custom'],
    [ContentType.PROSE]: baseActions
  };

  return typeActions[type] || baseActions;
}

/**
 * Get the label + icon for a given action key
 */
export function getActionMeta(actionKey) {
  const actions = {
    'summarize':        { label: 'Summarize',         icon: '📝', category: 'general' },
    'explain':          { label: 'Explain',            icon: '💡', category: 'general' },
    'answer':           { label: 'Answer',             icon: '❓', category: 'general' },
    'what-is':          { label: 'What is it?',        icon: '🔍', category: 'general' },
    'custom':           { label: 'Custom Question',    icon: '✏️', category: 'general' },
    'explain-code':     { label: 'Explain Code',       icon: '🔬', category: 'code' },
    'find-bugs':        { label: 'Find Bugs',          icon: '🐛', category: 'code' },
    'refactor':         { label: 'Refactor',           icon: '♻️', category: 'code' },
    'add-comments':     { label: 'Add Comments',       icon: '💬', category: 'code' },
    'convert-language': { label: 'Convert Language',   icon: '🔄', category: 'code' },
    'translate':        { label: 'Translate…',         icon: '🌐', category: 'rewrite' },
    'rewrite-pro':      { label: 'Rewrite: Professional', icon: '👔', category: 'rewrite' },
    'rewrite-casual':   { label: 'Rewrite: Casual',    icon: '😊', category: 'rewrite' },
    'rewrite-concise':  { label: 'Rewrite: Concise',   icon: '✂️', category: 'rewrite' },
    'solve':            { label: 'Solve',              icon: '🧮', category: 'math' }
  };
  return actions[actionKey] || { label: actionKey, icon: '⚡', category: 'general' };
}

/**
 * Build the AI prompt for a given action + selected text
 */
export function buildPrompt(action, selectedText, options = {}) {
  const { targetLanguage, pageContext, customPrompt, customTemplateBody } = options;

  if (customTemplateBody) {
    return customTemplateBody
      .replace(/{selection}/g, selectedText)
      .replace(/{url}/g, pageContext?.url || '')
      .replace(/{title}/g, pageContext?.title || '')
      .replace(/{language}/g, targetLanguage || '');
  }

  const prompts = {
    'summarize':    `Summarize the following text concisely:\n\n${selectedText}`,
    'explain':      `Explain the following clearly and simply:\n\n${selectedText}`,
    'answer':       `Answer the following question thoroughly:\n\n${selectedText}`,
    'what-is':      `What is this? Provide a clear definition and context:\n\n${selectedText}`,
    'custom':       customPrompt ? `${customPrompt}\n\nText:\n${selectedText}` : selectedText,
    'explain-code': `Explain what this code does, step by step:\n\`\`\`\n${selectedText}\n\`\`\``,
    'find-bugs':    `Review this code carefully and identify any bugs, errors, or potential issues. List each issue with an explanation and suggest fixes:\n\`\`\`\n${selectedText}\n\`\`\``,
    'refactor':     `Refactor this code for better readability, performance, and best practices. Show the refactored version with a brief explanation of the changes:\n\`\`\`\n${selectedText}\n\`\`\``,
    'add-comments': `Add clear, professional inline comments to this code explaining what each section does:\n\`\`\`\n${selectedText}\n\`\`\``,
    'convert-language': `Convert this code to ${targetLanguage || 'Python'}. Preserve the logic exactly:\n\`\`\`\n${selectedText}\n\`\`\``,
    'translate':    `Translate the following text to ${targetLanguage || 'Spanish'}. Only return the translation:\n\n${selectedText}`,
    'rewrite-pro':  `Rewrite the following text in a professional, formal tone:\n\n${selectedText}`,
    'rewrite-casual': `Rewrite the following text in a friendly, casual tone:\n\n${selectedText}`,
    'rewrite-concise': `Rewrite the following text to be more concise and to the point, removing any redundancy:\n\n${selectedText}`,
    'solve':        `Solve the following mathematical problem step-by-step:\n\n${selectedText}`,
    'summarize-page': `Summarize this page content:\n\n${selectedText}`
  };

  return prompts[action] || `${action}: ${selectedText}`;
}
