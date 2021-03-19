import mongoose from '../config/DBHelpler'
import moment from 'dayjs'

const Schema = mongoose.Schema

const UserSchema = new Schema({
  username: { type: String, index: { unique: true }, sparse: true },
  password: { type: String },
  name: { type: String },
  created: { type: Date },
  updated: { type: Date },
  favs: { type: Number, default: 100 },
  gender: { type: String, default: '' },
  roles: { type: Array, default: ['user'] },
  pic: { type: String, default: '/img/header.jpg' },
  mobile: { type: String, match: /^1[3-9](\d{9})$/, default: '' },
  status: { type: String, default: '0' },
  regmark: { type: String, default: '' },
  location: { type: String, default: '' },
  isVip: { type: String, default: '0' },
  count: { type: Number, default: 0 }
})
// 保存前给created赋值时间
UserSchema.pre('save', function (next) {
  this.created = new Date()
  next()
})
// 更新前给updated赋值时间
UserSchema.pre('update', function (next) {
  this.updated = new Date()
  next()
})
// 报错
UserSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('Error: Monngoose has a duplicate key.'))
  } else {
    next(error)
  }
})

UserSchema.statics = {
  // 根据id查用户信息时拦截数据库返回的密码、用户名、手机号码
  findByID: function (id) {
    return this.findOne({ _id: id}, {
      password: 0,
      username: 0,
      mobile: 0
    })
  },
  // 获取用户列表
  getList: function (options, sort, page, limit) {
    // // 1. datepicker(时间) -> item: string, search -> array  startitme,endtime
    // // 2. radio(键值对) -> key-value $in
    // // 3. select(数组) -> key-array $in
    let query = {}
    // 判断是否有传搜索值,没有则直接返回全部数据
    if (typeof options.search !== 'undefined') {
      // 判断传递的搜索值是否为字符串类型
      if (typeof options.search === 'string' && options.search.trim() !== '') {
        if (['name', 'username'].includes(options.item)) {
          // 模糊匹配
          query[options.item] = { $regex: new RegExp(options.search) }
          // => { name: { $regex: /admin/ } } => mysql like %admin%
        } else {
          // radio 禁言、vip
          query[options.item] = options.search
        }
      }
      if (options.item === 'roles') {
        query = { roles: { $in: options.search } }
      }
      if (options.item === 'created') {
        const start = options.search[0]
        const end = options.search[1]
        query = { created: { $gte: new Date(start), $lt: new Date(end) } }
      }
    }
    // 查找返回的信息屏蔽掉密码手机等信息
    return this.find(query, { password:0, mobile: 0})
      .sort({ [sort]: -1 })
      .skip(page * limit)
      .limit(limit)
  },
  countList: function (options) {
    // let query = {}
    // if (typeof options.search !== 'undefined') {
    //   if (typeof options.search === 'string' && options.search.trim() !== '') {
    //     if (['name', 'username'].includes(options.item)) {
    //       // 模糊匹配
    //       query[options.item] = { $regex: new RegExp(options.search) }
    //       // =》 { name: { $regex: /admin/ } } => mysql like %admin%
    //     } else {
    //       // radio
    //       query[options.item] = options.search
    //     }
    //   }
    //   if (options.item === 'roles') {
    //     query = { roles: { $in: options.search } }
    //   }
    //   if (options.item === 'created') {
    //     const start = options.search[0]
    //     const end = options.search[1]
    //     query = { created: { $gte: new Date(start), $lt: new Date(end) } }
    //   }
    // }
    // return this.find(query).countDocuments()
    return this.find(options).countDocuments()
  },
  getTotalSign: function (page, limit) {
    return this.find({})
      .skip(page * limit)
      .limit(limit)
      .sort({ count: -1 })
  },
  getTotalSignCount: function (page, limit) {
    return this.find({}).countDocuments()
  }
}

const UserModel = mongoose.model('users', UserSchema)

export default UserModel