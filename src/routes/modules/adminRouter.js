import Router from 'koa-router'
import contentController from '@/api/ContentController'
import userController from '@/api/UserController'
import adminController from '@/api/AdminController'

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
export default router