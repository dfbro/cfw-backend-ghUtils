import { Context } from 'hono'
import APP_CONFIG from '../config/config'

export const getDB = (c: Context) => {
    return c.env[APP_CONFIG.DB_BINDING] as D1Database
}