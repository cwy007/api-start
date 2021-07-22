import path from 'path'

const MONGO_USERNAME = process.env.DB_USER || 'your-username'
const MONGO_PASSWORD = process.env.DB_PASS || 'your-datebase-password'
const MONGO_HOSTNAME = process.env.DB_HOST || 'your-datebase-url'
const MONGO_PORT = process.env.DB_PORT || 'your-datebase-port'
const DB_NAME = process.env.DB_NAME || 'your-datebase-name'

const DB_URL = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOSTNAME}:${MONGO_PORT}/${DB_NAME}`

// console.log('DB_URL', DB_URL)

const REDIS = {
  host: process.env.REDIS_HOST || 'your-redis-url',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASS || 'your-redis-password'
}

const JWT_SECRET = '&Vi%33pG2mD51xMo%OUOTo$ZWOa3TYt328tcjXtW9&hn%AOb9quwaZaRMf#f&44c'

const baseUrl = process.env.NODE_ENV === 'production' ? 'http://front.dev.toimc.com:22500' : 'http://localhost:8080'

const uploadPath = process.env.NODE_ENV === 'production' ? '/app/public' : path.join(path.resolve(__dirname), '../../public')

const adminEmail = ['your-admin@test-email.com']

const publicPath = [/^\/public/, /^\/login/, /^\/content/, /^\/user/, /^\/comments/]

const isDevMode = process.env.NODE_ENV !== 'production'

const port = 3000
const wsPort = 3001

export default {
  DB_NAME,
  MONGO_HOSTNAME,
  DB_URL,
  REDIS,
  JWT_SECRET,
  baseUrl,
  uploadPath,
  adminEmail,
  publicPath,
  isDevMode,
  port,
  wsPort
}
