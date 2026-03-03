/**
 * VoxPrompt AI - AI Prompt Optimizer Agent
 *
 * Converts raw speech text into structured LLM-ready prompts.
 * Uses the OpenAI-compatible API (works with Claude, GPT-4, etc.)
 * API key stored in .env — never exposed to renderer.
 */

import * as dotenv from 'dotenv';
dotenv.config();

// ─── Structured prompt template per AI_AGENT_RULES.md ───────────────────────
function buildTemplate(rawText: string): string {
    return [
        `Task: ${rawText.trim()}`,
        `Context: [Extracted from spoken input — expand as needed]`,
        `Requirements: [Define specific deliverables]`,
        `Constraints: [No specific constraints unless stated]`,
        `Expected Output Format: [Structured, clear, actionable response]`,
    ].join('\n');
}

// ─── LLM API call (OpenAI-compatible) ────────────────────────────────────────
async function callLLM(rawText: string): Promise<string> {
    const apiKey = process.env.LLM_API_KEY;
    const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.LLM_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
        console.warn('[PromptOptimizer] No LLM_API_KEY in .env — using template fallback.');
        return buildTemplate(rawText);
    }

    const systemPrompt = [
        'You are an expert prompt engineer.',
        'Convert the user\'s raw speech or text into a structured LLM prompt.',
        'Follow this exact format:',
        'Task: <one line description of what is being asked>',
        'Context: <background information extracted from input>',
        'Requirements: <specific deliverables or constraints>',
        'Constraints: <limitations, scope restrictions>',
        'Expected Output Format: <how the response should be structured>',
        'Be concise but thorough. Do not add commentary. Output only the structured prompt.',
    ].join('\n');

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: rawText },
                ],
                max_tokens: 400,
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('[PromptOptimizer] API error:', err);
            return buildTemplate(rawText);
        }

        const data: any = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || buildTemplate(rawText);

    } catch (err) {
        console.error('[PromptOptimizer] Fetch failed:', err);
        return buildTemplate(rawText);
    }
}

// ─── Command detection per AI_AGENT_RULES.md ────────────────────────────────
const TRIGGER_PHRASES = [
    'convert this into prompt',
    'make this professional',
    'optimize for llm',
    'structure this',
    'convert to prompt',
];

function detectCommand(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return TRIGGER_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * Main optimization entry point, called from IPC handler.
 * Always returns a string — never throws to renderer.
 */
export async function optimizePrompt(rawText: string): Promise<string> {
    if (!rawText?.trim()) return '';

    // Strip trigger phrases from the text if found
    let cleanText = rawText;
    if (detectCommand(rawText)) {
        for (const phrase of TRIGGER_PHRASES) {
            cleanText = cleanText.toLowerCase().replace(phrase, '').trim();
        }
        if (!cleanText) cleanText = rawText;
    }

    return callLLM(cleanText);
}
