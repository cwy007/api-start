import path from 'path'

const MONGO_USERNAME = process.env.DB_USER || 'test'
const MONGO_PASSWORD = process.env.DB_PASS || 'Zlf6hfWj4nBzzP1W'
const MONGO_HOSTNAME = process.env.DB_HOST || 'dev.toimc.com'
const MONGO_PORT = process.env.DB_PORT || '43130'
const DB_NAME = process.env.DB_NAME || 'testdb'

const DB_URL = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOSTNAME}:${MONGO_PORT}/${DB_NAME}`

// console.log('DB_URL', DB_URL)

const REDIS = {
  host: process.env.REDIS_HOST || 'dev.toimc.com',
  port: process.env.REDIS_PORT || 43131,
  password: process.env.REDIS_PASS || 'OUlMsFxOSa6r77s1'
}

const JWT_SECRET = '&Vi%33pG2mD51xMo%OUOTo$ZWOa3TYt328tcjXtW9&hn%AOb9quwaZaRMf#f&44c'

const baseUrl = process.env.NODE_ENV === 'production' ? 'http://front.dev.toimc.com:22500' : 'http://localhost:8080'

const uploadPath = process.env.NODE_ENV === 'production' ? '/app/public' : path.join(path.resolve(__dirname), '../../public')

const adminEmail = ['1322928787@qq.com']

const publicPath = [/^\/public/, /^\/login/, /^\/content/, /^\/user/, /^\/comments/]

const isDevMode = process.env.NODE_ENV !== 'production'

const port = 3000
const wsPort = 3001

const AppID = 'wxc47d78881f2e620c'
const AppSecret = '431a25b3bd04845338aa28631c094e7d'

const subIds = {
  comment: 'S7zrpjN9Kq05-4ZG_nlTAYxnARMLWlSW09h54A2JCZo',
  comment1: 'ANN2-LhDgrhdFjs7jHOLdTnaxWpQU1LqS3kDIMF9GDs',
  login: 'FSQZganmBgaRRoNNlelQ1Qm2u4gx6pVSt69EJfkLbPA',
  fav: 'g9FFU43_deHRuez-2FcrASorTSITsJJPYx-GhzvHEIU'
}

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
  wsPort,
  AppID,
  AppSecret,
  subIds
}
