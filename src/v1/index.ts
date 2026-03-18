// v1/index.ts
import { Hono } from 'hono'
import { users } from './users'
import { admin } from './admin'

const v1 = new Hono()
v1.get('/', (c) => c.json({
  message: 'v1 OK',
  time: new Date().toISOString()
}))
v1.route('/users', users)
v1.route('/admin', admin)
export default v1