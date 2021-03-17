import Comments from '../model/Comments'
import Post from '../model/Post'
import User from '../model/User'
import { checkCode, getJWtPayload } from '../common/Utils'
import CommentsHands from '../model/CommentsHands'
import { encodeXText } from 'nodemailer/lib/shared'

// 对用户进行判断
const canReply = async (ctx) => {
  let result = false
  const obj = await getJWtPayload(ctx.header.authorization)
  if (typeof obj._id === 'undefined') {
    return result
  } else {
    const user = await User.findByID(obj._id)
    if (user.status === '0') { // status  0为正常
      result = true
    }
    return result
  }
}

class CommentsController {
  // 获取评论列表
  async getComments (ctx) {
    const params = ctx.query
    const tid = params.tid // 帖子id
    const page = params.page ? params.page : 0 // 第几页评论
    const limit = params.limit ? parseInt(params.limit) : 10 // 每页条数
    // 取评论
    const r = await Comments.findByTid(tid)
    let result = await Comments.getCommentsList(tid, page, limit)
    
    // 判断用户是否登录，已登录的用户才去判断点赞信息
    let obj = {}
    if (typeof ctx.header.authorization !== 'undefined') {
      obj = await getJWtPayload(ctx.header.authorization)
    }
    if (typeof obj._id !== 'undefined') {
      // 已经登录, 把数据库返回的数据JSON化才能操作
      result = result.map(item => item.toJSON())
      for (let i = 0; i < result.length; i++) {
        let item = result[i]
        item.handed = '0' // 添加点赞属性
        // 查询点赞表
        const commentsHands = await CommentsHands.findOne({ cid: item._id, uid: obj._id })
        // 判断是否有用户的点赞记录,有则修改handed属性
        if (commentsHands && commentsHands.cid) {
          if (commentsHands.uid === obj._id) {
            item.handed = '1'
          }
        }
      }
    }
    const total = await Comments.queryCount(tid)
    ctx.body = {
      code: 200,
      total,
      data: result,
      msg: '查询成功'
    }
  }

  // 添加评论
  async addComment (ctx) {
    const check = await canReply(ctx)
    if (!check) {
      ctx.body = {
        code: 500,
        msg: '用户已被禁言'
      }
      return
    }
    const { body } = ctx.request
    const sid = body.sid
    const code = body.code
    // 验证图片验证码
    const result = await checkCode(sid, code)
    if (!result) {
      ctx.body = {
        code: 500,
        msg: '图片验证码不正确,请检查'
      }
      return
    }
    const newComment = new Comments(body)
    const obj = await getJWtPayload(ctx.header.authorization)
    newComment.cuid = obj._id
    // 查询帖子作者发送消息
    const post = await Post.findOne({_id: body.tid})
    newComment.uid = post.uid
    const comment = await newComment.save()
    
    // 统计帖子有多少未读评论消息
    const num = await Comments.getTotal(post.uid)
    // 发送消息
    global.ws.send(post.uid, JSON.stringify({
      event: 'message',
      message: num
    }))
    // 增加回复数
    const updatePostresult = await Post.updateOne({_id: body.tid}, {
      $inc: {answer: 1}
    })

    if (comment._id && updatePostresult.ok === 1) {
      ctx.body = {
        code: 200,
        data: comment,
        msg: '评论成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '评论失败'
      }
    }
  }

  // 更新评论
  async updateComment (ctx) {
    const check = await canReply(ctx)
    if (!check) {
      ctx.body = {
        code: 500,
        msg: '用户已被禁言'
      }
      return
    }
    const { body } = ctx.request
    const result = await Comments.updateOne({_id: body.cid}, { $set: body})
    ctx.body = {
      code: 200,
      msg: '修改成功',
      data: result
    }
  }

  // 采纳
  async setBest (ctx) {
    // 对用户权限进行判断
    const obj = await getJWtPayload(ctx.header.authorization)
    if (typeof obj === 'undefined' && obj._id === '') {
      ctx.body = {
        code: 401,
        msg: '用户未登录,或用户未授权'
      }
      return
    }
    const params = ctx.query
    const post = await Post.findOne({_id: params.tid})
    if (post.uid === obj._id && post.isEnd === '0') {
      // 说明这是作者本人,可以设置isBest
      const result = await Post.updateOne({_id: params.tid}, {
        $set: {
          isEnd: '1'
        }
      })
  
      const result1 = await Comments.updateOne({_id: params.cid}, {
        $set: {
          isBest: '1'
        }
      })

      // 把积分给采纳用户
      if (result.ok === 1 && result1.ok === 1) {
        const comment = await Comments.findByCid(params.cid)
        // 添加积分
        const result2 = await User.updateOne({_id: comment.cuid}, {$inc: {favs: parseInt(post.fav)}})
        // console.log('resule2:', result2)
        if (result2.ok === 1) {
          ctx.body = {
            code: 200,
            msg: '设置成功',
            data: result2
          }
        } else {
          ctx.body = {
            code: 500,
            msg: '设置最佳答案-更新用户失败'
          }
        }
      } else {
        ctx.body = {
          code: 500,
          msg: '设置失败',
          data: {...result, ...result1}
        }
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '帖子已结帖,无法重复设置'
      }
    }
  }

  // 点赞
  async setHands (ctx) {
    const obj = await getJWtPayload(ctx.header.authorization)
    const params = ctx.query

    // 判断用户是否已经点赞
    const tmp = await CommentsHands.find({cid: params.cid, uid: obj._id})
    if (tmp.length > 0) {
      ctx.body = {
        code: 500,
        msg: '您已经点赞,请勿重复点赞'
      }
      return
    }
    // 新增一条点赞记录
    const newHands = new CommentsHands({
      cid: params.cid, // 评论id
      uid: obj._id // 点赞人id
    })
    const data = await newHands.save()
    // 更新comments表中对应记录hands信息+1
    const result = await Comments.updateOne({_id: params.cid}, { $inc: {hands: 1}})
    if (result.ok === 1) {
      ctx.body = {
        code: 200,
        msg: '点赞成功',
        data: data
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '保存点赞信息失败'
      }
    }
  }

  // 获取用户最近评论
  async getCommentPublic (ctx) {
    const params = ctx.query
    const result = await Comments.getCommetsPublic(params.uid, params.page, parseInt(params.limit))
    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        msg: '查询最近的评论记录成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '查询评论记录失败！'
      }
    }
  }
}

export default new CommentsController()