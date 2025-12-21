/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono'
import { DeepSeekClient } from '../lib/deepseek'

const app = new Hono<{ Bindings: { BIBLE_CACHE: KVNamespace, DEEPSEEK_API_KEY: string } }>()

app.post('/research/analyze-word', async (c) => {
    const params = await c.req.json()
    const apiKey = c.env.DEEPSEEK_API_KEY || 'sk-82c2ebfddf04478d9ded022dcbf73ac8'

    // Caching
    const cacheKey = `ai:v1:analyze:${params.translation}:${params.book}:${params.chapter}:${params.verse}:${params.clickedStart}:${params.clickedEnd}`
    if (c.env.BIBLE_CACHE) {
        const cached = await c.env.BIBLE_CACHE.get(cacheKey)
        if (cached) return c.json(JSON.parse(cached))
    }

    try {
        const deepseek = new DeepSeekClient(apiKey)
        const result = await deepseek.analyzeWord(params)

        if (c.env.BIBLE_CACHE) {
            await c.env.BIBLE_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 * 30 }) // 30 days
        }

        return c.json(result)
    } catch (e: any) {
        console.error(e)
        return c.json({ error: e.message || 'Analysis failed' }, 500)
    }
})

app.post('/research/chat', async (c) => {
    const { context, message, history } = await c.req.json()
    const apiKey = c.env.DEEPSEEK_API_KEY || 'sk-82c2ebfddf04478d9ded022dcbf73ac8'

    try {
        const deepseek = new DeepSeekClient(apiKey)
        const response = await deepseek.chat({ context, message, history })
        return c.json({ message: response })
    } catch (e: any) {
        console.error(e)
        return c.json({ error: e.message || 'Chat failed' }, 500)
    }
})

export default app
