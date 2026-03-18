// v0/index.ts
import { Hono } from 'hono'
import databaseControl from './databaseControl'

const v0 = new Hono()
v0.get('/', (c) => c.json({
  message: 'v0 OK',
  time: new Date().toISOString()
}))
v0.route('/database', databaseControl)

export default v0