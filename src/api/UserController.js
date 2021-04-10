import SignRecord from '../model/SignRecord'
import { getJWtPayload, checkCode } from '../common/Utils'
import User from '../model/User'
import Comments from '../model/Comments'
import UserCollect from '../model/UserCollect'
import moment from 'dayjs'
import send from '../config/MailConfig'
import uuid from 'uuid/v4'
import jwt from 'jsonwebtoken'
import { setValue, getValue } from '../config/RedisConfig'
import config from '../config/index'
import bcryptjs from 'bcryptjs'
import qs from 'qs'
import jsonwebtoken from 'jsonwebtoken'

class UserController {
  // 管理员登录
  async login (ctx) {
    // 接收用户数据
    // 验证图片验证码时效性、正确性
    // 验证用户账号密码是否正确
    // 返回token
    const { body } = ctx.request
    let sid = body.sid // 前端传递sid查找对应验证码
    let code = body.code
    
    // 校验验证码
    let result = await checkCode(sid, code)
    // console.log('result: ',result)
    if(result){
      // 验证用户账号密码是否正确
      console.log('check')
      let checkUserPassWd = false
      // mongoDB查库
      let user = await User.findOne({username: body.username})
      // console.log('user: ',user)
      // 判断是否为管理员
      if (user.roles.includes('admin') || user.roles.includes('super_admin')) {
            // 校验密码
          if(await bcryptjs.compare(body.password, user.password)){
            checkUserPassWd = true
          }
          if(checkUserPassWd){
            // 验证通过,返回token数据
            console.log('hello login')

            const userObj = user.toJSON()
            // 不想传回前端的数据
            const arr = ['password', 'username']
            // 删除数据
            arr.map((item) => {
              delete userObj[item]
            })
            // exp 设置token过期时间
            // let token = jsonwebtoken.sign({_id:'brian', exp: Math.floor(Date.now() / 1000) + 60 * 60 *24}, config.JWT_SECRET)
            let token = jsonwebtoken.sign({_id: userObj._id}, config.JWT_SECRET, {
              expiresIn: '1d' // 另一种设置过期时间方法,1d为1天
            })

            ctx.body = {
              code: 200,
              data: userObj,
              token: token
            }
          } else {
            // 用户名、密码验证失败,返回提示
            ctx.body = {
              code: 404,
              msg: '用户名或密码错误'
            }
          }  
        } else {
          // 图片验证码校验失败
          ctx.body = {
            code: 404,
            msg: '不是管理员,无法登录后台'
          }
        }
    // console.log('hello login')
  } else {
    ctx.body = {
      code: 401,
      msg: '验证码错误'
    }
  }
}

  // 用户签到接口
  async userSign (ctx) {
    // 从token取用户ID,jsonwebtoken返回一个promise对象
    const obj = await getJWtPayload(ctx.header.authorization)
    
    // 查询用户上一次签到记录
    const record = await SignRecord.findByUid(obj._id)
    const user = await User.findByID(obj._id)

    let result = ''
    let newRecord = {}
    
    // 判断签到逻辑
    if (record !== null) {
      // 有历史签到数据
      // 判断用户上一次签到记录的created时间是否与今天相同
      // 如果相同代表用户在连续签到
      // 如果当前时间的日期与用户上一次签到日期相同,说明用户已经签到
      
      if (moment(record.created).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')) {
        ctx.body = {
          code: 500,
          favs: user.favs,
          count: user.count,
          lastSign: record.created,
          msg: '用户已经签到'
        }
        return
      } else {
        // 有上一次的签到记录,并且不与今天相同,进行连续签到的判断
        // 如果相同,代表用户在连续签到
        let count = user.count
        let fav = 0
        
        // 判断连续签到: 用户上一次签到时间等于当前时间的前一天,说明在连续签到
        // moment().subtract(1, 'days').format('YYYY-MM-DD') 取昨天的日期
        if (moment(record.created).format('YYYY-MM-DD') === moment().subtract(1, 'days').format('YYYY-MM-DD')) {
          // 连续签到积分获得逻辑
          count += 1
          if (count < 5) {
            fav = 5
          } else if (count >= 5 && count < 15) {
            fav = 10
          } else if (count >= 15 && count < 30) {
            fav = 15
          } else if (count >= 30 && count < 100) {
            fav = 20
          } else if (count >= 100 && count < 365) {
            fav = 30
          } else if (count >= 365) {
            fav = 50
          }
          // 更新用户表数据
          await User.updateOne({
            _id: obj._id
          },{
            $inc: {favs: fav, count: 1}
          })
          result = {
            favs: user.favs + fav,
            count: user.count + 1
          }
        } else {
          // 用户中断了签到
          fav = 5
          await User.updateOne({
            _id: obj._id
          }, {
            $set: { count: 1 },
            $inc: { favs: fav }
          })
          result = {
            favs: user.favs + fav,
            count: 1
          }
        }
        // 更新签到记录,每次签到就存入一条签到记录
        newRecord = new SignRecord({
          uid: obj._id,
          favs: fav
        })
        await newRecord.save()
      }
    } else {
      // 无签到数据 -> 第一次签到
      // 保存用户的签到数据  签到次数 + 积分数据
      await User.updateOne({
        _id: obj._id
      }, { // count为连续签到次数
        $set: { count: 1 }, // 将User模型中的count设为1
        $inc: { favs: 5 } // 将User模型中的favs加5
      })

      // 保存用户的签到记录
      newRecord = new SignRecord({
        uid: obj._id,
        favs: 5
      })
      await newRecord.save()
      result = {
        favs: user.favs + 5,
        count: 1
      }
    }

    ctx.body = {
      code: 200,
      msg: '请求成功',
      ...result,
      lastSign: newRecord.created
    }
  }

