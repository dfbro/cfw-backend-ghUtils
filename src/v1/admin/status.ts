import { Hono } from 'hono'

type JwtPayload = {
    isAdmin?: boolean
}

const status = new Hono<{ Variables: { jwtPayload: JwtPayload } }>()

status.get('/', (c) => {
    const payload = c.get('jwtPayload')
    return c.json({
        isAdmin: payload.isAdmin ?? false,
    })
})

export { status }