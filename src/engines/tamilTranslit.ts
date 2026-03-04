/**
 * VoxPrompt AI - Tamil → Romanized Tamil (Tanglish) Transliteration Engine
 * Rule-based Unicode phoneme mapping covering all Tamil vowels, consonants,
 * vowel-marks (maaththirai), pulli, and visarga per the Tamil Unicode block.
 */

// Independent vowels (U+0B85–U+0B94)
const VOWELS: Record<string, string> = {
    '\u0B85': 'a', '\u0B86': 'aa', '\u0B87': 'i', '\u0B88': 'ii',
    '\u0B89': 'u', '\u0B8A': 'uu', '\u0B8E': 'e', '\u0B8F': 'ee',
    '\u0B90': 'ai', '\u0B92': 'o', '\u0B93': 'oo', '\u0B94': 'au',
};

// Vowel diacritics / maaththirai (follow a consonant)
// The consonant already carries inherent 'a'; we REPLACE that trailing 'a'
const MARKS: Record<string, string> = {
    '\u0BBE': 'aa', '\u0BBF': 'i', '\u0BC0': 'ii', '\u0BC1': 'u',
    '\u0BC2': 'uu', '\u0BC6': 'e', '\u0BC7': 'ee', '\u0BC8': 'ai',
    '\u0BCA': 'o', '\u0BCB': 'oo', '\u0BCC': 'au',
    '\u0BCD': '',   // pulli — remove inherent 'a' (pure consonant)
};

// Consonants with inherent 'a' vowel
const CONS: Record<string, string> = {
    '\u0B95': 'ka', '\u0B99': 'nga', '\u0B9A': 'cha', '\u0B9C': 'ja',
    '\u0B9E': 'nya', '\u0B9F': 'ta', '\u0BA3': 'na', '\u0BA4': 'tha',
    '\u0BA8': 'na', '\u0BA9': 'na', '\u0BAA': 'pa', '\u0BAE': 'ma',
    '\u0BAF': 'ya', '\u0BB0': 'ra', '\u0BB1': 'rra', '\u0BB2': 'la',
    '\u0BB3': 'lla', '\u0BB4': 'zha', '\u0BB5': 'va', '\u0BB6': 'sha',
    '\u0BB7': 'sha', '\u0BB8': 'sa', '\u0BB9': 'ha',
};

/**
 * Transliterate a string that may contain Tamil Unicode characters.
 * Non-Tamil characters (Latin, digits, spaces, punctuation) pass through unchanged.
 */
export function transliterateTamil(input: string): string {
    if (!input) return '';

    const chars = [...input];   // Unicode-aware split
    let result = '';

    for (let i = 0; i < chars.length; i++) {
        const ch = chars[i];
        const next = chars[i + 1] ?? '';

        if (CONS[ch] !== undefined) {
            const base = CONS[ch]; // e.g. 'ka'

            if (MARKS[next] !== undefined) {
                const mark = MARKS[next];
                if (mark === '') {
                    // Pulli: remove trailing inherent 'a' → pure consonant
                    result += base.slice(0, -1);
                } else {
                    // Replace trailing 'a' with the diacritic vowel
                    result += base.slice(0, -1) + mark;
                }
                i++; // consume next (mark)
            } else {
                result += base; // inherent 'a' is kept
            }
        } else if (VOWELS[ch]) {
            result += VOWELS[ch];
        } else if (ch === '\u0B83') {
            result += 'ah'; // Visarga (ஃ)
        } else {
            result += ch;   // pass-through: Latin, digits, spaces, punctuation
        }
    }

    return result;
}
