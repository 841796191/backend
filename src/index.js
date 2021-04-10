import koa from 'koa'
import path from 'path'
import helmet from 'koa-helmet'
import statics from 'koa-static'
import JWT from 'koa-jwt'
import router from './routes/routes'
import koaBody from 'koa-body'
import jsonutil from 'koa-json'
import cors from '@koa/cors'
import compose from 'koa-compose'
import compress from 'koa-compress'
import config from './config/index'
import errorHandle from './common/ErrorHandle' // 鉴权错误处理函数
import WebSocketServer from './config/WebSocket'
import auth from './common/Auth'
import { run } from './common/init'
// import logger from 'koa-logger' // 打印日志
import log4js from './config/log4j' // 输出日志文件
import monitorLogger from './common/Logger'

const app = new koa()
const ws = new WebSocketServer()
ws.init()
global.ws = ws // 全局绑定ws

const isDevMode = process.env.NODE_ENV === 'production' ? false : true

// 定义公共路径,unless是不需要jwt鉴权的路径
const jwt = JWT({secret: config.JWT_SECRET}).unless({ path: [/^\/public/, /\/login/] })

/**
 * 使用koa-compose 集成中间件
 */
// koa-json格式化get请求返回的结果,pretty:false 不格式化响应,
//param:'pretty'查询字符串中包含pretty时格式化响应
// 例:xx.xx.com/api/api?name=lds&pretty
const middleware = compose([
  monitorLogger,
  koaBody({
    multipart: true, // 支持图片上传
    formidable: {
      keepExtensions: true, // 保持文件后缀
      maxFieldsSize: 5 * 1024 * 1024 // 上传最大图片限制
    },
    onError: err => {
      console.log('koabody: err -> ', err)
    }
  }),
  statics(path.join(__dirname, '../public')),
  cors(),
  jsonutil({ pretty: false, param: 'pretty' }),
  helmet(),// 设置安全的headers
  auth,
  errorHandle,
  jwt,
  log4js.koaLogger(log4js.getLogger('access'), { level: 'auto' })
])

if (!isDevMode) {
  app.use(compress())
}

app.use(middleware)
app.use(router())

app.listen(3000, () => {
  run()
})
