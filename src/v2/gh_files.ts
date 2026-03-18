import { Hono } from 'hono'
import APP_CONFIG from '@/config/config'

const ghFiles = new Hono()
const githubHeaders = (token: string) => ({
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3.raw',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Hono-Static-Proxy'
})

const reqPrefix = '/v2/files/'

ghFiles.get('/*', async (c) => {
    const path = c.req.path.replace(reqPrefix, '')
    const ghUrl = `https://api.github.com/repos/${APP_CONFIG.GH.OWNER}/${APP_CONFIG.GH.REPO}/contents/${path}`
    try {
        const response = await fetch(ghUrl, {
            headers: githubHeaders(APP_CONFIG.GH.TOKEN)
        })

        if (!response.ok) {
            return c.json({ error: 'File not found', debug_url: ghUrl }, 404)
        }

        const blob = await response.arrayBuffer()

        const contentType = response.headers.get('Content-Type') || 'application/octet-stream'

        return c.body(blob, 200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600'
        })

    } catch (err) {
        console.error('Error fetching file from GitHub:', err)
        return c.json({ error: 'Internal Server Error' }, 500)
    }
})

export default ghFiles