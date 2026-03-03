# VoxPrompt AI - Project Context

**Status:** Initial planning and MVP preparation.
**Project Type:** Multilingual voice-to-prompt Windows desktop agent.
**Core Tech Stack:** Electron.js, TypeScript, React, Node.js (optional backend), Web Speech API.

## 1. Product Overview
**VoxPrompt AI** is designed to run silently as a background service on Windows. It captures user speech (English or Tamil) via a global hotkey, converts that speech to structured LLM-optimized prompts, and seamlessly injects the generated text system-wide into any active application.
- **Core Value:** Transforms informal raw speech into structured AI-ready communication, providing out-of-the-box Tamil to Romanized Tamil (Tanglish) transliteration.
- **Target Audience:** Developers, prompt engineers, AI power users, and productivity-focused professionals.

## 2. Architecture & Tech Stack
- **Desktop Framework:** Electron.js with TypeScript and React. Used for global shortcuts, always-on-top floating popups, background services, and cross-application text injection.
- **Speech Engine:** Web Speech API for the MVP, with plans to upgrade to Whisper API or Local Whisper for production.
- **Transliteration Layer:** A custom rule-based JavaScript engine that maps Unicode to phoneme logic for Tamil-to-Roman formatting.
- **AI Agent Layer:** LLM API integration designed for contextual prompt optimization, structuring, and specific voice command detection (e.g., "Convert this into prompt", "Make this professional").
- **Injection Mechanism:** Combines Electron's global shortcuts, clipboard automation, and simulated keyboard events to restore focus and paste content.

## 3. UI/UX Design
- **Aesthetic:** Minimalist, developer-first, "dark neon" interface with zero distraction.
- **Colors:** Deep dark gradient background (`#222222` to `#1A1A1A`) accented with a vibrant Neon Green (`#89E900`).
- **Interaction:** A floating translucent popup that appears instantly. It features an active mic button, text output area, and a status dot, auto-minimizing once the text is injected into the active application.

## 4. AI Rules & APIs
- **Prompt Optimization:** AI is instructed to identify the task, extract context, define constraints, and remove ambiguity. It formats outputs into a strict template: Task, Context, Requirements, Constraints, and Expected Output Format.
- **Security & Data Flow:** API integrations (`/optimize-prompt`) must enforce HTTPS, rate limiting, and input validation without exposing keys on the client side.

## 5. Security & Changelog
- **Threat Model:** Prioritizes defense against API key leakage, audio data interception, prompt injection, and clipboard misuse. 
- **Privacy Policy:** Strictly dictates that no audio or prompt history is stored permanently without explicit user consent. Local processing is highly preferred.
- **Project Versions:**
  - **v0.1.0:** Foundation (Architecture, Web Speech MVP, UI prototype).
  - **v0.2.0:** Tamil engine, continuous recording, styling.
  - **v0.3.0:** Prompt optimizer, voice commands, system-wide injection.
  - **v1.0.0:** Stable Windows release, local Whisper, performance and security hardening.

## 6. Functional Requirements (PRD)
- Global shortcut activation.
- Background service mode.
- Continuous speech recording.
- Transliteration layer for Tamil -> Roman.
- AI prompt optimization for structured outputs.
- System-wide text injection via simulated pasting.
- Native Windows behavior mimicking Windows dictation (Win+H).
