/**
 * VoxPrompt AI - Speech Transcriber Agent (Gemini API)
 */

import * as dotenv from 'dotenv';
dotenv.config();

const SYSTEM_PROMPT = `You are a highly accurate and precise audio transcription engine.
Your absolute only task is to return the exact spoken text from the audio provided.
Do NOT include any conversational filler.
Do NOT include any markdown formatting.
If you hear nothing or cannot understand the audio, return an empty string.`;

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
    const key = process.env.GEMINI_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

    if (!key || key === 'YOUR_GEMINI_KEY_HERE') {
        throw new Error('GEMINI_API_KEY is not configured in .env');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const body = {
        system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType,
                            data: base64Audio,
                        }
                    }
                ],
            },
        ],
        generationConfig: {
            temperature: 0.1, // Low temperature for transcription accuracy
        },
    };

    const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000), // 30 sec timeout for audio
    });

    if (!resp.ok) {
        const errText = await resp.text();
        console.error('[SpeechTranscriber] Gemini API error:', resp.status, errText);
        throw new Error(`API Error ${resp.status}`);
    }

    const json: any = await resp.json();
    const result = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return result;
}
