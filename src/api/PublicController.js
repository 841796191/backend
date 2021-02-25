import svgCaptcha from 'svg-captcha'
import { getValue, setValue } from '../config/RedisConfig'
class PublicController {
  constructor() {}
  // 获取验证码
  async getCaptcha(ctx) {
    const body = ctx.request.query
    // sid为前端生成的唯一标识符，与验证码一起存入redis方便校验验证码
    console.log(body.sid)
    const newCaptca = svgCaptcha.create({
      size: 4, // 验证码长度
      ignoreChars: '0o1il', // 忽略指定数字字符
      color: true, // 有颜色
      noise: Math.floor(Math.random() * 5), // 干扰线
      width: 150, // 图片宽度
      height: 38, // 图片长度
    })
    // 把验证码和对应标识符存储到redis中,并设置超时时间为10分钟
    setValue(body.sid, newCaptca.text, 10 * 60)

    ctx.body = {
      code: 200,
      data: newCaptca.data,
    }
  }
}

export default new PublicController()
