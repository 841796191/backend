import Post from '../model/Post'
import Links from '../model/Links'
import fs, { read } from 'fs'
import uuid from 'uuid/v4'
import moment from 'dayjs'
import config from '../config/index'
// import { dirExists } from '../common/Utils'

import mkdir from 'make-dir'
import { checkCode, getJWtPayload } from '../common/Utils'
import User from '../model/User'
import PostTags from '../model/PostTags'
import UserCollect from '../model/UserCollect'
import qs from 'qs'

class ContentController {
  // 获取文章列表
  async getPostList (ctx) {
    const body = qs.parse(ctx.query)
    // 排序条件、页数、每页条数
    const sort = body.sort ? body.sort : 'created'
    const page = body.page ? parseInt(body.page) : 0
    const limit = body.limit ? parseInt(body.limit) : 20
    const options = {}

    if (body.title) {
      options.title = { $regex: body.title }
    }
    if (body.catalog && body.catalog.length > 0) {
      options.catalog = { $in: body.catalog }
    }
    if (body.isTop) {
      options.isTop = body.isTop
    }
    if (body.isEnd) {
      options.isEnd = body.isEnd
    }
    if (body.status) {
      options.status = body.status
    }
    if (typeof body.tag !== 'undefined' && body.tag !== '') {
      options.tags = { $elemMatch: { name: body.tag } }
    }
    // 根据条件查询数据库
    const result = await Post.getList(options, sort, page, limit)
    const total = await Post.countList(options)

    ctx.body = {
      code: 200,
      data: result,
      msg: '获取文章列表成功',
      total: total
    }
  }

  // 查询友链
  async getLinks (ctx) {
    const result = await Links.find({ type: 'links' })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 查询温馨提醒
  async getTips (ctx) {
    const result = await Links.find({ type: 'tips' })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 本周热议
  async getTopWeek (ctx) {
    const result = await Post.getTopWeek()
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 上传图片接口
  async uploadImg (ctx) {
    // files是请求对象,file是前端formData中append的那个'file'
    const file = ctx.request.files.file
    // 取图片名称、图片格式、存储位置、返回前台可以读取的路径
    const ext = file.name.split('.').pop() // 取图片格式
    // 拼接存储路径目录
    const dir = `${config.uploadPath}/${moment().format('YYYYMMDD')}`

    // 判断路径是否存在,不存在则创建
    // await dirExists(dir)  // make-dir包作用为创建目录路径
    await mkdir(dir)

    // 存储文件到指定路,给文件一个唯一的名称
    const picname = uuid()
    const destPath = `${dir}/${picname}.${ext}`
    const reader = fs.createReadStream(file.path) // 读文件
    const upStream = fs.createWriteStream(destPath) // 写文件
    // 返回给前端的文件路径
    const filePath = `/${moment().format('YYYYMMDD')}/${picname}.${ext}` 
    
    // 方法1
    // reader.pipe(upStream) // 利用管道读写文件

    // 方法2
    let totalLength = 0
    reader.on('data', (chunk) => {
      // 监听data事件,分块读取文件
      totalLength += chunk.length
      // 一块块写入
      if (upStream.write(chunk) === false){
        // 当写入chunk为0时则文件读取结束,写入为0时返回false停止读取
        reader.pause()
      }
    })
    // 继续读取
    reader.on('drain', () => {
      reader.resume()
    })
    // 结束写入
    reader.on('end', () => {
      upStream.end()
    })

    ctx.body ={
      code: 200,
      msg: '图片上传成功',
      data: filePath
    }
  }

  // 发表新帖
  async addPost (ctx) {
    const { body } = ctx.request
    const sid = body.sid
    const code = body.code
    // 验证图片验证码
    const result = await checkCode(sid, code)
    if (result) {
      const obj = await getJWtPayload(ctx.header.authorization)
      // 判断用户积分数是否足够
      // 用户积分足够,发表帖子,减除用户对应积分
      const user = await User.findById({_id: obj._id})
      if (user.favs < body.fav) {
        ctx.body = {
          code: 501,
          msg: '积分不足'
        }
        return
      } else {
        // 扣除积分
        await User.updateOne({_id: obj._id}, { $inc: { favs: -body.fav} })
      }
      const newPost = new Post(body)
      // 帖子uid等于发帖人的_id
      newPost.uid = obj._id
      const result = await newPost.save()
      ctx.body = {
        code: 200,
        msg: '发布成功',
        data: result
      }
    } else {
      // 验证失败
      ctx.body = {
        code: 500,
        msg: '图片验证码验证失败'
      }
    }
  }

  // 获取文章详情
  async getPostDetail (ctx) {
    const params = ctx.query
    if (!params.tid) {
      ctx.body = {
        code: 500,
        msg: '文章id为空'
      }
      return
    }
    const post = await Post.findByTid(params.tid)
    if (!post) {
      ctx.body = {
        code: 200,
        data: {},
        msg: '查询文章详情成功'
      }
      return
    }
    let isFav = 0 // 判断收藏的变量
    // 判断用户是否传递Authorization的数据，即是否登录
    if (
      typeof ctx.header.authorization !== 'undefined' &&
      ctx.header.authorization !== ''
    ) {
      const obj = await getJWtPayload(ctx.header.authorization)
      // 查询用户收藏记录
      const userCollect = await UserCollect.findOne({
        uid: obj._id,
        tid: params.tid
      })
      // 如果有收藏记录则isFav置为1
      if (userCollect && userCollect.tid) {
        isFav = 1
      }
    }
    const newPost = post.toJSON()
    newPost.isFav = isFav
    // 更新文章阅读记数
    const result = await Post.updateOne(
      { _id: params.tid },
      { $inc: { reads: 1 } }
    )
    if (post._id && result.ok === 1) {
      ctx.body = {
        code: 200,
        data: newPost,
        msg: '查询文章详情成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '获取文章详情失败'
      }
    }
  }

  // 更新帖子
  async updatePost (ctx) {
    const { body } = ctx.request
    const sid = body.sid
    const code = body.code

    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code)
    if (result) {
      const obj = await getJWtPayload(ctx.header.authorization)
      // 判断帖子作者是否为本人
      const post = await Post.findOne({ _id: body.tid })
      // 判断帖子是否结贴
      if (post.uid === obj._id && post.isEnd === '0') {
        // 更新帖子
        const result = await Post.updateOne({ _id: body.tid }, body)
        
        if (result.ok === 1) {
          ctx.body = {
            code: 200,
            data: result,
            msg: '更新帖子成功'
          }
        } else {
          ctx.body = {
            code: 500,
            data: result,
            msg: '编辑帖子，更新失败'
          }
        }
      } else {
        ctx.body = {
          code: 401,
          msg: '已结帖,没有操作的权限'
        }
      }
    } else {
      // 图片验证码验证失败
      ctx.body = {
        code: 500,
        msg: '图片验证码验证失败'
      }
    }
  }

  // 管理更新帖子
  async updatePostByTid (ctx) {
    const { body } = ctx.request
    const result = await Post.updateOne({ _id: body._id }, body)
    if (result.ok === 1) {
      ctx.body = {
        code: 200,
        data: result,
        msg: '更新帖子成功'
      }
    } else {
      ctx.body = {
        code: 500,
        data: result,
        msg: '编辑帖子,更新失败'
      }
    }

  }

  // 获取用户发帖记录
  async getPostByUid (ctx) {
    const params = ctx.query
    // 获取用户信息
    const obj = await getJWtPayload(ctx.header.authorization)
    // 查询用户发表的帖子
    const result = await Post.getListByUid(
      obj._id,
      params.page,
      params.limit ? parseInt(params.limit) : 10
    )
    // 统计用户发帖总数
    const total = await Post.countByUid(obj._id)
    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        total,
        msg: '查询列表成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '查询列表失败'
      }
    }
  }

