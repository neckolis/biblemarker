import { Env } from './types';

const LLM_MODEL = '@cf/meta/llama-3.1-8b-instruct' as any;

export class CloudflareAIClient {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    async analyzeWord(params: {
        translation: string;
        book: string;
        chapter: number;
        verse: number;
        verseText: string;
        clickedText: string;
        clickedStart: number;
        clickedEnd: number;
        surroundingContext?: { verse: number; text: string }[];
    }) {
        const systemPrompt = `You are an expert biblical scholar and linguist specializing in Hebrew and Greek. 
Analyze the specific word or phrase clicked by the user within the context of the provided verse.
Output ONLY valid JSON matching the schema. Do not include any other text, markdown formatting (like \`\`\`json), or explanations.

JSON Schema:
{
  "reference": { "book": "string", "chapter": 0, "verse": 0, "translation": "string" },
  "clicked": { "text": "string", "start": 0, "end": 0 },
  "results": [
    {
      "original": { "language": "hebrew"|"greek"|"unknown", "surface": "string|null", "lemma": "string|null" },
      "transliteration": "string|null",
      "strongs": "string|null",
      "morphology": "string|null",
      "gloss": "string|null",
      "explanationBullets": ["string"],
      "confidence": 0
    }
  ],
  "warnings": ["string"]
}

IMPORTANT: The final bullet point in "explanationBullets" MUST ALWAYS connect the word or its theme to Jesus Christ, His character, His work, or His fulfillment of Scripture. Do not label it explicitly as 'Jesus tie-in', just make it the final natural point of the analysis.`;

        const contextStr = params.surroundingContext
            ? params.surroundingContext.map(v => `Verse ${v.verse}: ${v.text}`).join('\n')
            : '';

        const userPrompt = `Verse Reference: ${params.book} ${params.chapter}:${params.verse} (${params.translation})
${contextStr ? `Surrounding Context:\n${contextStr}\n` : ''}
Target Verse Text: ${params.verseText}
Clicked Text: "${params.clickedText}" at position ${params.clickedStart}-${params.clickedEnd}

Provide a detailed word study analysis for "${params.clickedText}" specifically in the context of Verse ${params.verse}.`;

        const response = await this.env.AI.run(LLM_MODEL, {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            // Use response_format if supported, or just trust the system prompt
            // Workers AI supports some JSON schema stuff now, but simple system prompt is often safer for legacy compatibility
            temperature: 0.1, // Lower temperature for more consistency in JSON
            max_tokens: 2000
        });

        const content = (response as any).response;

        try {
            // Clean up potentially wrapped JSON (some models still wrap in backticks even if told not to)
            const jsonStr = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error('Failed to parse Cloudflare AI response as JSON:', content);
            throw new Error('AI failed to return valid JSON word analysis');
        }
    }

    async chat(params: {
        context: {
            translation: string;
            book: string;
            chapter: number;
            verse?: number;
            verseText: string;
            activeAnalysis?: any;
        };
        message: string;
        history?: { role: 'user' | 'assistant', content: string }[];
    }) {
        const verseRef = params.context.verse ? `:${params.context.verse}` : '';
        const contextType = params.context.verse ? 'verse' : 'chapter';

        const systemPrompt = `You are a biblical research assistant. You are helping a user with a ${contextType} study of ${params.context.book} ${params.context.chapter}${verseRef} in the ${params.context.translation} translation.
Context (${contextType}): ${params.context.verseText}
${params.context.activeAnalysis ? `Current analysis of interest: ${JSON.stringify(params.context.activeAnalysis)}` : ''}
Answer the user's questions concisely and accurately, focusing on the original languages and biblical context.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...(params.history || []).map(h => ({ role: h.role as any, content: h.content })),
            { role: 'user', content: params.message }
        ];

        const response = await this.env.AI.run(LLM_MODEL, {
            messages: messages,
            temperature: 0.5,
            max_tokens: 1000
        });

        return (response as any).response;
    }
}
