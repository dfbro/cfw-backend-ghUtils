import { jwt } from 'hono/jwt'
import { MiddlewareHandler } from 'hono'

export const jwtAuth = (secret: string): MiddlewareHandler => {
    return async (c, next) => {
        const jwtMiddleware = jwt({
            secret: secret,
            alg: 'HS256',
            cookie: 'session_token'
        })

        try {
            return await jwtMiddleware(c, next)
        } catch (err) {
            return c.json({
                error: 'Denied',
                reason: err instanceof Error ? err.message : 'Unauthorized access'
            }, 403)
        }
    }
}