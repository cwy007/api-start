import auth from '@/common/Auth'
import monitorLogger from '@/common/Logger'
import log4js from '@/config/Log4j'
import cors from '@koa/cors'
import Koa from 'koa'
import koaBody from 'koa-body'
import compose from 'koa-compose'
import compress from 'koa-compress'
import helmet from 'koa-helmet'
import jsonutil from 'koa-json'
import JWT from 'koa-jwt'
import statics from 'koa-static'
import path from 'path'
import './common/Cron'
import errorHandle from './common/ErrorHandle'
import { run } from './common/Init'
import config from './config/index'
import WebSocketServer from './config/WebSocket'
import router from './routes/routes'
const app = new Koa()
const ws = new WebSocketServer()

ws.init()
global.ws = ws

// 定义公共路径，不需要jwt鉴权
const jwt = JWT({ secret: config.JWT_SECRET }).unless({ path: [/^\/public/, /^\/login/] })

/**
 * 使用koa-compose 集成中间件
 */
const middleware = compose([
  monitorLogger,
  koaBody({
    multipart: true,
    formidable: {
      keepExtensions: true,
      maxFieldsSize: 5 * 1024 * 1024
    },
    onError: err => {
      console.log('koabody TCL: err', err)
    }
  }),
  statics(path.join(__dirname, '../public')),
  cors(),
  jsonutil({ pretty: false, param: 'pretty' }),
  helmet(),
  jwt,
  auth,
  errorHandle,
  config.isDevMode
    ? log4js.koaLogger(log4js.getLogger('http'), {
      level: 'auto'
    })
    : log4js.koaLogger(log4js.getLogger('access'), {
      level: 'auto'
    })
])

if (!config.isDevMode) {
  app.use(compress())
}
// console.log(config.baseUrl)
app.use(middleware)
app.use(router())

app.listen(config.port, () => {
  const logger = log4js.getLogger('out')
  logger.info('app is runing at ' + config.port)
  run()
})