  // 更新用户基本信息接口
  async updateUserInfo (ctx) {
    const { body } = ctx.request
    const obj = await getJWtPayload(ctx.header.authorization)

    // 判断用户是否修改了邮箱
    const user = await User.findOne({ _id: obj._id})
    let msg = ''
    if (body.username && body.username !== user.username) {
      // 用户修改了邮箱
      // 发送reset邮件
      // 判断用户新邮箱是否已经被注册
      const tmpUser = await User.findOne({ username: body.username })
      if (tmpUser && tmpUser.password) {
        ctx.body = {
          code: 501,
          msg: '邮箱已经被注册了'
        }
        return
      }


      const key = uuid()
      // redis存储key值 30分钟过期
      setValue(key, jwt.sign({_id: obj._id}, config.JWT_SECRET, {
        expiresIn: '30m' // 30分钟过期
      }))
      const result = await send({
        type: 'email',
        data: {
          key: key,
          username: body.username
        },
        code: '',
        expire: moment().add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
        email: body.username,
        user: user.name
      })

      msg = '更新基本资料成功,账号修改需要确认邮件,请查收邮件'
    }


    // 更新除username外的其他数据
    const arr = ['username', 'password', 'mobile']
    // 排除掉username
    arr.map((item) => { delete body[item] })

    const result = await User.updateOne({_id: obj._id}, body)
    if (result.n === 1 && result.ok === 1) {
      ctx.body = {
        code: 200,
        msg: msg === '' ? '更新成功' : msg
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '更新失败'
      }
    }
  }

  // 更新用户名
  async updateUsername (ctx) {
    const body = ctx.query
    if (body.key) {
      const token = await getValue(body.key)
      const obj = getJWtPayload('Bearer ' + token)
      await User.updateOne({_id: obj._id}, {
        username: body.username
      })
      ctx.body = {
        code: 200,
        msg: '更新用户名成功'
      }
    }
  }

  // 修改密码接口
  async changePasswd (ctx) {
    const { body } = ctx.request
    const obj = await getJWtPayload(ctx.header.authorization)
    const user = await User.findOne({_id: obj._id})

    if (await bcryptjs.compare(body.oldpwd, user.password)) {
      const newpasswd = await bcryptjs.hash(body.newpwd, 5) 
      // 更新密码
      const result = await User.updateOne(
        { _id: obj._id },
        { $set: { password: newpasswd }}
      )

      ctx.body = {
        code: 200,
        msg: '更新密码成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '密码错误,请检查!'
      }
    }
  }

  // 设置/取消收藏
  async setCollect (ctx) {
    const params = ctx.query
    const obj = await getJWtPayload(ctx.header.authorization)
    if (parseInt(params.isFav)) {
      // 说明用户已经收藏了帖子
      await UserCollect.deleteOne({ uid: obj._id, tid: params.tid })
      ctx.body = {
        code: 200,
        msg: '取消收藏成功'
      }
    } else {
      // 首次收藏
      const newCollect = new UserCollect({
        uid: obj._id,
        tid: params.tid,
        title: params.title
      })
      const result = await newCollect.save()
      // 保存成功
      if (result.uid) {
        ctx.body = {
          code: 200,
          data: result,
          msg: '收藏成功'
        }
      }
    }
  }

