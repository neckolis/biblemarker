/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono'
import { CloudflareAIClient } from '../lib/cloudflare-ai'
import { Env } from '../lib/types'

const app = new Hono<{ Bindings: Env }>()

app.post('/research/analyze-word', async (c) => {
    const params = await c.req.json()

    // Caching
    const cacheKey = `ai:v2:analyze:${params.translation}:${params.book}:${params.chapter}:${params.verse}:${params.clickedStart}:${params.clickedEnd}`
    if (c.env.BIBLE_CACHE) {
        const cached = await c.env.BIBLE_CACHE.get(cacheKey)
        if (cached) return c.json(JSON.parse(cached))
    }

    try {
        const ai = new CloudflareAIClient(c.env)
        const result = await ai.analyzeWord(params)

        if (c.env.BIBLE_CACHE) {
            await c.env.BIBLE_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 * 30 }) // 30 days
        }

        return c.json(result)
    } catch (e: any) {
        console.error('Word Analysis Error:', e)
        return c.json({ error: e.message || 'Analysis failed' }, 500)
    }
})

app.post('/research/chat', async (c) => {
    const { context, message, history } = await c.req.json()

    try {
        const ai = new CloudflareAIClient(c.env)
        const response = await ai.chat({ context, message, history })
        return c.json({ message: response })
    } catch (e: any) {
        console.error('Research Chat Error:', e)
        return c.json({ error: e.message || 'Chat failed' }, 500)
    }
})

export default app
