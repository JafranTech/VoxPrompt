# System Prompt
Act as a senior distributed systems architect specializing in AI-integrated desktop software.

# System Architecture

## High-Level Flow

User Shortcut (Global, System-Level)
→ Floating Popup (Always-on-Top)
→ Audio Capture Module
→ Speech Recognition Engine
→ Language Processing Layer
→ Transliteration Engine (if Tamil)
→ AI Prompt Optimizer
→ Clipboard + Simulated Keystroke Injection
→ Text appears in Active Window

---

## Architecture Layers

### 1. Presentation Layer
- Floating popup UI
- Language selection
- Mic control
- CTA button

### 2. Input Processing Layer
- Continuous audio streaming
- Buffer management
- Silence detection
- Error handling

### 3. Speech Engine Layer
- Web Speech API (MVP)
- Whisper API or Local Whisper (Production)
- Cloud Speech (Optional)

### 4. Language Processing Layer
- Language selection logic
- Tamil Unicode parsing
- Token normalization

### 5. Transliteration Engine
- Unicode character mapping
- Phoneme-based rules
- Roman Tamil transformation

### 6. AI Agent Layer
- Command detection
- Prompt structuring
- Context extraction
- LLM API integration
- Prompt safety filtering

### 7. Output Layer
- Clipboard manager
- Active window detection
- Simulated keyboard injection
- Focus restoration
- Cross-application typing support

---

## Architectural Principles

- Separation of concerns
- Modular architecture
- Extensible AI layer
- Secure API boundary
- Background service behavior
- Low-latency streaming
- Fail-safe recording logic