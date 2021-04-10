import Menu from '../model/Menus'
import Roles from '../model/Roles'
import User from '../model/User'
import Post from '../model/Post'
import Comments from '../model/Comments'
import SignRecord from '../model/SignRecord'
import qs from 'qs'
import moment from 'dayjs'
import { getMenuData, getRights, sortMenus } from '../common/Utils'
import { now } from 'moment'

const weekday = require('dayjs/plugin/weekday')
moment.extend(weekday)

class AdminController {
  // 获取菜单
  async getMenu (ctx) {
    const result = await Menu.find({})
    ctx.body = {
      code: 200,
      data: sortMenus(result)
    }
  }

  // 新增菜单
  async addMenu (ctx) {
    const { body } = ctx.request
    const menu = new Menu(body)
    const result = await menu.save()
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 更新菜单
  async updateMenu (ctx) {
    const { body } = ctx.request
    const data = { ...body }
    delete data._id
    const result = await Menu.updateOne({ _id: body._id }, { ...data })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 删除菜单
  async deleteMenu (ctx) {
    const { body } = ctx.request
    const result = await Menu.deleteOne({ _id: body._id })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 添加角色
  async addRole (ctx) {
    const { body } = ctx.request
    const role = new Roles(body)
    const result = await role.save()
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 获取角色
  async getRoles (ctx) {
    const result = await Roles.find({})
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 更新角色
  async updateRole (ctx) {
    const { body } = ctx.request
    const data = { ...body }
    delete data._id
    const result = await Roles.updateOne({ _id: body._id }, { ...data })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 删除角色
  async deleteRole (ctx) {
    const { body } = ctx.request
    const result = await Roles.deleteOne({ _id: body._id })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 获取角色名称
  async getRoleNames (ctx) {
    const result = await Roles.find({}, { menu: 0, desc: 0 })
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 获取所有评论
  async getCommentsAll (ctx) {
    const params = qs.parse(ctx.query)
    let options = { }
    if (params.options) {
      options = params.options
    }
    const page = params.page ? parseInt(params.page) : 0
    const limit = params.limit ? parseInt(params.limit) : 20
    // 使用MongoDB中的视图，效率提升1倍
    // const test = await CommentsUsers.find({ 'uid.name': { $regex: 'admin1', $options: 'i' } })
    const result = await Comments.getCommentsOptions(options, page, limit)
    let total = await Comments.getCommentsOptionsCount(options)
    if (typeof total === 'object') {
      if (total.length > 0) {
        total = total[0].count
      } else {
        total = 0
      }
    }
    ctx.body = {
      code: 200,
      data: result,
      total
    }
  }

  // 更新评论
  async updateCommentsBatch (ctx) {
    const { body } = ctx.request
    const result = await Comments.updateMany(
      { _id: { $in: body.ids } },
      { $set: { ...body.settings } }
    )
    ctx.body = {
      code: 200,
      data: result
    }
  }

  // 删除评论
  async deleteCommentsBatch (ctx) {
    const { body } = ctx.request
    const result = await Comments.deleteMany({ _id: { $in: body.ids } })
    ctx.body = {
      code: 200,
      msg: '删除成功',
      data: result
    }
  }

  // 获取动态菜单信息
  async getRoutes (ctx) {
    // ctx._id 是通过Auth中间件鉴权挂载到ctx上
    const user = await User.findOne({ _id: ctx._id }, { roles: 1 })
    // 拿到用户角色信息
    const { roles } = user

    // 通过角色获取角色可以访问的菜单数据
    let menus = []
    for(let i = 0; i < roles.length; i++) {
      const role = roles[i]
      // 拿到角色菜单
      const rights = await Roles.findOne({ role }, { menu: 1 })
      menus = menus.concat(rights.menu)
    }
    // 去重
    menus = Array.from(new Set(menus))

    // menus 可以访问的菜单数据
    const treeData = await Menu.find({})
    // 递归查询 type = 'menu' && _id 包含在menus中
    const routes = getMenuData(treeData, menus, ctx.isAdmin)
    ctx.body = {
      code: 200,
      data: menus
    }
  }

  // 获取接口操作权限
  async getOperations (ctx) {
    const user = await User.findOne({ _id: ctx._id }, { roles: 1 })

    const { roles } = user
    let menus = []

    for(let i = 0; i < roles.length; i++) {
      const role = roles[i]
      const rights = await Roles.findOne({ role }, { menu: 1 })
      menus = menus.concat(rights.menu)
    }
    menus = Array.from(new Set(menus))

    const treeData = await Menu.find({})
    const operations = getRights(treeData, menus)
    
    return operations
  }

  // 获取首页状态
  async getStats (ctx) {
    let result = {}
    // 当天0点
    const nowZreo = new Date().setHours(0,0,0,0)
    // 1.顶部的card.
    const inforCardData = []
    const time = moment().format('YYYY-MM-DD 00:00:00')
    // 本日新增用户数
    const userNewCount = await User.find({ created: { $gte: time}}).countDocuments()
    // 累计发帖
    const postsCount = await Post.find({}).countDocuments()
    // 本日评论
    const commentsNewCount = await Comments.find({ created: { $gte: time }}).countDocuments()
    
    const starttime = moment(nowZreo).weekday(1) // 当前这周的第一天
    const endtime = moment(nowZreo).weekday(8) // 当前这周的最后一天
    // 本周采纳
    const weekEndCount = await Comments.find({ created: { $gte: starttime, $lte: endtime }, isBest: '1'}).countDocuments()
    // 本周签到
    const signWeekCount = await SignRecord.find({ created: { $gte: starttime, $lte: endtime }}).countDocuments()
    // 本周发帖
    const postWeekCount = await Post.find({ created: { $gte: starttime, $lte: endtime }}).countDocuments()
    
    inforCardData.push(userNewCount)
    inforCardData.push(postsCount)
    inforCardData.push(commentsNewCount)
    inforCardData.push(weekEndCount)
    inforCardData.push(signWeekCount)
    inforCardData.push(postWeekCount)
    
    // 2.左侧的饼图数据
    // 聚合查询
    const postsCatalogCount = await Post.aggregate([
      // _id:$catalog -> 以$catalog的属性值分类    $sum: 1 -> 求和
      { $group: { _id: '$catalog', count: { $sum: 1 } } }
    ])
    const pieData = {}
    postsCatalogCount.forEach((item) => {
      pieData[item._id] = item.count
    })

    // 3.本周的右侧统计数据(6个月发帖)
    // 3.1 计算6个月前的时间
    // 3.2 查询数据库对应时间内的数据
    // 3.3 聚合查询
    const startMonth = moment(nowZreo).subtract(5, 'M').date(1).format
    const endMonth = moment(nowZreo).add(1, 'M').date(1).format()
    let monthData = await Post.aggregate([
      // $match  query查询
      { $match: { created: { $gte: new Date(startMonth), $lt: new Date(endMonth) } } },
      // $project 格式化操作  把created转化为 month 年月格式
      { $project: { month: { $dateToString: { format: '%Y-%m', date: '$created' } } } },
      { $group: { _id: '$month', count: { $sum: 1 } } },
      // 排序
      { $sort: { _id: 1 } }
    ])

    monthData = monthData.reduce((obj, item) => {
      return {
        ...obj,
        [item._id]: item.count
      }
    }, {})

    // 4.底部数据
    const startDay = moment().subtract(7, 'day').format()
    const _aggregate = async (model) => {
      let result = await model.aggregate([
        { $match: { created: { $gte: new Date(startDay) } } },
        { $project: { month: { $dateToString: { format: '%Y-%m-%d', date: '$created' } } } },
        { $group: { _id: '$month', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
      result = result.reduce((obj, item) => {
        return {
          ...obj,
          [item._id]: item.count
        }
      }, {})
      return result
    }
    const userWeekData = await _aggregate(User) // -> { 2019-10-01: 1}
    const signWeekData = await _aggregate(SignRecord)
    const postWeekData = await _aggregate(Post)
    const commentsWeekData = await _aggregate(Comments)
    // {user: [1,2,3,4,0,0,0]}
    const dataArr = []
    for (let i = 0; i <= 6; i++) {
      dataArr.push(moment().subtract(6 - i, 'day').format('YYYY-MM-DD'))
    }
    // 补0
    const addData = (obj) => {
      const arr = []
      dataArr.forEach((item) => {
        if (obj[item]) {
          arr.push(obj[item])
        } else {
          arr.push(0)
        }
      })
      return arr
    }
    const weekData = {
      user: addData(userWeekData),
      sign: addData(signWeekData),
      post: addData(postWeekData),
      comments: addData(commentsWeekData)
    }

    result = {
      inforCardData,
      pieData,
      monthData,
      weekData
    }
    ctx.body = {
      code: 200,
      data: result
    }
  }
}

export default new AdminController()