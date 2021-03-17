import path from 'path'

const DB_URL = 'mongodb://192.168.110.131:10050/testdb'
const DB_URL2 = 'mongodb://127.0.0.1:27017/testdb'
const JWT_SECRET = 'agdvabgmhgnfrvedfcaerqf'
const baseUrl = 'http://localhost:8081'
const uploadPath = path.join(path.resolve(__dirname), '../../public')

export default {
  DB_URL,
  DB_URL2,
  JWT_SECRET,
  baseUrl,
  uploadPath
}