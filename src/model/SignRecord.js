import mongoose from '../config/DBHelpler'
import moment from 'dayjs'

const Schema = mongoose.Schema

const SignRecordSchema = new Schema({
  uid: { type: String, ref: 'users' },
  created: { type: Date },
  favs: { type: Number } // 积分
})

SignRecordSchema.pre('save', function (next) {
  this.created = moment().format('YYYY-MM-DD HH:mm:ss')
  next()
})

// 给模型设置静态方法
SignRecordSchema.statics = {
  findByUid: function (uid) {
    // 根据uid查找最新的签到记录
    return this.findOne({uid: uid}).sort({created: -1})
  }
}

const SignRecord = mongoose.model('sign_record', SignRecordSchema)

export default SignRecord
