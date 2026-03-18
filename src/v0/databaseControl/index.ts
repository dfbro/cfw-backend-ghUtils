// v0/index.ts
import { Hono } from 'hono'
import { resetDB } from './reset'
//import { initDB } from './init'
import APP_CONFIG from '@/config/config';
import { bearerAuth } from 'hono/bearer-auth';

const v0 = new Hono()

APP_CONFIG.DB_V0_CONTROL_KEY && v0.use('*', bearerAuth({
  token: APP_CONFIG.DB_V0_CONTROL_KEY,
  invalidToken: { message: 'Invalid reset token' },
  noAuthenticationHeader: { message: 'Reset token required' }
})); //kata elang lebih bagus yang ini, tapi yaudahlah, yang penting aman, dan gak terlalu ribet juga


v0.get('/', (c) => c.json({
  message: 'Authorized access to v0 database control',
  time: new Date().toISOString()
}))
v0.route('/resetDB', resetDB)
//v0.route('/initDB', initDB)

export default v0