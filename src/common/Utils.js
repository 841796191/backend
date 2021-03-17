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

export {
  checkCode,
  getJWtPayload,
  dirExists,
  rename
}