# Select2AI v2.0 — Implementation Changes

## New Files Created

| File | Purpose |
|------|---------|
| `modules/smartDetect.js` | Smart content type detection (code, question, prose, math, table, URL) |
| `modules/chatHistory.js` | Per-tab multi-turn conversation management |
| `modules/knowledgeBase.js` | Knowledge base save/retrieve helpers |
| `modules/responseToolbar.js` | Response toolbar (copy MD, copy HTML, TTS, export, save KB) |
| `modules/compareMode.js` | Side-by-side model comparison infrastructure |
| `modules/promptTemplates.js` | Custom prompt template system |
| `styles/history.css` | Supplemental popup styles |

## Modified Files

### `manifest.json`
- Added permissions: `contextMenus`, `clipboardWrite`, `commands`, `tts`
- Added `commands` section with `open-action-menu` (Ctrl+Shift+A) and `save-to-kb` (Ctrl+Shift+S)
- Registered all new module files in `web_accessible_resources`
- Added `styles/floating.css` to `content_scripts.css`
- Bumped version to `2.0.0`

### `background.js` (complete rewrite)
- Context menu creation & click handler (Summarize Page, Explain Selection, Translate, Find Bugs)
- Keyboard command routing via `chrome.commands.onCommand`
- Message router for: `QUERY_AI`, `QUERY_AI_STREAM`, `SAVE_HISTORY`, `GET_HISTORY`, `DELETE_HISTORY`, `CLEAR_HISTORY`, `SAVE_KB`, `GET_KB`, `DELETE_KB`, `SUMMARIZE_PAGE`
- Full **SSE streaming** support via `ReadableStream` — sends `STREAM_CHUNK` and `STREAM_DONE` messages to content script
- History storage with auto-cleanup at 150 items
- Knowledge base storage (up to 500 items)
- Page context extraction helper

### `contentScript.js` (complete rewrite)
- Dynamic ES module imports for all new modules
- **Smart Content Detection** — auto-detects code, question, math, table, prose; highlights relevant actions
- **Selection Insights Bar** — word count, read time, complexity, detected type, language badge
- **Code Intelligence Suite** — Explain Code, Find Bugs, Refactor, Add Comments, Convert Language (with language picker)
- **Translation & Tone Rewrite** — Translate (with language picker), Rewrite Professional/Casual/Concise
- **Custom Prompt Templates** — loaded from storage and shown in action menu
- **Multi-Turn Chat Mode** — follow-up question input visible after first response; uses `chatHistory.js` to maintain conversation context
- **Streaming** — chunk-by-chunk rendering with typing indicator; dispatches DOM events for chunk routing
- **Compare Mode** — toggle in action menu; runs two model queries in parallel with split-view panel
- **Response Toolbar** — copy markdown, copy HTML, TTS (browser native), export `.md`, save to KB
- **Page Context Toggle** — button in panel header; includes title/URL/meta in API request
- **Keyboard shortcuts** — `Esc` to close; `Ctrl+Shift+A` to open menu; `Ctrl+Shift+S` to save to KB
- **Context menu event listeners** — for background-triggered actions (summarize page, explain selection)
- **Draggable panel** — drag by header
- GSAP animations on panel open/close

### `styles/floating.css` (complete rewrite)
- CSS custom properties for light/dark theme (auto via `prefers-color-scheme`)
- Action menu, insights bar, section labels, suggested action highlights
- Panel header, controls, selected text preview, turn counter
- Answer area with markdown heading/list/code/inline-code styles
- Typing dots loading animation
- Custom question textarea + send button
- Follow-up chat input area
- Response toolbar buttons with active/success/saved/loading states
- Compare mode split-view layout
- Language picker grid
- Toast notification
- Error state

### `popup.html` + `popup.js` (complete rewrite)
- **Home tab**: model selector (auto-saves), streaming toggle, page context toggle, stats dashboard (queries, saved, templates), quick action links
- **History tab**: searchable list of all past queries; click to expand with full prompt + response + metadata; delete per item; clear all
- **Knowledge Base tab**: searchable saved snippets; click to expand; delete per item
- **Detail Overlay**: full-screen overlay showing complete prompt + response with copy, save-to-KB, and delete actions
- Status banner showing token config status

### `options/options.html` + `options/options.js` + `options/options.css`
- Sidebar navigation (API, Behavior, Templates, Shortcuts, Compare Mode, Data)
- **API Section**: token input with show/hide, endpoint config, model selector, live connection test
- **Behavior Section**: streaming toggle, page context default, auto-save history, insights bar visibility, history limit
- **Templates Section**: visual list of all templates (user + built-in), edit/delete buttons, full template editor with name/icon/body/category fields and variable reference
- **Shortcuts Section**: visual keyboard shortcut reference with link to Chrome shortcuts config
- **Compare Mode Section**: default model A and B selectors
- **Data Section**: storage usage stats, clear history, clear KB, reset templates, full settings reset

## Architecture Notes

- All new features are in **separate ES modules** under `modules/` for clean separation of concerns
- Modules are loaded via `import()` in `contentScript.js` (requires `web_accessible_resources` registration)
- **Streaming**: background sends `STREAM_CHUNK` / `STREAM_DONE` to content tab; content script dispatches as DOM CustomEvents for decoupled stream routing
- **Storage**: `chrome.storage.sync` for settings and templates (cross-device); `chrome.storage.local` for history and KB (larger quota)
- **Template variables** are HTML-escaped before insertion to prevent XSS
- All user text in DOM is escaped via `escapeHtml()`
