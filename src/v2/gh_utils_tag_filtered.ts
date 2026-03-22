import { Hono } from 'hono'
import APP_CONFIG, { GH_CONFIG } from '@/config/config'
import { getAssetByName, deleteAssetByName, checkAssetExists, uploadAssetStream, createRelease, deleteReleaseByTag, getReleaseByTag, isValidTag } from '@/lib/ghUtils'
import { is } from 'zod/locales'
const { TOKEN: GH_Token } = GH_CONFIG


const ghUtilsEndpoint = new Hono()
const githubHeaders = (token: string) => ({
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/octet-stream',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Hono-Static-Proxy'
})

ghUtilsEndpoint.get('/', async (c) => {
    return c.json({
        message: 'ghUtils endpoint working',
        time: new Date().toISOString()
    })
})


ghUtilsEndpoint.use('/by-name/:file-name', async (c, next) => {
    const filename = c.req.param('file-name')
    if (!filename) {
        return c.json({ error: 'Filename parameter is required' }, 400)
    }
    if (!isValidTag(filename)) {
        return c.json({ error: 'Invalid filename. Filenames must be valid GitHub release tags, which can only contain alphanumeric characters, hyphens, and underscores.' }, 400)
    }

    await next()
})

ghUtilsEndpoint.get('/by-name/:file-name', async (c) => {
    const filename = c.req.param('file-name')

    const asset = await getAssetByName(filename, { Tag: filename })
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
    const existsResult = await checkAssetExists(filename, { Tag: filename })
    if (!existsResult.doesExist) {
        return c.json({ error: 'Asset not found' }, 404)
    }
    const result = await deleteAssetByName(filename, { Tag: filename })
    if (!result.isOK) {
        return c.json({ error: result.error }, 500)
    }
    const deleteReleaseResult = await deleteReleaseByTag({ Tag: filename })
    if (!deleteReleaseResult.isOK) {
        console.error(`Asset deleted but failed to delete release for tag '${filename}':`, deleteReleaseResult.originErr)
        return c.json({ message: 'Asset deleted but failed to delete release', releaseDeletionError: deleteReleaseResult.error }, 500)
    }
    return c.json({ message: result.message, releaseDeletionMessage: deleteReleaseResult.message })
})

ghUtilsEndpoint.put('/by-name/:filename', async (c) => {
    const filename = c.req.param('filename')
    const contentType = c.req.header('Content-Type') || 'application/octet-stream'
    const stream = c.req.raw.body
    const overwriteHeaders = c.req.header('X-Overwrite') || 'false'

    if (!stream) return c.json({ error: 'No stream data' }, 400)

    const checkResult = await getReleaseByTag({ Tag: filename }) 
    if ('tag_name' in checkResult) {
        if (overwriteHeaders === 'true') {
            const deleteResult = await deleteReleaseByTag({ Tag: filename })
            if (!deleteResult.isOK) {
                return c.json({ error: deleteResult.error, originErrors: deleteResult.originErr }, (deleteResult.originErrStatusCode || 500) as any)
            }
        } else {
            return c.json({ error: `Release with tag '${filename}' already exists. To prevent accidental overwrites, the upload is blocked. Please delete the existing release or choose a different tag/filename.`, isOK: false }, 409)
        }
    }

    const createResult = await createRelease({ Tag: filename })
    if (!createResult.isOK) {
        return c.json({ error: createResult.error, originErrors: createResult.originErr }, (createResult.originErrStatusCode || 500) as any)
    }

    const result = await uploadAssetStream(filename, stream, contentType, { Tag: filename })
    if (!result.isOK) {
        return c.json({ error: result.error, originErrors: result.originErr }, (result.originErrStatusCode || 500) as any)
    }

    return c.json({ message: 'Stream upload success', data: result })
})



















//Test create release

ghUtilsEndpoint.put('/create-release/:tag', async (c) => {
    const tag = c.req.param('tag')
    const result = await createRelease({ Tag: tag })
    if (!result.isOK) {
        return c.json({ error: result.error, originErrors: result.originErr }, 422)
    }
    return c.json({ message: 'Release created successfully', data: result })
})

ghUtilsEndpoint.get('/create-release/:tag', async (c) => {
    const tag = c.req.param('tag')
    return c.json({ message: `This is a GET request for tag ${tag}. This endpoint is just for testing the create release logic. To actually create a release, send a PUT request to the same URL.` })
})

















//Test delete release by tag

ghUtilsEndpoint.delete('/delete-release/:tag', async (c) => {
    const tag = c.req.param('tag')
    const result = await deleteReleaseByTag({ Tag: tag })

    if (!result.isTagFound && result.isExpectedError) {
        return c.json({ error: `Release with tag '${tag}' not found` }, 404)
    }

    if (!result.isOK) {
        return c.json({ error: result.error, originErrors: result.originErr }, 422)
    }
    return c.json({ message: result.message })
})

ghUtilsEndpoint.get('/delete-release/:tag', async (c) => {
    const tag = c.req.param('tag')
    return c.json({ message: `This is a GET request for tag ${tag}. This endpoint is just for testing the delete release by tag logic. To actually delete a release, send a DELETE request to the same URL.` })
})












ghUtilsEndpoint.get('/by-assets/:asset-id', async (c) => {
    const assetId = c.req.param('asset-id')
    const ghUrl = `https://api.github.com/repos/${APP_CONFIG.GH.OWNER}/${APP_CONFIG.GH.REPO}/releases/assets/${assetId}`
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