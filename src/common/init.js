import config from '../config/index'
import User from '../model/User'
import { setValue } from '../config/RedisConfig'

export const run = async () => {
  if (config.isAdminEmain && config.isAdminEmain.length > 0) {
    const emails = config.isAdminEmain
    const arr = []
    // 将有管理员权限的账号id添加进数组
    for (let email of emails) {
      const user = await User.findOne({ username: email })
      arr.push(user._id)
    }

    setValue('admin', JSON.stringify(arr))
  }
}


