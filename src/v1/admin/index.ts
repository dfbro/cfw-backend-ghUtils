import APP_CONFIG from '@/config/config'
import { Hono } from 'hono'
import { status } from './status'
import { getDatabases } from './getDatabases'
import { listDB } from './what_is_there'
import { jwtAuth } from '@/lib/jwtAuth'

const admin = new Hono()

admin.use('*', jwtAuth(APP_CONFIG.JWT_SECRET))
admin.route('/status', status)
admin.route('/databases', getDatabases)
admin.route('/listdb', listDB)

export { admin }