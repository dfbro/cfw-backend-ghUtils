import { Hono } from 'hono'
import { getDB } from '@/lib/db'

const getDatabases = new Hono()
interface TableRow {
    name: string;
}

getDatabases.get('/', async (c) => {
    const db = getDB(c)
    const result = await db.prepare('SELECT * FROM sqlite_master WHERE type="table"').all<TableRow>() 
    return c.json({
        databases: result.results.map((row) => row.name),
        raw: result
    })
})

export { getDatabases }