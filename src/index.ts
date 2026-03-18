// index.ts
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import v1 from './v1'
import v0 from './v0'
const app = new Hono()

app.route('/v1', v1)
app.route('/v0', v0)
app.get('/', (c) => {
  c.header('content-type', 'application/json')
  return c.json({
    message: 'OK',
    time: new Date().toISOString()
  })
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(`${err}`)
  return c.json({ status: 500, error: err.message, message: 'Internal Server Error' }, 500)
})
export default app