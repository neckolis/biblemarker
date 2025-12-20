import { Hono } from 'hono'
import { BollsClient } from '../lib/bolls'

const app = new Hono<{ Bindings: { BIBLE_CACHE: KVNamespace } }>()

app.get('/translations', async (c) => {
    const bolls = new BollsClient(c.env.BIBLE_CACHE)
    const translations = await bolls.getTranslations()
    return c.json(translations)
})

app.get('/books', async (c) => {
    const translation = c.req.query('translation')
    if (!translation) return c.json({ error: 'Missing translation' }, 400)

    try {
        const bolls = new BollsClient(c.env.BIBLE_CACHE)
        const books = await bolls.getBooks(translation)
        return c.json(books)
    } catch (e) {
        return c.json({ error: 'Failed to search books' }, 500)
    }
})

app.get('/chapters', async (c) => {
    const translation = c.req.query('translation')
    const book = c.req.query('book')
    const chapter = c.req.query('chapter')

    if (!translation || !book || !chapter) {
        return c.json({ error: 'Missing parameters' }, 400)
    }

    try {
        const bolls = new BollsClient(c.env.BIBLE_CACHE)
        const verses = await bolls.getChapter(translation, parseInt(book), parseInt(chapter))
        return c.json(verses)
    } catch (e) {
        return c.json({ error: 'Failed to fetch chapter' }, 500)
    }
})

export default app
