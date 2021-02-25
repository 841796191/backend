// 错误处理
export default (ctx, next) => {
  return next().catch((err) => {
    // 401
    if (401 == err.status) {
      ctx.status = 401
      ctx.body = {
        code: 401,
        msg:'Protectted resource, use Authorization header to get access\n'
      }
    } else {
      // 非401
      ctx.status = err.status || 500
      ctx.body = Object.assign({
        code: 500,
        msg: err.message
        // 添加出错信息位置
      }, process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    }
  })
}