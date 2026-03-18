import APP_CONFIG from '@/config/config'
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { status } from './status'
import { getDatabases } from './getDatabases'
import { listDB } from './what_is_there'

const admin = new Hono()

admin.use('*', async (c, next) => {
  const jwtMiddleware = jwt({ secret: APP_CONFIG.JWT_SECRET, alg: 'HS256', cookie: 'session_token' })
  
  try {
    return await jwtMiddleware(c, next)
  } catch (err) {
    return c.json({
      error: 'Denied',
      reason: err instanceof Error ? err.message : 'Unknown'
    }, 403)
  }
})
admin.route('/status', status)
admin.route('/databases', getDatabases)
admin.route('/listdb', listDB)

export { admin }