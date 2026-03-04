/**
 * VoxPrompt AI - AI Prompt Optimizer Agent
 *
 * Converts raw speech into structured LLM-ready prompts.
 * - Calls LLM API if LLM_API_KEY is set in .env
 * - Falls back to a well-structured template otherwise
 * - Detects voice command triggers from AI_AGENT_RULES.md
 */

import * as dotenv from 'dotenv';
dotenv.config();

// ─── Trigger phrases (AI_AGENT_RULES.md) ─────────────────────────────────────
const TRIGGERS = [
    'convert this into prompt',
    'convert to prompt',
    'make this professional',
    'optimize for llm',
    'optimize for ai',
    'structure this',
    'make it formal',
];

function stripTrigger(text: string): string {
    const lower = text.toLowerCase();
    for (const t of TRIGGERS) {
        if (lower.includes(t)) {
            return text.toLowerCase().replace(t, '').trim() || text;
        }
    }
    return text;
}

// ─── Structured template fallback ─────────────────────────────────────────────
function buildTemplate(raw: string): string {
    // Attempt to extract a rough task description
    const words = raw.trim().split(/\s+/);
    const preview = words.slice(0, 12).join(' ') + (words.length > 12 ? '…' : '');

    return [
        `Task: ${preview}`,
        `Context: ${raw.trim()}`,
        `Requirements: Define specific deliverables and scope.`,
        `Constraints: No specific constraints unless stated in the context above.`,
        `Expected Output Format: Clear, structured, and actionable response.`,
    ].join('\n');
}

// ─── LLM API call ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert prompt engineer.
Convert the user's raw speech or text into a structured LLM-ready prompt.
Use exactly this format — no extra commentary:

Task: <concise description of what is being requested>
Context: <background and key details from the user's input>
Requirements: <specific deliverables, steps, or expectations>
Constraints: <limitations, scope restrictions, or caveats>
Expected Output Format: <how the final response should be structured>

Be thorough but concise. Do not include any text before or after the five fields.`;

async function callLLM(text: string): Promise<string> {
    const key = process.env.LLM_API_KEY?.trim();
    const url = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.LLM_MODEL || 'gpt-4o-mini';

    if (!key || key.startsWith('sk-ant-YOUR')) {
        return buildTemplate(text);
    }

    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: text },
            ],
            max_tokens: 500,
            temperature: 0.25,
        }),
        signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
        console.error('[PromptOptimizer] API responded', resp.status, await resp.text());
        return buildTemplate(text);
    }

    const json: any = await resp.json();
    return json.choices?.[0]?.message?.content?.trim() || buildTemplate(text);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function optimizePrompt(rawText: string): Promise<string> {
    if (!rawText?.trim()) return '';
    const cleaned = stripTrigger(rawText);
    try {
        return await callLLM(cleaned);
    } catch (err) {
        console.error('[PromptOptimizer] Error:', err);
        return buildTemplate(cleaned);
    }
}