  // 获取收藏列表
  async getCollectByUid (ctx) {
    const params = ctx.query
    const obj = await getJWtPayload(ctx.header.authorization)
    const result = await UserCollect.getListByUid(
      obj._id,
      params.page,
      params.limit ? parseInt(params.limit) : 10
    )
    const total = await UserCollect.countByUid(obj._id)
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

  // 获取用户基本信息
  async getBasicInfo (ctx) {
    const params = ctx.query
    // const obj = await getJWtPayload(ctx.header.authorization)
    const uid = params.uid || ctx._id
    let user = await User.findByID(uid || obj._id)
    // 取得用户的签到记录 看日期有没有大于今天 0:00:00 的
    user = user.toJSON()
    const date = moment().format('YYYY-MM-DD')
    const result = await SignRecord.findOne({
      uid: uid,
      created: { $gte: date + ' 00:00:00' }
    })
    if (result && result.uid) {
      user.isSign = true
    } else {
      user.isSign = false
    }
    ctx.body = {
      code: 200,
      data: user,
      msg: '查询成功！'
    }
  }

  // 获取消息,记录评论之后给作者发送消息
  async getMsg (ctx) {
    const params = ctx.query
    const page = params.page ? params.page : 0
    const limit = params.limit ? parseInt(params.limit) : 0
    const obj = await getJWtPayload(ctx.header.authorization)
    // 获取历史消息
    const result = await Comments.getMsgList(obj._id, page, limit)
    // 有多少未读消息
    const num = await Comments.getTotal(obj._id)
    
    ctx.body = {
      code: 200,
      data: result,
      total: num
    }
  }

  // 设置消息已读
  async setMsg (ctx) {
    const params = ctx.query
    // 判断有无传id,有则设置一条消息已读,无则所有消息已读
    if (params.id) {
      const result = await Comments.updateOne({_id: params.id}, {isRead: '1'})
      if (result.ok === 1) {
        ctx.body = {
          code: 200
        }
      }
    } else {
      // 设置所有消息
      const obj = await getJWtPayload(ctx.header.authorization)
      const result = await Comments.updateMany({uid: obj._id}, {isRead: '1'})
      if (result.ok === 1) {
        ctx.body = {
          code: 200
        }
      }
    }
  }

  // 管理获取用户列表
  async getUsers (ctx) {
    let params = ctx.query
    params = qs.parse(params)
    const page = params.page ? params.page : 0
    const limit = params.limit ? parseInt(params.limit) : 0
    const sort = params.sort || 'created'
    const option = params.option || {}
    const result = await User.getList(option, sort, page, limit)
    const total = await User.countList(option)
    ctx.body = {
      code: 200,
      data: result,
      total: total
    }
  }

  // 管理更新用户信息
  async updateUserById (ctx) {
    const { body } = ctx.request
    const user = await User.findOne({ _id: body._id })
    // 1.校验用户是否存在 -> 用户名是否冲突
    if (!user) {
      ctx.body = {
        code: 500,
        msg: '用户不存在或者id信息错误！'
      }
      return
    }

    // 2.判断密码是否传递 -> 进行加密保存
    if (body.password) {
      body.password = await bcryptjs.hash(body.password, 5)
    }
    const result = await User.updateOne({ _id: body._id }, body)
    if (result.ok === 1 && result.nModified === 1) {
      ctx.body = {
        code: 200,
        msg: '更新成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '服务异常，更新失败'
      }
    }
  }

  // 管理删除用户信息
  async deleteUserById (ctx) {
    const { body } = ctx.request
    // const user = await User.findOne({ _id: body.ids })
    // if (user) {
      const result = await User.deleteMany({ _id: { $in: body.ids } })
      ctx.body = {
        code: 200,
        msg: '删除成功',
        data: result
      }
    // } else {
    //   ctx.body = {
    //     code: 500,
    //     msg: '用户不存在或id错误'
    //   }
    // }
  }

  // 校验用户名是否冲突
  async checkUsername (ctx) {
    const params = ctx.query
    const user = await User.findOne({ username: params.username })
    // 默认为1,  1-校验通过 0-校验失败
    let result = 1
    if (user) {
      result = 0
    }
    ctx.body = {
      code: 200,
      data: result,
      msg: '成功校验'
    }
  }

  // 管理添加用户
  async addUser (ctx) {
    const { body } = ctx.request
    body.password = await bcryptjs.hash(body.password, 5)
    const user = new User(body)
    const result = await user.save()
    const userObj = result.toJSON()
    const arr = ['password']
    // 返回数据去掉密码
    arr.map(item => {
      delete userObj[item]
    })
    if (result) {
      ctx.body = {
        code: 200,
        data: userObj,
        msg: '添加用户成功'
      }
    } else {
      ctx.body = {
        code: 500,
        msg: '服务接口异常'
      }
    }
  }

  // 管理批量设置
  async updateUserBatch (ctx) {
    const { body } = ctx.request
    const result = await User.updateMany(
      { _id: { $in: body.ids } },
      { $set: { ...body.settings } }
    )
    ctx.body = {
      code: 200,
      data: result
    }
  }
}

export default new UserController()