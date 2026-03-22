import { jwt } from 'hono/jwt'
import { MiddlewareHandler, Context } from 'hono'
import { z } from 'zod'



export const JwtPayloadSchema = z.object({
    isAdmin: z.boolean().optional(),
    role: z.string(),
    username: z.string(),
    exp: z.number()
}).strict();

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export const jwtAuth = (secret: string): MiddlewareHandler => {
    return async (c, next) => {
        const jwtMiddleware = jwt({
            secret: secret,
            alg: 'HS256',
            cookie: 'session_token',
            verification: {
                exp: true
            }
        })

        try {
            await jwtMiddleware(c, async () => { })

            const payload = c.get('jwtPayload')
            if(JwtPayloadSchema.safeParse(payload).success === false){
                return c.json({ error: 'Unexpected JWT payload', reason: 'Invalid payload' }, 403)
            }

            return next()
        } catch (err) {
            return c.json({
                error: 'Denied',
                reason: err instanceof Error ? err.message : 'Unauthorized access'
            }, 403)
        }
    }
}


export const requireRole = (...allowedRoles: string[]): MiddlewareHandler => {
    const allowedRolesNormalized = allowedRoles.map((role) => role.toLowerCase())

    return async (c, next) => {
        const payload = c.get('jwtPayload') as JwtPayload | undefined
        const role = payload?.role?.toLowerCase()

        if (!role || !allowedRolesNormalized.includes(role)) {
            return c.json({
                error: 'Forbidden',
                message: `Not matching required roles`
            }, 403)
        }

        await next()
    }
}