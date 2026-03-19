import { Hono } from 'hono'
import APP_CONFIG, { GH_CONFIG } from '@/config/config'
import { getAssetByName, deleteAssetByName, checkAssetExists, uploadAssetStream } from '@/lib/ghUtils'
const { TOKEN: GH_Token } = GH_CONFIG


const ghUtilsEndpoint = new Hono()
const githubHeaders = (token: string) => ({
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/octet-stream',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Hono-Static-Proxy'
})

const reqPrefix = '/v2/files/'


ghUtilsEndpoint.get('/', async (c) => {
    return c.json({
        message: 'ghUtils endpoint working',
        time: new Date().toISOString()
    })
})

ghUtilsEndpoint.get('/by-name/:file-name', async (c) => {
    const path = c.req.param('file-name')

    const asset = await getAssetByName(path)
    if (!asset.isOK) {
        return c.json({ error: asset.error }, 404)
    }
    const ghUrl = asset.objectUrl

    try {
        const response = await fetch(ghUrl, {
            headers: githubHeaders(GH_Token)
        })

        const blob = await response.arrayBuffer()
        
        const contentType = response.headers.get('Content-Type') || asset.content_type || 'application/octet-stream'
        return c.body(blob, 200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600'
        })

    } catch (err) {
        console.error('Error fetching file from GitHub:', err)
        return c.json({ error: 'Internal Server Error' }, 500)
    } 

    
})


ghUtilsEndpoint.delete('/by-name/:filename', async (c) => {
    const filename = c.req.param('filename')
    const existsResult = await checkAssetExists(filename)
    if (!existsResult.doesExist) {
        return c.json({ error: 'Asset not found' }, 404)
    }
    const result = await deleteAssetByName(filename)
    if (!result.isOK) {
        return c.json({ error: result.error }, 500)
    }
    return c.json({ message: result.message })
})

ghUtilsEndpoint.put('/by-name/:filename', async (c) => {
    const filename = c.req.param('filename')
    const contentType = c.req.header('Content-Type') || 'application/octet-stream'

    const stream = c.req.raw.body

    if (!stream) {
        return c.json({ error: 'No stream data' }, 400)
    }

    const result = await uploadAssetStream(filename, stream, contentType)

    if (!result.isOK) {
        return c.json({ error: result.error, originErrors: result.originErr }, (result.originErrStatusCode || 500) as any)
    }

    return c.json({ message: 'Stream upload success', data: result })
});

ghUtilsEndpoint.get('/by-assets/:asset-id', async (c) => {
    const path = c.req.param('asset-id')
    const ghUrl = `https://api.github.com/repos/${APP_CONFIG.GH.OWNER}/${APP_CONFIG.GH.REPO}/releases/assets/${path}`
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

export default ghUtilsEndpoint