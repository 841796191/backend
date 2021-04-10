import { getJWtPayload } from '../common/Utils'
import { getValue } from '../config/RedisConfig'
import config from '../config/index'
import adminController from '../api/AdminController'

// 鉴权获取用户_id并将其挂载到ctx._id上
export default async (ctx, next) => {
  const header = ctx.header.authorization
  if (typeof header !== 'undefined') {
    const obj = await getJWtPayload(ctx.header.authorization)
    if (obj._id) {
      ctx._id = obj._id
      
      // 判断登录用户是否为超级管理员
      const admins = JSON.parse(await getValue('admin'))
      if (admins.includes(obj._id)) {
        ctx.isAdmin = true
        await next()
        return
      } else {
        ctx.isAdmin = false
      }
    }
  } 

  // 不是管理员
  // 1.过滤公共路径
  const { publicPath } = config
  if (publicPath.some((item) => item.test(ctx.url))) {
    await next()
    return
  }
  // 2.根据用户的roles 查询用户menus数据然后拿到用户的operations
  const operations = await adminController.getOperations(ctx)
  // console.log('operations: ', operations)
  let url = ctx.url.split('?')[0]
  // console.log('url: ', url)
  // 3.判断用户的请求路径是否在operations里面,如果在则放行,否则禁止访问
  if (operations.includes(url)) {
    await next()
  } else {
    ctx.throw(401)
  }
}