export class DeepSeekClient {
    private apiKey: string;
    private baseUrl = 'https://api.deepseek.com';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
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
Output ONLY valid JSON matching the schema. Do not include any other text. 
Use your best judgment for Strong's numbers and morphology. 
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
}`;

        const contextStr = params.surroundingContext
            ? params.surroundingContext.map(v => `Verse ${v.verse}: ${v.text}`).join('\n')
            : '';

        const userPrompt = `Verse Reference: ${params.book} ${params.chapter}:${params.verse} (${params.translation})
${contextStr ? `Surrounding Context:\n${contextStr}\n` : ''}
Target Verse Text: ${params.verseText}
Clicked Text: "${params.clickedText}" at position ${params.clickedStart}-${params.clickedEnd}

Provide a detailed word study analysis for "${params.clickedText}" specifically in the context of Verse ${params.verse}.`;

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`DeepSeek API error: ${err}`);
        }

        const data = await response.json() as any;
        return JSON.parse(data.choices[0].message.content);
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
            ...(params.history || []),
            { role: 'user', content: params.message }
        ];

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: messages,
                temperature: 0.5,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`DeepSeek API error: ${err}`);
        }

        const data = await response.json() as any;
        return data.choices[0].message.content;
    }
}
