import Router from 'koa-router'
import contentController from '../../api/ContentController'

const router = new Router()

router.prefix('/content')

// 上传图片
router.post('/upload', contentController.uploadImg)

// 发表新帖
router.post('/add', contentController.addPost)

// 更新帖子
router.post('/update', contentController.updatePost)
// 管理更新帖子
router.post('/updateId', contentController.updatePostByTid)
// 管理删除帖子
router.get('/delete', contentController.deletePost)

export default router
