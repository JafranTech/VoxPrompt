/**
 * VoxPrompt AI - AI Prompt Optimizer Agent
 *
 * Uses Google Gemini API (FREE tier — gemini-2.0-flash)
 * Get your free key at: https://aistudio.google.com/apikey
 *
 * Falls back to a structured 5-field template if no key is set.
 */

import * as dotenv from 'dotenv';
dotenv.config();

// ─── Trigger phrase detection (per AI_AGENT_RULES.md) ─────────────────────────
const TRIGGERS = [
    'convert this into prompt', 'convert to prompt',
    'make this professional', 'optimize for llm',
    'optimize for ai', 'structure this',
    'make it formal',
];

function stripTrigger(text: string): string {
    const lower = text.toLowerCase();
    for (const t of TRIGGERS) {
        if (lower.includes(t)) {
            return text.replace(new RegExp(t, 'i'), '').trim() || text;
        }
    }
    return text;
}

// ─── Structured template fallback (used when no API key) ──────────────────────
function buildTemplate(raw: string): string {
    const preview = raw.trim().split(/\s+/).slice(0, 10).join(' ');
    return [
        `Task: ${preview}`,
        `Context: ${raw.trim()}`,
        `Requirements: Define specific deliverables and scope.`,
        `Constraints: No specific constraints unless stated.`,
        `Expected Output Format: Clear, structured, and actionable response.`,
    ].join('\n');
}

// ─── System prompt injected into Gemini ────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert prompt engineer.
Convert the user's raw speech/text into a structured LLM-ready prompt.
Use EXACTLY this format with no extra text before or after:

Task: <concise one-line description>
Context: <background and key details from the input>
Requirements: <specific deliverables or expectations>
Constraints: <limitations or scope restrictions>
Expected Output Format: <how the final response should look>`;

// ─── Google Gemini API call ────────────────────────────────────────────────────
async function callGemini(text: string): Promise<string> {
    const key = process.env.GEMINI_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    if (!key || key === 'YOUR_GEMINI_KEY_HERE') {
        return buildTemplate(text);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const body = {
        system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
            { role: 'user', parts: [{ text }] },
        ],
        generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.25,
        },
    };

    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
        console.error('[PromptOptimizer] Gemini API error:', resp.status, await resp.text());
        return buildTemplate(text);
    }

    const json: any = await resp.json();
    const result = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return result || buildTemplate(text);
}

// ─── Public API ────────────────────────────────────────────────────────────────
export async function optimizePrompt(rawText: string): Promise<string> {
    if (!rawText?.trim()) return '';
    const cleaned = stripTrigger(rawText);
    try {
        return await callGemini(cleaned);
    } catch (err) {
        console.error('[PromptOptimizer] Error:', err);
        return buildTemplate(cleaned);
    }
}
