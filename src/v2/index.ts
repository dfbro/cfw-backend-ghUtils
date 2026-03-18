// v2/index.ts
import { Hono } from 'hono'
import  ghFiles  from './gh_files'
const v2 = new Hono()

v2.route('/files', ghFiles)

v2.get('/', (c) => c.json({
    message: 'v2 OK',
    time: new Date().toISOString()
}))

export default v2