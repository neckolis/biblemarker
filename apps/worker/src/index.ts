import { Hono } from 'hono'
import bible from './routes/bible'
import documents from './routes/documents'
import presets from './routes/presets'
import ai from './routes/ai'

const app = new Hono()

app.get('/api/health', (c) => {
    return c.json({ status: 'ok' })
})

app.route('/api', bible)
app.route('/api/documents', documents)
app.route('/api/presets', presets)
app.route('/api', ai)

export default app