  // 删除指定帖子
  async deletePostByUid (ctx) {
    const params = ctx.query
    const obj = await getJWtPayload(ctx.header.authorization)
    const post = await Post.findOne({uid: obj._id, _id: params.tid})

    // 判断帖子是否已结帖,若已结帖则不准删除
    if (post.id === params.tid && post.isEnd === '0') {
      const result = await Post.deleteOne({_id: params.tid})
      if (result.ok === 1) {
        ctx.body = {
          code: 200,
          msg: '删除成功'
        }
      } else {
        ctx.body = {
          code: 500,
          msg: '执行删除失败'
        }
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '删除失败,无权限'
      }
    }
  }

  async getPostPublic (ctx) {
    const params = ctx.query
    const result = await Post.getListByUid(
      params.uid,
      params.page,
      params.limit ? parseInt(params.limit) : 10
    )
    const total = await Post.countByUid(params.uid)
    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        total,
        msg: '查询列表成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '查询列表失败'
      }
    }
  }

  // 管理删除帖子
  async deletePost (ctx) {
    const params = ctx.query
    const result = await Post.deleteOne({ _id: params.tid})
    if (result.ok === 1) {
      ctx.body = {
        code: 200,
        msg: '删除成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '执行删除失败'
      }
    }
  }

  // 获取标签列表
  async getTags (ctx) {
    const params = ctx.query
    const page = params.page ? parseInt(params.page) : 0
    const limit = params.limit ? parseInt(params.limit) : 10
    const result = await PostTags.getList({}, page, limit)
    const total = await PostTags.countList({})
    ctx.body = {
      code: 200,
      data: result,
      total,
      msg: '查询tags成功！'
    }
  }

  // 添加标签
  async addTag (ctx) {
    const { body } = ctx.request
    const tag = new PostTags(body)
    await tag.save()
    ctx.body = {
      code: 200,
      msg: '标签保存成功'
    }
  }

  // 删除标签
  async removeTag (ctx) {
    const params = ctx.query
    const result = await PostTags.deleteOne({ _id: params.ptid })

    ctx.body = {
      code: 200,
      data: result,
      msg: '删除成功'
    }
  }

  // 更新标签
  async updateTag (ctx) {
    const { body } = ctx.request
    const result = await PostTags.updateOne(
      { _id: body._id },
      body
    )

    ctx.body = {
      code: 200,
      data: result,
      msg: '更新成功'
    }
  }

  // 批量更新
  async updatePostBatch (ctx) {
    const { body } = ctx.request
    const result = await Post.updateMany(
      { _id: { $in: body.ids } },
      { $set: { ...body.settings } }
    )
    ctx.body = {
      code: 200,
      data: result
    }
  }
}

export default new ContentController()

