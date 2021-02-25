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
  }
}

const UserModel = mongoose.model('users', UserSchema)

export default UserModel