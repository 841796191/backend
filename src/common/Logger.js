import log4js from '../config/log4j'

const logger = log4js.getLogger('application')

export default async (ctx, next) => {
  const start = Date.now()
  await next()
  const resTime = Date.now() - start

  if (resTime / 1000 > 1) {
    // 判断系统执行效率
    logger.warn(`[${ctx.method} - ${ctx.url} - time: ${resTime / 1000}s]`)
  }
}