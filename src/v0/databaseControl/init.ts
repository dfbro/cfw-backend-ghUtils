/* ngapain juga aku ngerjain ini kalau ada fungsi reset 


import { Hono } from 'hono'
import { getDB } from '@/lib/db'
import APP_CONFIG from '@/config/config';
const initDB = new Hono()

initDB.get('/', async (c) => {
    const db = getDB(c)
    const result: boolean = !await db.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name = ?').bind(APP_CONFIG.USER_TABLE).first() 
    return c.json({
        initialisable: result
    })
})

initDB.on('PATCH', '/', async (c) => {
    const db = getDB(c);
    const tableName = APP_CONFIG.USER_TABLE;

    
    const checkTableQuery = 'SELECT name FROM sqlite_master WHERE type="table" AND name = ?'
    
    try {
        const existingTable = await db.prepare(checkTableQuery)
            .bind(tableName)
            .first();

        if (existingTable) {
            return c.json({
                initialised: false,
                message: 'Database already exists'
            }, 409);
        }
    } catch (e) {
        return c.json({
            initialised: false,
            message: 'Failed to check database state',
            error: e instanceof Error ? e.message : 'Unknown error'
        }, 500);
    }
    

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
        const info = await db.prepare(createTableQuery).run();

        return c.json({
            initialised: info.success,
            message: 'Database initialised successfully'
        });
    } catch (e) {
        return c.json({
            initialised: false,
            message: 'Failed to initialise database',
            error: e instanceof Error ? e.message : 'Unknown error'
        }, 500);
    }
});
export { initDB }


*/