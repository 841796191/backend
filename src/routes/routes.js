import combineRoutes from 'koa-combine-routers'

// import publicRouter from './publicRouter'
// import loginRouter from './loginRouter'
// import userRouter from './userRouter'

// require.context只能在webpack打包下才不会报错,现在需运行打包后的js文件才能接收请求
// 读取modules文件夹下的js文件
const moduleFiles = require.context('./modules', true, /\.js$/)
// moduleFiles对象结构
// { './xxx' : '具体路径'}

// 把keys返回的key数组再遍历取值然后把具体路径添加进数组
const modules = moduleFiles.keys().reduce((items, path) => {
  const value = moduleFiles(path)
  items.push(value.default)
  return items
}, [])

export default combineRoutes(
  // publicRouter, 
  // loginRouter,
  // userRouter
  modules
)
