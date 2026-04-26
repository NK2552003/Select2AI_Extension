# Select2AI: GitHub Models

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/NK2552003/browser-extension-ai)

A powerful browser extension that lets you select text on any webpage and interact with GitHub Models AI directly from your browser. Get instant summaries, explanations, answers, or ask custom questions - all displayed in a beautiful floating window with light/dark theme support and smooth animations.

## Features

-  **Text Selection AI**: Select any text on a webpage and ask AI questions about it
-  **Multiple Query Types**: 
  - Summarize selected text
  - Explain concepts
  - Answer questions
  - Custom queries
-  **Theme Support**: Automatic light/dark mode that follows your system preferences, with manual override (System / Dark / Light)
-  **Smooth Animations**: Beautiful UI animations powered by GSAP
-  **Math Rendering**: LaTeX/KaTeX support for mathematical equations
-  **Customizable**: Configure your GitHub token, model selection, and endpoint
-  **Privacy-Focused**: Your API token is stored locally in the browser

##  Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/NK2552003/browser-extension-ai.git
   cd browser-extension-ai
   ```

2. Load the extension in your browser:

   **Chrome/Edge:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

   **Firefox:**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file in the extension directory

### Chrome Web Store / Firefox Add-ons

_Coming soon!_

## ⚙️ Configuration

1. After installation, the extension will automatically open the options page
2. Enter your **GitHub Models API Token**
3. (Optional) Select your preferred AI model
4. (Optional) Configure a custom endpoint if needed

### Getting a GitHub Models API Token

1. Visit [GitHub Models](https://github.com/marketplace/models)
2. Sign in with your GitHub account
3. Follow the instructions to get your API token
4. Copy the token and paste it into the extension's options page

## 📖 Usage

1. **Select Text**: Highlight any text on a webpage
2. **Choose Action**: A floating menu will appear with options:
   - Summarize
   - Explain
   - Answer
   - Custom Question
3. **View Response**: The AI response appears in a beautiful floating window
4. **Interact**: Copy responses, close the window, or ask follow-up questions

### Keyboard Shortcuts

- `Esc` - Close the floating window
- Text selection automatically triggers the action menu

## 🛠️ Development

### Project Structure

```
browser-extension-ai/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Service worker for API calls
├── contentScript.js       # Content script for text selection
├── popup.html             # Extension popup UI
├── popup.js               # Popup functionality
├── options/               # Options page
│   ├── options.html
│   ├── options.js
│   └── options.css
├── styles/                # CSS files
│   ├── floating.css       # Floating window styles
│   └── globals.css
├── vendor/                # Third-party libraries
│   ├── gsap.min.js        # Animation library
│   ├── katex.min.js       # Math rendering
│   └── katex.min.css
└── icons/                 # Extension icons
```

### Building

The extension is built using vanilla JavaScript and requires no build step. Simply load the directory as an unpacked extension in your browser.

### Testing

1. Load the extension in developer mode
2. Navigate to any webpage
3. Select text and test the AI features
4. Check the browser console for any errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to:
- Follow the existing code style
- Update documentation as needed
- Add tests if applicable
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)

## Requirements

- Chrome 88+ / Edge 88+ / Firefox 89+ (Manifest V3 support)
- GitHub Models API token
- Active internet connection

## Privacy & Security

- Your GitHub API token is stored locally using Chrome's secure storage API
- No data is sent to third-party servers except GitHub Models API
- Text selections are only processed when you explicitly trigger an action
- The extension only has access to the active tab when you use it

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [GSAP](https://greensock.com/gsap/) - Animation library
- [KaTeX](https://katex.org/) - Math rendering
- [GitHub Models](https://github.com/marketplace/models) - AI models API
- Icons and design inspiration from various open-source projects

## Support

-  Report bugs: [GitHub Issues](https://github.com/NK2552003/browser-extension-ai/issues)
-  Discussions: [GitHub Discussions](https://github.com/NK2552003/browser-extension-ai/discussions)
-  Contact: [Create an issue](https://github.com/NK2552003/browser-extension-ai/issues/new)

##  Roadmap

- [x] Support for more AI models
- [x] Context persistence across sessions
- [x] Export conversations
- [x] Custom prompt templates
- [x] Keyboard shortcuts customization
- [x] Manual theme toggle (Dark / Light / System)
- [ ] Multi-language support
- [ ] Browser extension store publication

## Changelog

### Version 2.0.0 (Current)
- Complete UI redesign with dark-first aesthetic
- Popup dashboard with model selector, toggles, and stats
- History & Knowledge Base tabs with search and detail view
- Custom prompt templates (built-in + user-created)
- Streaming responses with real-time chunk rendering
- Side-by-side model Compare Mode
- Response toolbar: copy, TTS, export, save to KB
- Smart content detection (code, math, questions, tables)
- Code intelligence suite (explain, find bugs, refactor, convert language)
- Translation & tone rewrite with language picker
- Multi-turn chat with per-tab conversation memory
- Draggable floating panel
- **Manual theme toggle** (System / Dark / Light) for popup and options pages
- Keyboard shortcuts: `Ctrl+Shift+A` (open menu), `Ctrl+Shift+S` (save to KB)
- Context menus: Summarize Page, Explain Selection, Translate, Find Bugs

### Version 1.0.0
- Initial release
- Text selection AI queries
- Light/dark theme support
- GSAP animations
- KaTeX math rendering
- Configurable GitHub Models integration

---

Made with ❤️ by [NK2552003](https://github.com/NK2552003)

**Star ⭐ this repository if you find it helpful!**
