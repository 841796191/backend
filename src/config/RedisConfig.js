import redis from 'redis'
import { promisifyAll } from 'bluebird'
import config from './index'

const options = {
  host: '192.168.110.131',
  port: 15001,
  password: '123456',
  detect_buffers: true,
  retry_strategy: function (options) {
    if (options.error && options.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error and flush all commands with
        // a individual error
        return new Error('The server refused the connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
        // End reconnecting after a specific timeout and flush all commands
        // with a individual error
        return new Error('Retry time exhausted');
    }
    if (options.attempt > 10) {
        // End reconnecting with built in error
        return undefined;
    }
    // reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
}

// const client = redis.createClient(options)
// promisifyAll把redis的操作全转换为异步操作
const client = promisifyAll(redis.createClient(options))

client.on('error', (err) => {
  console.log('Redis Client Error:' + err)
})
// 设置键值
const setValue = (key, value, time) => {
  if (typeof value === 'undefined' || value == null ||value === '') {
    return
  }
  // 判断存储的是字符串还是哈希对象
  if (typeof value === 'string') {
    if (typeof time !== 'undefined'){
      // 如果有传时间参数则给键值设置过期时间
      client.set(key, value, 'EX', time)
    } else {
      client.set(key, value)
    }
  } else if (typeof value === 'object') {
    // { key1: value1, key2: value2}
    // Object.keys(value) => [key1, key2]
    Object.keys(value).forEach((item) => {
      client.hset(key, item, value[item], redis.print)
    })
  }
}

// const {promisify} = require('util');
// const getAsync = promisify(client.get).bind(client);
// 获取键值
const getValue = (key) => {
  return client.getAsync(key)
}
// 获取所有键值
const getHValue = (key) => {
  // v8 Promisify method use util, must node > 8
  // return promisify(client.hgetall).bind(client)(key)

  // bluebird async
  return client.hgetallAsync(key)
}
// 删除键值
const delValue = (key) => {
  client.del(key, (err, res) => {
    if (res === 1) {
      console.log('delete successfully');
    } else {
      console.log('delete redis key error:' + err)
    }
  })
}

export {
  client,
  setValue,
  getValue,
  getHValue,
  delValue
}