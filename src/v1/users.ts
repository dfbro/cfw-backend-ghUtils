// v1/users.ts
import { Hono } from 'hono'

const users = new Hono()
    
users.get('/', (c) => c.json({ 
        list: [] 
    }))
users.post('/', (c) => c.json({
        created: true 
    }, 201))
export { users } 