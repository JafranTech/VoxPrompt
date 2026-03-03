/**
 * VoxPrompt AI - Shared Types
 */

export interface RecognitionResult {
    text: string;
    isFinal: boolean;
}

export interface OptimizationResult {
    structuredPrompt: string;
}
