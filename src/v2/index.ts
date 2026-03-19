// v2/index.ts
import { Hono } from 'hono'
import { JWT_SECRET } from '@/config/config'
import { jwtAuth, requireRole } from '@/lib/jwtAuth'
import  ghFiles  from './gh_files'
import ghUtilsEndpoint from './gh_test'

const v2 = new Hono()

v2.use('*', jwtAuth(JWT_SECRET))

v2.route('/files', ghFiles)
v2.route('/ghUtils', ghUtilsEndpoint)

v2.get('/', (c) => c.json({
    message: 'v2 OK',
    time: new Date().toISOString()
}))

export default v2