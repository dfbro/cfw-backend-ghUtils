import { Hono } from 'hono'
import { getDB } from '@/lib/db'
import APP_CONFIG from '@/config/config';
const listDB = new Hono()
interface TableRow {
    name: string;
}

listDB.get('/', async (c) => {
    const db = getDB(c);
    const tableName = APP_CONFIG.USER_TABLE;

    const checkTableQuery = 'SELECT name FROM sqlite_master WHERE type="table" AND name = ?'

    try {
        await db.prepare(checkTableQuery)
            .bind(tableName)
            .first();
    } catch (e) {
        return c.json({
            initialised: false,
            message: 'Failed to check database state',
            error: e instanceof Error ? e.message : 'Unknown error'
        }, 500);
    }

    const result = await db.prepare('SELECT * FROM ' + APP_CONFIG.USER_TABLE).all<TableRow>() 
    return c.json({
        raw: result.results
    })
})

export { listDB }