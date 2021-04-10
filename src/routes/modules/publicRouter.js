import Router from 'koa-router'
import publicController from '../../api/PublicController'
import userController from '../../api/UserController'
import contentController from '../../api/ContentController'
import commentsController from '../../api/CommentsController'

const router = new Router()

router.prefix('/public')
router.post('/adminlogin', userController.login)
// 图片验证码
router.get('/getCaptcha', publicController.getCaptcha)

// 获取文章列表
router.get('/list', contentController.getPostList)

// 温馨提醒
router.get('/tips', contentController.getTips)

// 友情链接
router.get('/links', contentController.getLinks)

// 回复周榜
router.get('/topWeek', contentController.getTopWeek)

// 确认修改邮件
router.get('/reset-email', userController.updateUsername)

// 获取文章详情
router.get('/content/detail', contentController.getPostDetail)

// 获取评论列表
router.get('/comments', commentsController.getComments)

// 获取用户基本信息
router.get('/info', userController.getBasicInfo)

// 获取用户最近发帖记录
router.get('/latestPost', contentController.getPostPublic)

// 获取用户最近评论记录
router.get('/latestComment', commentsController.getCommentPublic)

export default router
