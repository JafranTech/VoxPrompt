# System Prompt
Act as a senior software architect designing scalable AI-powered Windows desktop applications.

# VoxPrompt AI – Technology Stack

## Desktop Framework

Primary: Electron.js
- Global shortcut support
- Background service mode
- Always-on-top popup
- Cross-application injection
- Windows-first support

---

## Speech Layer

MVP:
Web Speech API

Production:
Whisper API or Local Whisper

---

## Transliteration

Custom Rule-Based Tamil → Roman Engine (JavaScript)
- Unicode mapping
- Phoneme logic
- Token parsing

---

## AI Agent Layer

LLM API Integration
- Prompt optimization
- Command detection
- Structured formatting

---

## Backend (Optional)

Node.js + Express
- Secure API key management
- Prompt injection filtering
- Rate limiting
- Middleware validation

---

## System Interaction

Electron globalShortcut API
Clipboard automation
Simulated keyboard events
Active window detection

---

## Packaging

Electron Builder
- Windows .exe
- Auto-update support

---

## Development Tools

- TypeScript
- ESLint + Prettier
- Jest
- Playwright
- Git

---

## Architectural Principles

- Modular architecture
- Separation of concerns
- Secure API boundaries
- Extensible AI layer
- Low-latency streaming
- Background service reliability