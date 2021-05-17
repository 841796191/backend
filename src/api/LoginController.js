import send from '../config/MailConfig'
import moment from 'moment'
import jsonwebtoken from 'jsonwebtoken'
import config from '../config/index'
import { checkCode } from '../common/Utils'
import User from '../model/User'
import bcryptjs from 'bcryptjs'
import SignRecord from '../model/SignRecord'

class LoginController {
  constructor() {}
  async forget (ctx) {
    const { body } = ctx.request
    console.log(body)
  
    try {
      // body.username -> database -> email
      let result = await send({
        code: '1234',
        expire: moment()
          .add(30, 'minutes')
          .format('YYYY-MM-DD HH:mm:ss'),
        email: body.username,
        user: 'Brian',
      })
      ctx.body = {
        code: 200,
        data: result,
        msg: '邮件发送成功',
      }
    } catch (e) {
      console.log(e)
    }
  }

  // 接收用户数据
  // 验证图片验证码时效性、正确性
  // 验证用户账号密码是否正确
  // 返回token
  async login (ctx) {
    const { body } = ctx.request
    let sid = body.sid // 前端传递sid查找对应验证码
    let code = body.code
    
    // 校验验证码
    let result = await checkCode(sid, code)
    if(result){
      // 验证用户账号密码是否正确
      console.log('check ok')
      let checkUserPassWd = false
      // mongoDB查库
      let user = await User.findOne({username: body.username})
      // 校验密码
      if(await bcryptjs.compare(body.password, user.password)){
        checkUserPassWd = true
      }
      if(checkUserPassWd){
        // 验证通过,返回token数据
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

        // 加入isSign属性
        const signRecord = await SignRecord.findByUid(userObj._id)
        // 判断今日是否签到
        if (signRecord !== null) {
          // 有签到记录,判断今天是否签到了
          if (moment(signRecord.created).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')) {
            // 今天已经签到
            userObj.isSign = true
          } else {
            // 今天没签到
            userObj.isSign = false
          }
          userObj.lastSign = signRecord.created
        } else {
          // 用户无签到记录
          userObj.isSign = false
        }

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
        code: 401,
        msg: '图片验证码不正确,请检查'
      }
    }
  }

  async reg (ctx) {
    // 接收客户端数据
    const { body } = ctx.request
    // 校验验证码 时效性、有效性
    let sid = body.sid
    let code = body.code
    let msg = {}

    // 验证图片验证码时效性
    let result = await checkCode(sid, code)
    let check = true

    if (result) {
      // 查库 看username、name是否被注册
      let user1 = await User.findOne({username: body.username})
      if (user1 !== null && typeof user1.username !== 'undefined') {
        msg.username = ['此邮箱已被注册,可以通过邮箱找回密码']
        check = false
      }

      let user2 = await User.findOne({name: body.name})
      if (user2 !== null && typeof user2.name !== 'undefined') {
        msg.name = ['此昵称已被注册,请修改']
        check = false
      }

      // 写入数据到数据库
      if (check) {
        // 密码加密存储
        body.password = await bcryptjs.hash(body.password, 5)
        let user = new User({
          username: body.username,
          name: body.name,
          password: body.password,
          created: moment().format('YYYY-MM-DD HH:mm:ss')
        })
        // 存储
        let result = await user.save()
        ctx.body = {
          code: 200,
          data: result,
          msg: '注册成功'
        }
        return
      }
    } else {
      // 给veevalidate显示的错误
      msg.code = ['验证码已失效,请重新获取']
    }
    ctx.body = {
      code: 500,
      msg: msg
    }
  }
}

export default new LoginController()
