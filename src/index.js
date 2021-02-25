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

const app = new koa()

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
  koaBody(),
  statics(path.join(__dirname, '../public')),
  cors(),
  jsonutil({ pretty: false, param: 'pretty' }),
  helmet(),// 设置安全的headers
  errorHandle,
  jwt
])

if (!isDevMode) {
  app.use(compress())
}

app.use(middleware)
app.use(router())

app.listen(3000)
