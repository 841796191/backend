import { getValue } from '../config/RedisConfig'
import config from '../config/index'
import jwt from 'jsonwebtoken'

// 获取token中的数据
const getJWtPayload = token => {
  return jwt.verify(token.split(' ')[1], config.JWT_SECRET)
}

// 检验验证码
const checkCode = async (key, value) => {
  // 根据sid获取redis中的验证码
  const redisData = await getValue(key)
  if (redisData != null) {
    if(redisData.toLowerCase() === value.toLowerCase()){
      return true
    } else {
      return false
    }
  } else {
    return false
  }
}

export {
  checkCode,
  getJWtPayload
}