/**
 * VoxPrompt AI - Tamil → Roman Transliteration Engine
 *
 * Rule-based Unicode → phoneme mapping for Tamil to Romanized Tamil (Tanglish).
 * Covers all Tamil vowels, consonants, and vowel-marks (maaththirai).
 */

// ─── Vowel-mark (maaththirai) map ────────────────────────────────────────────
const VOWEL_MARKS: Record<string, string> = {
    '\u0BBE': 'aa', // ா
    '\u0BBF': 'i',  // ி
    '\u0BC0': 'ii', // ீ
    '\u0BC1': 'u',  // ு
    '\u0BC2': 'uu', // ூ
    '\u0BC6': 'e',  // ெ
    '\u0BC7': 'ee', // ே
    '\u0BC8': 'ai', // ை
    '\u0BCA': 'o',  // ொ
    '\u0BCB': 'oo', // ோ
    '\u0BCC': 'au', // ௌ
    '\u0BCD': '',   // ் (pulli — halant, suppresses inherent vowel)
};

// ─── Independent vowel map ──────────────────────────────────────────────────
const VOWELS: Record<string, string> = {
    '\u0B85': 'a',   // அ
    '\u0B86': 'aa',  // ஆ
    '\u0B87': 'i',   // இ
    '\u0B88': 'ii',  // ஈ
    '\u0B89': 'u',   // உ
    '\u0B8A': 'uu',  // ஊ
    '\u0B8E': 'e',   // எ
    '\u0B8F': 'ee',  // ஏ
    '\u0B90': 'ai',  // ஐ
    '\u0B92': 'o',   // ஒ
    '\u0B93': 'oo',  // ஓ
    '\u0B94': 'au',  // ஔ
};

// ─── Consonant map (with inherent 'a' vowel) ─────────────────────────────────
const CONSONANTS: Record<string, string> = {
    '\u0B95': 'ka',  // க
    '\u0B99': 'nga', // ங
    '\u0B9A': 'cha', // ச
    '\u0B9E': 'nya', // ஞ
    '\u0B9F': 'ta',  // ட
    '\u0BA3': 'na',  // ண
    '\u0BA4': 'tha', // த
    '\u0BA8': 'na',  // ந
    '\u0BAA': 'pa',  // ப
    '\u0BAE': 'ma',  // ம
    '\u0BAF': 'ya',  // ய
    '\u0BB0': 'ra',  // ர
    '\u0BB2': 'la',  // ல
    '\u0BB5': 'va',  // வ
    '\u0BB4': 'zha', // ழ
    '\u0BB3': 'la',  // ள
    '\u0BB1': 'rra', // ற
    '\u0BA9': 'na',  // ன
    '\u0B9C': 'ja',  // ஜ
    '\u0BB6': 'sha', // ஶ
    '\u0BB7': 'sha', // ஷ
    '\u0BB8': 'sa',  // ஸ
    '\u0BB9': 'ha',  // ஹ
};

/**
 * Transliterate a Tamil Unicode string to Romanized Tamil (Tanglish).
 * Handles consonant + vowel-mark combinations correctly.
 */
export function transliterateTamil(input: string): string {
    if (!input) return '';

    let result = '';
    const chars = Array.from(input); // handle surrogate pairs

    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const next = chars[i + 1] || '';

        // Check consonant first
        if (CONSONANTS[ch]) {
            const baseRoman = CONSONANTS[ch]; // includes inherent 'a'

            if (VOWEL_MARKS[next] !== undefined) {
                // Vowel mark follows — replace inherent 'a' with the mark's sound
                const mark = VOWEL_MARKS[next];
                if (mark === '') {
                    // Pulli — remove the inherent 'a' (pure consonant)
                    result += baseRoman.slice(0, -1);
                } else {
                    // Replace trailing 'a' with mark vowel
                    result += baseRoman.slice(0, -1) + mark;
                }
                i++; // consume the mark
            } else {
                result += baseRoman;
            }

        } else if (VOWELS[ch]) {
            result += VOWELS[ch];

        } else if (VOWEL_MARKS[ch] !== undefined) {
            // Orphan mark (shouldn't happen in valid Tamil, skip)
            result += VOWEL_MARKS[ch];

        } else if (ch === '\u0B83') {
            // Visarga (ஃ) — akh sound
            result += 'ah';

        } else {
            // Pass through spaces, punctuation, Latin chars, digits
            result += ch;
        }
    }

    return result;
}
