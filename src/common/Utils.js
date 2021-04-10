import { getValue } from '../config/RedisConfig'
import config from '../config/index'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

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

// 判断目录是否存在
const getStats = (path) => {
  return new Promise((resolve) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        // 不存在
        resolve(false)
      } else {
        // stats 为 stat函数返回的Stats对象
        resolve(stats)
      }
    })
    // fs.stat(path, (err, stats) => err ? resolve(false) : resolve(stats))
  })
}

// 创建目录
const mkdir = (dir) => {
  return new Promise((resolve) => {
    fs.mkdir(dir, err => err ? resolve(false) : resolve(true))
  })
}

// 循环遍历,递归判断如果上级目录不存在,则产生上级目录
const dirExists = async (dir) => {
  // 判断目录是否存在
  const isExists = await getStats(dir)

  // 如果该路径存在且不是文件,返回true, isDirectory检查目录是否存在
  if (isExists && isExists.isDirectory()) {
    return true
  } else if (isExists) {
    // 路径存在,但是是文件,返回false
    return false
  }

  // 如果该路径不存在 parse 解析路径并返回一个对象
  // parse('/a/b/c/d.txt') -> { root:'/', dir:'/a/b/c', ext:'.txt', base:'d.txt', name: 'd' }
  // parse(dir).dir 拿到路径的上一级目录路径再调用函数判断是否存在
  const tempDir = path.parse(dir).dir
  // 循环遍历,递归判断,如果当前目录不存在则判断上级目录,直到有一级目录存在则调用mkdir直接创建所传路径,然后一层层创建
  const status = await dirExists(tempDir)
  if (status) {
    const result = await mkdir(dir)
    console.log('dirExists -> mkdir:', result)
    return result
  } else {
    return false
  }
}

const rename = (obj, key, newKey) => {
  if (Object.keys(obj).indexOf(key) !== -1) {
    obj[newKey] = obj[key]
    delete obj[key]
  }
  return obj
}

// 排序
const sortObj = (arr, property) => {
  return arr.sort((m, n) => m[property] - n[property])
}

// 菜单排序
const sortMenus = (tree) => {
  tree = sortObj(tree, 'sort')
  if (tree.children && tree.children.length > 0) {
    tree.children = sortObj(tree.children, 'sort')
  }
  if (tree.operations && tree.operations.length > 0) {
    tree.operations = sortObj(tree.operations, 'sort')
  }

  return tree
}

// 获取菜单数据并改造结构
const getMenuData = (tree, rights, flag) => {
  const arr = []
  for(let i = 0; i < tree.length; i++){
    const item = tree[i]
    // _id 包含在menus中
      // 结构进行改造,删除operations
      // rights中_id为string,所以 +'' 进行转换
      if (rights.includes(item._id + '') || flag) {
        if (item.type === 'menu') {
          arr.push({
            _id: item._id,
            path: item.path,
            meta: {
              title: item.title,
              hideInBread: item.hideInBread,
              hideInMenu: item.hideInMenu,
              notCache: item.notCache,
              icon: item.icon
            },
            component: item.component,
            children: getMenuData(item.children, rights)
          })
        } else if (item.type === 'link') {
          arr.push({
            _id: item._id,
            path: item.path,
            meta: {
              title: item.title,
              icon: item.icon,
              href: item.link
            }
          })
        }
      }
  }

  return sortObj(arr, 'sort')
}

const flatten = (arr) => {
  while (arr.some((item) => Array.isArray(item))) {
    arr = [].concat(...arr)
  }
  return arr
}

const getRights = (tree, menus) => {
  let arr = []
  for (let item of tree) {
    if (item.operations && item.operations.length > 0) {
      for (let op of item.operations) {
        if (menus.includes(op._id + '')) {
          arr.push(op.path)
        }
      }
    } else if (item.children && item.children.length > 0) {
      arr.push(getRights(item.children, menus))
    }
  }
  // console.log('getRight: ',arr)
  return flatten(arr)
}


export {
  checkCode,
  getJWtPayload,
  dirExists,
  rename,
  getMenuData,
  sortMenus,
  flatten,
  getRights
}