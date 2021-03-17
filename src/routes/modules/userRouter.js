import Router from 'koa-router'
import userController from '../../api/UserController'
import contentController from '../../api/ContentController'

const router = new Router()

router.prefix('/user')

// 用户签到
router.get('/fav', userController.userSign)

// 更新用户基本信息
router.post('/basic', userController.updateUserInfo)

// 用户修改密码
router.post('/change-password', userController.changePasswd)

// 设置/取消收藏
router.get('/set-collect', userController.setCollect)

// 获取收藏列表
router.get('/collect', userController.getCollectByUid)

// 获取用户发帖记录
router.get('/post', contentController.getPostByUid)

// 删除指定帖子
router.get('/delete-post', contentController.deletePostByUid)

// 获取消息
router.get('/getmsg', userController.getMsg)

// 设置消息
router.get('/setmsg', userController.setMsg)

export default router