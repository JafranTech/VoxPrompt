# System Prompt
Act as a senior product manager and enterprise-level software planner. Produce a complete, structured Product Requirements Document.

# Product Requirements Document (PRD)

## 1. Problem Statement

Existing dictation tools convert speech to text but do not:

- Provide Tamil → Roman transliteration
- Optimize speech output for LLM usage
- Support structured prompt generation
- Integrate system-wide injection across applications

Users struggle to convert informal speech into AI-ready structured prompts.

---

## 2. Objectives

- Enable multilingual speech-to-text
- Provide Roman Tamil output
- Convert raw text into structured prompts
- Maintain continuous recording
- Deliver minimal latency
- Operate as a Windows background service
- Support system-wide text injection

---

## 3. Functional Requirements

### FR1 – Global Shortcut Activation
System must launch popup via system-wide keyboard shortcut.

### FR2 – Background Service Mode
Application must run in Windows background and listen for activation.

### FR3 – Continuous Speech Recording
Recording continues until user presses stop.

### FR4 – Multilingual Support
English and Tamil supported.

### FR5 – Transliteration Layer
Tamil speech must output Romanized Tamil.

### FR6 – AI Prompt Optimization
System must convert raw text into structured LLM prompt format.

### FR7 – System-Wide Text Injection
Generated output must inject into the currently focused input field across applications.

### FR8 – Native Windows Behavior
Popup must behave similarly to Windows dictation (Win + H).

---

## 4. Non-Functional Requirements

- Low latency (<500ms processing where possible)
- Secure API handling
- Memory efficiency
- Crash recovery support
- HCI compliance
- Accessibility support
- Fail-safe recording logic

---

## 5. Success Metrics

- ≥95% speech recognition accuracy
- <2 second prompt optimization latency
- Stable background operation
- Positive usability feedback