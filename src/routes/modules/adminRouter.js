import Router from 'koa-router'
import contentController from '@/api/ContentController'
import userController from '@/api/UserController'
import adminController from '@/api/AdminController'
import errorController from '@/api/ErrorController'

const router = new Router()

router.prefix('/admin')
// 标签页面
// 获取标签列表
router.get('/getTags', contentController.getTags)

// 添加标签
router.post('/addTag', contentController.addTag)

// 删除标签
router.get('/removeTag', contentController.removeTag)

// 编辑标签
router.post('/editTag', contentController.updateTag)

// 获取用户列表
router.get('/users', userController.getUsers)

// 更新用户信息
router.post('/updateUser', userController.updateUserById)

// 删除用户信息
router.post('/deleteUser', userController.deleteUserById)

// 校验用户名是否冲突
router.get('/checkname', userController.checkUsername)

// 新增用户
router.post('/addUser', userController.addUser)

// 批量设置用户
router.post('/updateUserSettings', userController.updateUserBatch)

// 管理菜单
// 添加菜单
router.post('/addMenu', adminController.addMenu)

// 获取菜单
router.get('/getMenu', adminController.getMenu)

// 更新菜单
router.post('/updateMenu', adminController.updateMenu)

// 删除菜单
router.post('/deleteMenu', adminController.deleteMenu)

// 角色信息
// 添加角色
router.post('/addRole', adminController.addRole)

// 获取角色
router.get('/getRoles', adminController.getRoles)

// 删除角色
router.post('/deleteRole', adminController.deleteRole)

// 更新角色
router.post('/updateRole', adminController.updateRole)

// 获取角色列表
router.get('/getRolesNames', adminController.getRoleNames)

// 获取评论
router.get('/getComments', adminController.getCommentsAll)

// 删除评论
router.post('/deleteComments', adminController.deleteCommentsBatch)

// 批量更新评论
router.post('/updateCommentsBatch', adminController.updateCommentsBatch)

// 获取用户角色动态菜单信息
router.get('/getRoutes', adminController.getRoutes)

// 获取首页状态
router.get('/getstat', adminController.getStats)

// 获取错误日志
router.get('/getError', errorController.getErrorList)

// 删除错误日志
router.post('/deleteError', errorController.deleteError)

export default router