import { Hono } from 'hono'
import { getDB } from '@/lib/db'
import APP_CONFIG from '@/config/config';
const resetDB = new Hono()


resetDB.get('/', async (c) => {
    const db = getDB(c)
    const result: boolean = !!await db.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name = ?').bind(APP_CONFIG.USER_TABLE).first()
    return c.json({
        canBeReset: result
    })
})

resetDB.on('PATCH', '/', async (c) => {
    const db = getDB(c);
    const tableName = APP_CONFIG.USER_TABLE;
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${tableName}" (
            "uuid" TEXT PRIMARY KEY,
            "username" TEXT NOT NULL UNIQUE,
            "email" TEXT NOT NULL UNIQUE,
            "password_hash" TEXT NOT NULL,
            "created_at" TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `;

    try {
        const statements = [
            db.prepare(`DROP TABLE IF EXISTS ${tableName}`),
            db.prepare(createTableQuery)
        ];

        const results = await db.batch(statements);

        return c.json({
            reset: results.every(r => r.success),
            message: 'Database purged and recreated successfully'
        });
    } catch (e) {
        return c.json({
            reset: false,
            message: 'Failed to reset database',
            error: e instanceof Error ? e.message : 'Unknown error'
        }, 500);
    }
});
export { resetDB }